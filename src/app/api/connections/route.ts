import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { recordEvent } from '@/lib/events';

export const runtime = 'nodejs';

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (typeof val === 'string' && val.trim() === '') || val === null ? undefined : val, schema);

const createInput = z
  .object({
    toWorkspaceId: emptyToUndefined(z.string().trim().min(1).max(40).optional()),
    toEmail: emptyToUndefined(z.string().trim().email('Enter a valid email address.').max(160).optional()),
    opportunityId: emptyToUndefined(z.string().trim().min(1).max(40).optional()),
    message: z.preprocess((val) => (val === null || val === undefined ? '' : val), z.string().trim().max(1000))
  })
  .refine((data) => Boolean(data.toWorkspaceId || data.toEmail), {
    message: 'Provide an email address or workspace to connect with.',
    path: ['toEmail']
  });

const respondInput = z.object({
  id: z.string().trim().min(1).max(40),
  status: z.enum(['accepted', 'declined'])
});

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const [sent, received] = await Promise.all([
      db().connectionRequest.findMany({
        where: { fromWorkspaceId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          toWorkspace: {
            select: { id: true, profile: { select: { name: true, roles: true, visibility: true } } }
          }
        }
      }),
      db().connectionRequest.findMany({
        where: { toWorkspaceId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          fromWorkspace: {
            select: { id: true, profile: { select: { name: true, roles: true, visibility: true } } }
          }
        }
      })
    ]);

    const mask = (profile: { name: string; roles: string[]; visibility: string } | null) =>
      profile?.visibility === 'discoverable'
        ? { name: profile.name, roles: profile.roles }
        : { name: 'Private profile', roles: [] };

    return {
      sent: sent.map((item) => ({
        id: item.id,
        status: item.status,
        message: item.message,
        createdAt: item.createdAt,
        to: mask(item.toWorkspace.profile)
      })),
      received: received.map((item) => ({
        id: item.id,
        status: item.status,
        message: item.message,
        createdAt: item.createdAt,
        from: mask(item.fromWorkspace.profile)
      }))
    };
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const input = createInput.parse(await jsonBody(request));

    const selfProfile = await db().profile.findUnique({
      where: { workspaceId: session.id },
      select: { id: true }
    });
    if (!selfProfile) {
      throw new ApiError('Save your profile in Career DNA before sending connection requests.', 404);
    }

    let target: { id: string; profile: { visibility: string } | null } | null = null;

    if (input.toWorkspaceId) {
      target = await db().workspace.findUnique({
        where: { id: input.toWorkspaceId },
        select: { id: true, profile: { select: { visibility: true } } }
      });
    } else if (input.toEmail) {
      const account = await db().account.findUnique({
        where: { email: input.toEmail.toLowerCase() },
        select: {
          workspaces: {
            select: { id: true, profile: { select: { visibility: true } } }
          }
        }
      });
      if (account?.workspaces.length) {
        target =
          account.workspaces.find((w) => w.profile?.visibility === 'discoverable') ??
          account.workspaces.find((w) => w.profile !== null) ??
          account.workspaces[0];
      }
    }

    if (!target || !target.profile) {
      throw new ApiError('This connection is not possible. Both sides need a saved profile.', 404);
    }
    if (target.id === session.id) {
      throw new ApiError('You cannot connect with your own workspace.', 400);
    }
    if (target.profile.visibility !== 'discoverable') {
      throw new ApiError('This workspace is private and cannot receive connection requests.', 403);
    }

    const duplicate = await db().connectionRequest.findFirst({
      where: {
        fromWorkspaceId: session.id,
        toWorkspaceId: target.id,
        status: 'pending'
      }
    });
    if (duplicate) {
      throw new ApiError('A request to this workspace is already pending.', 409);
    }

    const created = await db().connectionRequest.create({
      data: {
        fromWorkspaceId: session.id,
        toWorkspaceId: target.id,
        opportunityId: input.opportunityId,
        message: input.message
      }
    });

    await recordEvent(session.id, 'connection.requested', '', input.opportunityId ?? null).catch(() => {});
    return { id: created.id, status: created.status };
  });
}

export async function PATCH(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const input = respondInput.parse(await jsonBody(request));
    const existing = await db().connectionRequest.findUnique({ where: { id: input.id } });
    if (!existing || existing.toWorkspaceId !== session.id) {
      throw new ApiError('Request not found.', 404);
    }
    if (existing.status !== 'pending') {
      throw new ApiError('This request was already answered.', 409);
    }
    const updated = await db().connectionRequest.update({
      where: { id: input.id },
      data: { status: input.status, respondedAt: new Date() }
    });
    await recordEvent(session.id, `connection.${input.status}`, '', existing.opportunityId).catch(() => {});
    return { id: updated.id, status: updated.status };
  });
}