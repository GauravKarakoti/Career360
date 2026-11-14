import { db } from '@/lib/db';
import { clearSession, handle, workspace } from '@/lib/session';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace(true);
    const profile = await db().profile.findUnique({ where: { workspaceId: session.id }, include: { capabilities: true, needs: true } });
    const saved = await db().savedOpportunity.findMany({ where: { workspaceId: session.id }, select: { opportunityId: true, createdAt: true } });
    return { profile, saved, sessionExpiresAt: session.expiresAt };
  });
}
export async function DELETE(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    await db().workspace.delete({ where: { id: session.id } });
    await clearSession();
    return { deleted: true };
  });
}
