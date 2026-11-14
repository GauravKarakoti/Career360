import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db';
import { ApiError } from './session';

const scryptAsync = promisify(scrypt);
const recoveryCodeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export async function hashSecret(secret: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await (scryptAsync(secret, salt, 64) as Promise<Buffer>)).toString('hex');
  return `${salt}:${hash}`;
}
export async function verifySecret(secret: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = (await (scryptAsync(secret, salt, 64) as Promise<Buffer>)).toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}
export function generateRecoveryCode() {
  const raw = Array.from(randomBytes(12), byte => recoveryCodeAlphabet[byte % recoveryCodeAlphabet.length]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`.toUpperCase();
}
export const recoveryCodeHash = (code: string) => createHash('sha256').update(code.trim().toUpperCase()).digest('hex');

export async function requireAccount(workspaceId: string) {
  const record = await db().workspace.findUnique({ where: { id: workspaceId }, include: { account: true } });
  if (!record?.account) throw new ApiError('Sign in to use this feature.', 401);
  return record.account;
}

// Sign-in on a fresh device adopts the account's existing data so the
// workspace follows the person, not the browser.
export async function adoptWorkspace(accountId: string, workspaceId: string) {
  const client = db();
  const stale = await client.workspace.findMany({ where: { accountId, id: { not: workspaceId } }, select: { id: true } });
  for (const old of stale) {
    const [oldProfile] = await client.profile.findMany({ where: { workspaceId: old.id } });
    const currentProfile = await client.profile.findUnique({ where: { workspaceId } });
    if (oldProfile && !currentProfile) await client.profile.update({ where: { id: oldProfile.id }, data: { workspaceId } });
    const staleSaved = await client.savedOpportunity.findMany({ where: { workspaceId: old.id }, select: { opportunityId: true } });
    if (staleSaved.length) {
      const currentSaved = await client.savedOpportunity.findMany({ where: { workspaceId }, select: { opportunityId: true } });
      const keep = new Set(currentSaved.map((s) => s.opportunityId));
      for (const row of staleSaved) {
        if (keep.has(row.opportunityId)) await client.savedOpportunity.delete({ where: { workspaceId_opportunityId: { workspaceId: old.id, opportunityId: row.opportunityId } } });
        else await client.savedOpportunity.update({ where: { workspaceId_opportunityId: { workspaceId: old.id, opportunityId: row.opportunityId } }, data: { workspaceId } });
      }
    }
    await client.tracker.updateMany({ where: { workspaceId: old.id }, data: { workspaceId } });
    await client.message.updateMany({ where: { senderId: old.id }, data: { senderId: workspaceId } });
    await client.connectionRequest.updateMany({ where: { fromWorkspaceId: old.id }, data: { fromWorkspaceId: workspaceId } });
    await client.connectionRequest.updateMany({ where: { toWorkspaceId: old.id }, data: { toWorkspaceId: workspaceId } });
    await client.opportunity.updateMany({ where: { ownerId: old.id }, data: { ownerId: workspaceId } });
    await client.workspace.delete({ where: { id: old.id } });
  }
  await client.workspace.update({ where: { id: workspaceId }, data: { accountId } });
}
