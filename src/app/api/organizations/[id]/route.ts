import { ApiError, handle, workspace } from '@/lib/session';
import { membershipOf } from '@/lib/org';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(_request, async () => {
    const { id } = await params;
    const session = await workspace();
    const org = await db().organization.findUnique({
      where: { id },
      select: {
        id: true, name: true, slug: true, description: true, website: true,
        verified: true, verifiedAt: true, createdAt: true,
        memberships: { select: { id: true, role: true, createdAt: true, account: { select: { email: true } } } },
        documents: { select: { id: true, title: true, body: true, accessLevel: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!org) throw new ApiError('Organization not found.', 404);

    const membership = await membershipOf(session.accountId!, id);
    if (!membership) {
      // Non-members see only the public card, never documents or members.
      return {
        organization: { ...org, memberships: [], documents: [] },
        role: null,
      };
    }

    if (membership.role === 'member') {
      // Members see the roster but only member-level documents.
      org.documents = org.documents.filter((d) => d.accessLevel !== 'admins');
    }
    return { organization: org, role: membership.role };
  });
}
