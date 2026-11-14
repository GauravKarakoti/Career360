import { db } from './db';
import { ApiError } from './session';

export const ORG_ROLES = ['owner', 'admin', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

const rank: Record<OrgRole, number> = { owner: 3, admin: 2, member: 1 };

export async function membershipOf(accountId: string, orgId: string) {
  const membership = await db().orgMembership.findUnique({
    where: { orgId_accountId: { orgId, accountId } },
  });
  return membership;
}

export async function requireMembership(accountId: string, orgId: string, minimum: OrgRole = 'member') {
  const membership = await membershipOf(accountId, orgId);
  if (!membership) throw new ApiError('You are not a member of this organization.', 403);
  if (rank[membership.role as OrgRole] < rank[minimum]) {
    throw new ApiError(`This action needs ${minimum} access.`, 403);
  }
  return membership;
}

export async function audit(orgId: string | null, accountId: string | null, action: string, detail = '') {
  await db().auditLog.create({ data: { orgId, accountId, action, detail: detail.slice(0, 500) } });
}

export function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return base || 'org';
}
