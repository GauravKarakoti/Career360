import { db } from '@/lib/db';
import { requireAccount } from '@/lib/auth';
import { ApiError, handle, workspace } from '@/lib/session';
import { canView, resolveRelation, toProfileDto } from '@/lib/profile-policy';

export const runtime = 'nodejs';

// GET /api/profiles/<workspaceId> -> another member's Opportunity DNA, filtered by
// their visibility setting. Private and missing profiles return the same 404 so the
// endpoint cannot be used to discover which workspace ids exist.
export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  return handle(request, async () => {
    const { workspaceId } = await params;
    const session = await workspace();
    await requireAccount(session.id);
    if (!workspaceId || workspaceId.length > 40) throw new ApiError('This profile is private or unavailable.', 404);

    // Select only what the DTO needs: never the workspace token hash or the Account row.
    const [profile, requests, viewerProfile] = await Promise.all([
      db().profile.findUnique({
        where: { workspaceId },
        select: {
          name: true, role: true, roles: true, industry: true, location: true, description: true,
          stage: true, interests: true, constraints: true, goals: true, visibility: true, updatedAt: true,
          capabilities: { select: { label: true }, orderBy: { label: 'asc' } },
          needs: { select: { label: true }, orderBy: { label: 'asc' } }
        }
      }),
      workspaceId === session.id
        ? Promise.resolve([])
        : db().connectionRequest.findMany({
            where: {
              OR: [
                { fromWorkspaceId: session.id, toWorkspaceId: workspaceId },
                { fromWorkspaceId: workspaceId, toWorkspaceId: session.id }
              ]
            },
            select: { id: true, status: true, fromWorkspaceId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 20
          }),
      db().profile.findUnique({ where: { workspaceId: session.id }, select: { id: true } })
    ]);

    // Being connected or messaging does not lift a private profile.
    if (!profile || !canView(session.id, workspaceId, profile.visibility)) {
      throw new ApiError('This profile is private or unavailable.', 404);
    }

    const relation = resolveRelation(session.id, requests, {
      targetVisibility: profile.visibility,
      viewerHasProfile: Boolean(viewerProfile),
      isSelf: workspaceId === session.id
    });
    return { profile: toProfileDto(workspaceId, session.id, profile, relation) };
  });
}
