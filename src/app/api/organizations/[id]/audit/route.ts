import { handle, workspace } from '@/lib/session';
import { requireMembership } from '@/lib/org';
import { db } from '@/lib/db';

// Append-only audit trail; admins and owners only.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(_request, async () => {
    const { id } = await params;
    const session = await workspace();
    await requireMembership(session.accountId!, id, 'admin');
    const entries = await db().auditLog.findMany({
      where: { orgId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { account: { select: { email: true } } },
    });
    return { entries };
  });
}
