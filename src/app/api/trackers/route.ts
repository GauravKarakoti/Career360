import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { recordEvent } from '@/lib/events';
export const runtime = 'nodejs';

const stages = ['identified', 'applied', 'in conversation', 'committed', 'closed'] as const;
const kinds = ['application', 'lead', 'partnership'] as const;

const createInput = z.object({
  opportunityId: z.string().max(40).nullable(),
  kind: z.enum(kinds),
  title: z.string().trim().min(1).max(160),
  counterpart: z.string().trim().max(160).default(''),
  notes: z.string().trim().max(2000).default('')
});
const updateInput = z.object({
  id: z.string().min(1).max(40),
  stage: z.enum(stages).optional(),
  notes: z.string().trim().max(2000).optional()
});

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const trackers = await db().tracker.findMany({ where: { workspaceId: session.id }, orderBy: { updatedAt: 'desc' }, take: 100 });
    return { trackers, stages };
  });
}
export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const input = createInput.parse(await jsonBody(request));
    if (input.opportunityId) {
      const exists = await db().opportunity.findUnique({ where: { id: input.opportunityId }, select: { id: true } });
      if (!exists) throw new ApiError('Opportunity not found.', 404);
    }
    const tracker = await db().tracker.create({ data: { ...input, workspaceId: session.id } });
    await recordEvent(session.id, 'tracker.created', input.kind, input.opportunityId);
    return { id: tracker.id, stage: tracker.stage };
  });
}
export async function PATCH(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const input = updateInput.parse(await jsonBody(request));
    const existing = await db().tracker.findUnique({ where: { id: input.id } });
    if (!existing || existing.workspaceId !== session.id) throw new ApiError('Tracker not found.', 404);
    const updated = await db().tracker.update({ where: { id: input.id }, data: { stage: input.stage, notes: input.notes } });
    if (input.stage && input.stage !== existing.stage) {
      await recordEvent(session.id, 'tracker.advanced', `${existing.stage}->${input.stage}`, existing.opportunityId);
    }
    return { id: updated.id, stage: updated.stage };
  });
}
