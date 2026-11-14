import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { recordEvent } from '@/lib/events';
export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const { opportunityId, saved } = z.object({ opportunityId: z.string().min(1).max(100), saved: z.boolean() }).parse(await jsonBody(request));
    const listing = await db().opportunity.findFirst({ where: { id: opportunityId, OR: [{ isDemo: true, ownerId: null }, { ownerId: session.id }] } });
    if (!listing) throw new ApiError('Opportunity not found.', 404);
    const key = { workspaceId: session.id, opportunityId };
    if (saved) {
      const existing = await db().savedOpportunity.findUnique({ where: { workspaceId_opportunityId: key } });
      if (!existing) {
        await db().savedOpportunity.create({ data: key });
        await recordEvent(session.id, 'opportunity.saved', '', opportunityId).catch(() => {});
      }
    } else await db().savedOpportunity.deleteMany({ where: key });
    return { saved };
  });
}
