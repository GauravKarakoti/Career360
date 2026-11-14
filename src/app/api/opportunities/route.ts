import { z } from 'zod';
import { db } from '@/lib/db';
import { handle, jsonBody, workspace } from '@/lib/session';
import { opportunityInput } from '@/lib/validation';
import { match } from '@/lib/matching';
export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const [profile, listings] = await Promise.all([
      db().profile.findUnique({ where: { workspaceId: session.id }, include: { capabilities: true, needs: true } }),
      db().opportunity.findMany({ where: { OR: [{ isDemo: true, ownerId: null }, { ownerId: session.id }] }, orderBy: { publishedAt: 'desc' }, take: 200 })
    ]);
    return { opportunities: listings.map(item => ({ ...item, ownerId: undefined, match: match(profile, item), trust: item.deadline && item.deadline < new Date() ? 'Expired' : item.sourceUrl && item.evidence ? 'Sourced' : item.isDemo ? 'Demo · fictional' : 'Unverified' })).sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0)) };
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
