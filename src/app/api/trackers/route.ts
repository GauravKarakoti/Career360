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
const deleteInput = z.object({
  id: z.string().min(1).max(40).optional(),
  opportunityId: z.string().min(1).max(100).optional()
}).refine((value) => value.id || value.opportunityId, 'Provide a tracker id or an opportunityId.');
const trackerInclude = {
  opportunity: {
    select: { id: true, title: true, organization: true, category: true, location: true, description: true, sourceUrl: true, deadline: true, isDemo: true }
  }
} as const;
const updateInput = z.object({
  id: z.string().min(1).max(40),
  stage: z.enum(stages).optional(),
  notes: z.string().trim().max(2000).optional()
});

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const trackers = await db().tracker.findMany({
      where: { workspaceId: session.id },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: trackerInclude
    });
    return { trackers, stages };
  });
}
// Idempotent: tracking an opportunity that is already tracked returns the existing row
// (created: false) instead of creating a duplicate. The (workspaceId, opportunityId)
// unique index backs this up when two requests race.
export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const input = createInput.parse(await jsonBody(request));
    if (input.opportunityId) {
      const visible = await db().opportunity.findFirst({
        where: { id: input.opportunityId, OR: [{ ownerId: null }, { ownerId: session.id }] },
        select: { id: true }
      });
      if (!visible) throw new ApiError('Opportunity not found.', 404);
      const existing = await db().tracker.findUnique({
        where: { workspaceId_opportunityId: { workspaceId: session.id, opportunityId: input.opportunityId } },
        include: trackerInclude
      });
      if (existing) return { tracker: existing, created: false };
    }
    try {
      const tracker = await db().tracker.create({ data: { ...input, workspaceId: session.id }, include: trackerInclude });
      await recordEvent(session.id, 'tracker.created', input.kind, input.opportunityId).catch(() => {});
      return { id: tracker.id, stage: tracker.stage, tracker, created: true };
    } catch (caught) {
      if ((caught as { code?: string } | null)?.code === 'P2002' && input.opportunityId) {
        const tracker = await db().tracker.findUnique({
          where: { workspaceId_opportunityId: { workspaceId: session.id, opportunityId: input.opportunityId } },
          include: trackerInclude
        });
        if (tracker) return { id: tracker.id, stage: tracker.stage, tracker, created: false };
      }
      throw caught;
    }
  });
}
// Untrack: removes only the caller's tracker row. The opportunity itself is never touched.
export async function DELETE(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const input = deleteInput.parse(await jsonBody(request));
    const where = input.id
      ? { id: input.id, workspaceId: session.id }
      : { opportunityId: input.opportunityId, workspaceId: session.id };
    const { count } = await db().tracker.deleteMany({ where });
    return { removed: count };
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
