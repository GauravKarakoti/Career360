import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { recordEvent } from '@/lib/events';
import { match } from '@/lib/matching';
import { ApiError, handle, jsonBody, signedInAccount, workspace } from '@/lib/session';
import { opportunityInput } from '@/lib/validation';
import { syncOpportunitiesForDna } from '@/lib/web-discovery';
import { localizeListings, parseLang } from '@/lib/translate';

const ROLE_ALLOWED_CATEGORIES: Record<string, readonly string[]> = {
  Candidate: ['Collaborations', 'Learning'],
  Recruiter: ['Jobs & internships', 'Learning'],
  Startup: ['Jobs & internships', 'Partnerships', 'Collaborations', 'Events'],
  Creator: ['Collaborations', 'Partnerships', 'Events', 'Learning'],
  Business: ['Partnerships', 'Jobs & internships', 'Collaborations', 'Funding'],
  'Event organiser': ['Events', 'Partnerships', 'Collaborations'],
  'Sponsor / Brand': ['Funding', 'Partnerships', 'Collaborations', 'Events'],
};

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
    const lang = parseLang(url.searchParams.get('lang'));

    const profile = await db().profile.findUnique({
      where: { workspaceId: session.id },
      include: { capabilities: true, needs: true },
    });

    // If the user has built their Opportunity DNA, ensure web opportunities are synced & cached
    if (profile) {
      await syncOpportunitiesForDna({
        role: profile.role,
        industry: profile.industry,
        location: profile.location,
        capabilities: profile.capabilities.map((c) => c.label),
        needs: profile.needs.map((n) => n.label),
        description: profile.description,
        stage: profile.stage ?? undefined,
        interests: profile.interests ?? undefined,
        constraints: profile.constraints ?? undefined,
        goals: profile.goals ?? undefined,
      }).catch(() => null);
    }

    // Ranked full-text search when q is present (includes shared web cache where ownerId IS NULL
    // plus the current workspace's own submissions).
    const rows = q
      ? await db().$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT "id" FROM "Opportunity"
          WHERE ("ownerId" IS NULL OR "ownerId" = ${session.id})
            AND ("searchVector" @@ websearch_to_tsquery('english', ${q})
              OR EXISTS (SELECT 1 FROM unnest("requirements") r WHERE r ILIKE ${'%' + q + '%'})
              OR EXISTS (SELECT 1 FROM unnest("offers") o WHERE o ILIKE ${'%' + q + '%'})
              OR "location" ILIKE ${'%' + q + '%'})
          ORDER BY ts_rank("searchVector", websearch_to_tsquery('english', ${q})) DESC, "publishedAt" DESC
          LIMIT 200`)
      : await db().opportunity.findMany({
          where: {
            OR: [{ ownerId: null }, { ownerId: session.id }],
          },
          orderBy: { publishedAt: 'desc' },
          take: 200,
          select: { id: true },
        });

    const ids = rows.map((row) => row.id);
    const listings = ids.length
      ? await db().opportunity.findMany({ where: { id: { in: ids } } })
      : [];

    const rank = new Map(ids.map((id, index) => [id, index]));
    listings.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

    if (q) {
      await recordEvent(
        session.id,
        'opportunity.viewed',
        `search:${q}`,
        listings[0]?.id ?? null
      ).catch(() => {});
    }

    const now = new Date();
    const scored = listings.map((item) => ({
      ...item,
      ownerId: undefined,
      match: match(profile, item),
      trust:
        item.deadline && item.deadline < now
          ? 'Expired'
          : item.sourceUrl && item.evidence
            ? 'Sourced'
            : item.isDemo
              ? 'Demo · fictional'
              : 'Unverified',
    }));

    if (!q) {
      scored.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    }

    // Matching/ranking runs on the canonical text above; translation is display-only.
    const opportunities = await localizeListings(scored, lang);

    return { opportunities, query: q || null, lang };
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const data = opportunityInput.parse(await jsonBody(request));

    const [account, profile] = await Promise.all([
      signedInAccount().catch(() => null),
      db().profile.findUnique({ where: { workspaceId: session.id }, select: { role: true } }),
    ]);

    const activeRole = account?.primaryRole || profile?.role;
    if (activeRole && ROLE_ALLOWED_CATEGORIES[activeRole]) {
      const allowed = ROLE_ALLOWED_CATEGORIES[activeRole];
      if (!allowed.includes(data.category)) {
        throw new ApiError(
          `As a ${activeRole}, you can only publish listings in: ${allowed.join(', ')}.`,
          403
        );
      }
    }

    const { deadline, evidence, ...fields } = data;
    const listing = await db().opportunity.create({
      data: {
        ...fields,
        evidence: evidence ?? undefined,
        deadline: deadline ? new Date(deadline) : null,
        ownerId: session.id,
      },
    });
    return { id: listing.id };
  });
}