import { z } from 'zod';
import { ApiError, handle, jsonBody, rateLimit, workspace } from '@/lib/session';
import { audit, requireMembership } from '@/lib/org';
import { db } from '@/lib/db';

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).optional().default('member'),
});

const patchSchema = z.union([
  z.object({
    action: z.enum(['accept', 'decline', 'leave']),
  }),
  z.object({
    membershipId: z.string().min(1),
    role: z.enum(['owner', 'admin', 'member']),
  }),
]);

const deleteSchema = z.object({
  membershipId: z.string().min(1).optional(),
});

/**
 * Verifies that an accepted connection exists between any workspace/account
 * belonging to the inviter and any workspace/account belonging to the target user.
 */
async function areAccountsConnected(
  inviterAccountId: string,
  inviterWorkspaceId: string,
  targetAccountId: string
): Promise<boolean> {
  const [inviterWorkspaces, targetWorkspaces] = await Promise.all([
    db().workspace.findMany({
      where: { accountId: inviterAccountId },
      select: { id: true },
    }),
    db().workspace.findMany({
      where: { accountId: targetAccountId },
      select: { id: true },
    }),
  ]);

  const inviterIds = new Set<string>([
    inviterAccountId,
    inviterWorkspaceId,
    ...inviterWorkspaces.map((w) => w.id),
  ]);
  const targetIds = new Set<string>([
    targetAccountId,
    ...targetWorkspaces.map((w) => w.id),
  ]);

  const client = db() as unknown as Record<
    string,
    {
      findMany?: (args: {
        where: { status: string };
      }) => Promise<Array<Record<string, unknown>>>;
    }
  >;

  const delegate = client.connectionRequest ?? client.connection;
  if (!delegate?.findMany) return false;

  const acceptedRows = await delegate.findMany({
    where: { status: 'accepted' },
  });

  return acceptedRows.some((row) => {
    const values = Object.entries(row)
      .filter(([key, val]) => key !== 'id' && typeof val === 'string')
      .map(([, val]) => val as string);
    const matchesInviter = values.some((val) => inviterIds.has(val));
    const matchesTarget = values.some((val) => targetIds.has(val));
    return matchesInviter && matchesTarget;
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    rateLimit(request, 'org-members', 20);
    const { id } = await params;
    const session = await workspace();
    if (!session.accountId) {
      throw new ApiError('Sign in to invite organization members.', 401);
    }

    await requireMembership(session.accountId, id, 'admin');
    const data = addSchema.parse(await jsonBody(request));

    const account = await db().account.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!account) {
      throw new ApiError(
        'No Career360 account with that email. They need to sign up first.',
        404
      );
    }
    if (account.id === session.accountId) {
      throw new ApiError('You are already a member of this organization.', 400);
    }

    const existing = await db().orgMembership.findUnique({
      where: { orgId_accountId: { orgId: id, accountId: account.id } },
    });
    if (existing) {
      if (existing.role.startsWith('invited')) {
        throw new ApiError('An invitation is already pending for that person.', 409);
      }
      throw new ApiError('That person is already a member.', 409);
    }

    const connected = await areAccountsConnected(
      session.accountId,
      session.id,
      account.id
    );
    if (!connected) {
      throw new ApiError(
        'You can only invite people you are connected with. Send them a connection request in Connections first.',
        403
      );
    }

    const invitedRole = `invited:${data.role}`;
    const membership = await db().orgMembership.create({
      data: { orgId: id, accountId: account.id, role: invitedRole },
      include: { account: { select: { email: true } } },
    });

    await audit(
      id,
      session.accountId,
      'member.invited',
      `${account.email} invited as ${data.role}`
    );
    return { membership };
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const { id } = await params;
    const session = await workspace();
    if (!session.accountId) {
      throw new ApiError('Sign in to manage organization memberships.', 401);
    }

    const data = patchSchema.parse(await jsonBody(request));

    // Case 1: Self-service actions (accept invite, decline invite, or leave organization)
    if ('action' in data) {
      const myMembership = await db().orgMembership.findUnique({
        where: { orgId_accountId: { orgId: id, accountId: session.accountId } },
        include: { account: { select: { email: true } } },
      });

      if (data.action === 'leave') {
        if (!myMembership || myMembership.role.startsWith('invited')) {
          throw new ApiError('You are not an active member of this organization.', 404);
        }

        if (myMembership.role === 'owner') {
          const ownersCount = await db().orgMembership.count({
            where: { orgId: id, role: 'owner' },
          });
          if (ownersCount <= 1) {
            throw new ApiError(
              'You are the only owner. Promote another member to owner before leaving.',
              400
            );
          }
        }

        await db().orgMembership.delete({ where: { id: myMembership.id } });
        await audit(
          id,
          session.accountId,
          'member.left',
          `${myMembership.account.email} left the organization`
        );
        return { ok: true, left: true };
      }

      if (!myMembership || !myMembership.role.startsWith('invited')) {
        throw new ApiError('No pending invitation found for this organization.', 404);
      }

      if (data.action === 'decline') {
        await db().orgMembership.delete({ where: { id: myMembership.id } });
        await audit(
          id,
          session.accountId,
          'member.invite_declined',
          myMembership.account.email
        );
        return { ok: true, declined: true };
      }

      const assignedRole =
        myMembership.role.split(':')[1] === 'admin' ? 'admin' : 'member';
      const membership = await db().orgMembership.update({
        where: { id: myMembership.id },
        data: { role: assignedRole },
        include: { account: { select: { email: true } } },
      });

      await audit(
        id,
        session.accountId,
        'member.joined',
        `${membership.account.email} accepted invite as ${assignedRole}`
      );
      return { membership };
    }

    // Case 2: Organization owner changing an active member's role
    await requireMembership(session.accountId, id, 'owner');

    const target = await db().orgMembership.findFirst({
      where: { id: data.membershipId, orgId: id },
    });
    if (!target) throw new ApiError('Membership not found.', 404);
    if (target.accountId === session.accountId) {
      throw new ApiError('You cannot change your own role.', 400);
    }
    if (target.role.startsWith('invited')) {
      throw new ApiError(
        'Cannot change role until this person accepts their invitation.',
        400
      );
    }

    const membership = await db().orgMembership.update({
      where: { id: data.membershipId },
      data: { role: data.role },
      include: { account: { select: { email: true } } },
    });

    await audit(
      id,
      session.accountId,
      'member.role_changed',
      `${membership.account.email} → ${data.role}`
    );
    return { membership };
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(request, async () => {
    const { id } = await params;
    const session = await workspace();
    if (!session.accountId) {
      throw new ApiError('Sign in to manage organization members.', 401);
    }

    const { membershipId } = deleteSchema.parse(await jsonBody(request));

    const target = membershipId
      ? await db().orgMembership.findFirst({
          where: { id: membershipId, orgId: id },
          include: { account: { select: { email: true } } },
        })
      : await db().orgMembership.findUnique({
          where: { orgId_accountId: { orgId: id, accountId: session.accountId } },
          include: { account: { select: { email: true } } },
        });

    if (!target) throw new ApiError('Membership not found.', 404);

    const isSelf = target.accountId === session.accountId;

    if (isSelf) {
      if (target.role === 'owner') {
        const owners = await db().orgMembership.count({
          where: { orgId: id, role: 'owner' },
        });
        if (owners <= 1) {
          throw new ApiError(
            'You are the only owner. Promote another member to owner before leaving.',
            400
          );
        }
      }
      await db().orgMembership.delete({ where: { id: target.id } });
      await audit(id, session.accountId, 'member.left', target.account.email);
      return { ok: true, left: true };
    }

    // Removing another member requires admin or owner privileges
    await requireMembership(session.accountId, id, 'admin');
    if (target.role === 'owner') {
      throw new ApiError('The owner cannot be removed.', 403);
    }

    const wasInvite = target.role.startsWith('invited');
    await db().orgMembership.delete({ where: { id: target.id } });
    await audit(
      id,
      session.accountId,
      wasInvite ? 'member.invite_revoked' : 'member.removed',
      target.account.email
    );
    return { ok: true };
  });
}