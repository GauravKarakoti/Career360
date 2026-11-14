import { db } from './db';

export async function recordEvent(workspaceId: string, kind: string, detail = '', opportunityId: string | null = null) {
  await db().activityEvent.create({ data: { workspaceId, kind, detail, opportunityId } });
}

export const eventKinds = ['profile.saved', 'opportunity.viewed', 'opportunity.saved', 'listing.published', 'connection.requested', 'connection.accepted', 'connection.declined', 'message.sent', 'tracker.created', 'tracker.advanced', 'source.reverified'] as const;
