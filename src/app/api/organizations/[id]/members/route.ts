import { z } from 'zod';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { rateLimit } from '@/lib/session';
import { audit, requireMembership } from '@/lib/org';
import { db } from '@/lib/db';

const addSchema = z.object({ email: z.string().email(), role: z.enum(['admin', 'member']).optional().default('member') });
const patchSchema = z.object({ membershipId: z.string(), role: z.enum(['owner', 'admin', 'member']) });
const deleteSchema = z.object({ membershipId: z.string() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    rateLimit(request, 'org-members', 20);
    const { id } = await params;
    const session = await workspace();
    await requireMembership(session.accountId!, id, 'admin');
    const data = addSchema.parse(await jsonBody(request));

    const account = await db().account.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!account) throw new ApiError('No Career360 account with that email. They need to sign up first.', 404);
    const existing = await db().orgMembership.findUnique({ where: { orgId_accountId: { orgId: id, accountId: account.id } } });
    if (existing) throw new ApiError('That person is already a member.', 409);

    const membership = await db().orgMembership.create({
      data: { orgId: id, accountId: account.id, role: data.role },
      include: { account: { select: { email: true } } },
    });
    await audit(id, session.accountId!, 'member.added', `${account.email} as ${data.role}`);
    return { membership };
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    const { id } = await params;
    const session = await workspace();
    await requireMembership(session.accountId!, id, 'owner');
    const data = patchSchema.parse(await jsonBody(request));

    const target = await db().orgMembership.findFirst({ where: { id: data.membershipId, orgId: id } });
    if (!target) throw new ApiError('Membership not found.', 404);
    if (target.accountId === session.accountId) throw new ApiError('You cannot change your own role.', 400);

    const membership = await db().orgMembership.update({
      where: { id: data.membershipId }, data: { role: data.role },
      include: { account: { select: { email: true } } },
    });
    await audit(id, session.accountId!, 'member.role_changed', `${membership.account.email} → ${data.role}`);
    return { membership };
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    const { id } = await params;
    const session = await workspace();
    await requireMembership(session.accountId!, id, 'admin');
    const { membershipId } = deleteSchema.parse(await jsonBody(request));

    const target = await db().orgMembership.findFirst({ where: { id: membershipId, orgId: id } });
    if (!target) throw new ApiError('Membership not found.', 404);
    if (target.role === 'owner') throw new ApiError('The owner cannot be removed.', 403);
    if (target.accountId === session.accountId) {
      const owners = await db().orgMembership.count({ where: { orgId: id, role: 'owner' } });
      if (target.role === 'owner' && owners === 1) throw new ApiError('Transfer ownership before leaving.', 400);
    }

    await db().orgMembership.delete({ where: { id: membershipId } });
    await audit(id, session.accountId!, 'member.removed', target.id);
    return { ok: true };
  });
}
