import { z } from 'zod';
import { db } from '@/lib/db';
import { handle, jsonBody, workspace } from '@/lib/session';
import { opportunityInput } from '@/lib/validation';
import { match } from '@/lib/matching';
import { Prisma } from '@prisma/client';
import { recordEvent } from '@/lib/events';
export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
    // Ranked full-text search when q is present (uses the GIN-indexed searchVector
    // plus array/location matches), otherwise the normal feed.
    const rows = q
      ? await db().$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT "id" FROM "Opportunity"
          WHERE (("isDemo" AND "ownerId" IS NULL) OR "ownerId" = ${session.id})
            AND ("searchVector" @@ websearch_to_tsquery('english', ${q})
              OR EXISTS (SELECT 1 FROM unnest("requirements") r WHERE r ILIKE ${'%' + q + '%'})
              OR EXISTS (SELECT 1 FROM unnest("offers") o WHERE o ILIKE ${'%' + q + '%'})
              OR "location" ILIKE ${'%' + q + '%'})
          ORDER BY ts_rank("searchVector", websearch_to_tsquery('english', ${q})) DESC, "publishedAt" DESC
          LIMIT 200`)
      : await db().opportunity.findMany({ where: { OR: [{ isDemo: true, ownerId: null }, { ownerId: session.id }] }, orderBy: { publishedAt: 'desc' }, take: 200, select: { id: true } });
    const ids = rows.map(row => row.id);
    const [profile, listings] = await Promise.all([
      db().profile.findUnique({ where: { workspaceId: session.id }, include: { capabilities: true, needs: true } }),
      ids.length ? db().opportunity.findMany({ where: { id: { in: ids } } }) : Promise.resolve([])
    ]);
    const rank = new Map(ids.map((id, index) => [id, index]));
    listings.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    if (q) {
      await recordEvent(session.id, 'opportunity.viewed', `search:${q}`, listings[0]?.id ?? null).catch(() => {});
    }
    const scored = listings.map(item => ({ ...item, ownerId: undefined, match: match(profile, item), trust: item.deadline && item.deadline < new Date() ? 'Expired' : item.sourceUrl && item.evidence ? 'Sourced' : item.isDemo ? 'Demo · fictional' : 'Unverified' }));
    if (!q) scored.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    return { opportunities: scored, query: q || null };
  });
}
export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const data = opportunityInput.parse(await jsonBody(request));
    const { deadline, evidence, ...fields } = data;
    const listing = await db().opportunity.create({ data: { ...fields, evidence: evidence ?? undefined, deadline: deadline ? new Date(deadline) : null, ownerId: session.id } });
    return { id: listing.id };
  });
}
