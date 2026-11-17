import { Prisma } from '@prisma/client';
import { db } from './db';

// Shared server helpers for the Messages page. A conversation is an accepted
// ConnectionRequest; its Message rows are the history. Everything is scoped to
// the signed-in workspace id.

const profileSelect = { select: { name: true, roles: true, industry: true, location: true, visibility: true } } as const;
export const participantSelect = { select: { id: true, profile: profileSelect } } as const;

type ProfileRow = { name: string; roles: string[]; industry: string; location: string; visibility: string } | null;

export type ConversationDto = {
  id: string;
  counterpart: { workspaceId: string | null; name: string; roles: string[]; industry: string; location: string; private: boolean };
  lastMessage: { body: string; mine: boolean; createdAt: Date } | null;
  unread: number;
  lastActivityAt: Date;
};

// Same privacy rule as the Connections page: only discoverable profiles show details.
function maskProfile(workspaceId: string, profile: ProfileRow): ConversationDto['counterpart'] {
  return profile?.visibility === 'discoverable'
    ? { workspaceId, name: profile.name, roles: profile.roles, industry: profile.industry, location: profile.location, private: false }
    : { workspaceId: null, name: 'Private profile', roles: [], industry: '', location: '', private: true };
}

export function participantWhere(me: string): Prisma.ConnectionRequestWhereInput {
  return { status: 'accepted', OR: [{ fromWorkspaceId: me }, { toWorkspaceId: me }] };
}

export function toConversation(
  row: {
    id: string; fromWorkspaceId: string; createdAt: Date; respondedAt: Date | null;
    fromWorkspace: { id: string; profile: ProfileRow }; toWorkspace: { id: string; profile: ProfileRow };
    messages: { body: string; senderId: string; createdAt: Date }[];
  },
  me: string,
  unread: number
): ConversationDto {
  const last = row.messages[0] ?? null;
  const other = row.fromWorkspaceId === me ? row.toWorkspace : row.fromWorkspace;
  return {
    id: row.id,
    counterpart: maskProfile(other.id, other.profile),
    lastMessage: last && { body: last.body, mine: last.senderId === me, createdAt: last.createdAt },
    unread,
    lastActivityAt: last?.createdAt ?? row.respondedAt ?? row.createdAt
  };
}

// Unread = messages from the other side newer than this participant's read
// timestamp. One grouped query for every conversation (no per-thread counts).
export async function unreadCounts(me: string): Promise<Map<string, number>> {
  const rows = await db().$queryRaw<{ requestId: string; unread: number }[]>(Prisma.sql`
    SELECT m."requestId" AS "requestId", COUNT(*)::int AS "unread"
    FROM "Message" m
    JOIN "ConnectionRequest" c ON c."id" = m."requestId"
    WHERE c."status" = 'accepted'
      AND (c."fromWorkspaceId" = ${me} OR c."toWorkspaceId" = ${me})
      AND m."senderId" <> ${me}
      AND m."createdAt" > COALESCE(
        CASE WHEN c."fromWorkspaceId" = ${me} THEN c."fromReadAt" ELSE c."toReadAt" END,
        TIMESTAMP 'epoch')
    GROUP BY m."requestId"`);
  return new Map(rows.map((row) => [row.requestId, row.unread]));
}
