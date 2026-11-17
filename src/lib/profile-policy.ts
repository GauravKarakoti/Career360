// Pure (dependency-free) rules for who may see an Opportunity DNA profile and which
// fields leave the server. Kept free of imports so scripts/check-profile-privacy.mjs
// can exercise it without a database.

export type RelationStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export type Relation = {
  status: RelationStatus;
  /** Accepted request id (use for the Messages deep link) or the pending request id. */
  requestId: string | null;
  canConnect: boolean;
  canMessage: boolean;
};

export type ProfileViewDto = {
  workspaceId: string;
  isSelf: boolean;
  visibility: 'private' | 'discoverable';
  name: string;
  role: string;
  roles: string[];
  industry: string;
  location: string;
  description: string;
  stage: string;
  interests: string;
  goals: string;
  /** Constraints have no per-field sharing switch, so only the owner ever receives them. */
  constraints: string | null;
  capabilities: string[];
  needs: string[];
  updatedAt: string;
  relation: Relation;
};

export type ProfileRecord = {
  name: string;
  role: string;
  roles: string[];
  industry: string;
  location: string;
  description: string;
  stage: string;
  interests: string;
  constraints: string;
  goals: string;
  visibility: string;
  updatedAt: Date;
  capabilities: { label: string }[];
  needs: { label: string }[];
};

export type RequestRow = { id: string; status: string; fromWorkspaceId: string; createdAt: Date };

/** 'discoverable' is this app's "public": any signed-in user may read it. */
export const canView = (viewerWorkspaceId: string, targetWorkspaceId: string, visibility: string) =>
  viewerWorkspaceId === targetWorkspaceId || visibility === 'discoverable';

/**
 * Connection state between viewer and target. Mirrors the existing workflow: only a
 * discoverable target can be contacted, the sender needs a saved profile, and a
 * pending or accepted request blocks a new one (declined requests may be re-sent).
 */
export function resolveRelation(
  viewerId: string,
  rows: RequestRow[],
  opts: { targetVisibility: string; viewerHasProfile: boolean; isSelf: boolean }
): Relation {
  if (opts.isSelf) return { status: 'none', requestId: null, canConnect: false, canMessage: false };
  const newest = (list: RequestRow[]) => list.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const accepted = newest(rows.filter((row) => row.status === 'accepted'));
  if (accepted) return { status: 'connected', requestId: accepted.id, canConnect: false, canMessage: true };
  const pending = newest(rows.filter((row) => row.status === 'pending'));
  if (pending) {
    return {
      status: pending.fromWorkspaceId === viewerId ? 'pending_sent' : 'pending_received',
      requestId: pending.id,
      canConnect: false,
      canMessage: false
    };
  }
  return {
    status: 'none',
    requestId: null,
    canConnect: opts.viewerHasProfile && opts.targetVisibility === 'discoverable',
    canMessage: false
  };
}

/** Explicit allow-list DTO: never spread a Prisma record into a response. */
export function toProfileDto(
  workspaceId: string,
  viewerWorkspaceId: string,
  profile: ProfileRecord,
  relation: Relation
): ProfileViewDto {
  const isSelf = workspaceId === viewerWorkspaceId;
  return {
    workspaceId,
    isSelf,
    visibility: profile.visibility === 'discoverable' ? 'discoverable' : 'private',
    name: profile.name,
    role: profile.role,
    roles: profile.roles,
    industry: profile.industry,
    location: profile.location,
    description: profile.description,
    stage: profile.stage,
    interests: profile.interests,
    goals: profile.goals,
    constraints: isSelf ? profile.constraints : null,
    capabilities: profile.capabilities.map((item) => item.label),
    needs: profile.needs.map((item) => item.label),
    updatedAt: profile.updatedAt.toISOString(),
    relation
  };
}
