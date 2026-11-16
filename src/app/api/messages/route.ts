import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace, rateLimit } from '@/lib/session';
import { recordEvent } from '@/lib/events';
import { participantSelect, participantWhere, toConversation, unreadCounts } from '@/lib/messaging';
export const runtime = 'nodejs';

const sendInput = z.object({ requestId: z.string().min(1).max(40), body: z.string().trim().min(1).max(2000) });
const readInput = z.object({ requestId: z.string().min(1).max(40) });
const THREAD_LIMIT = 200;

// GET /api/messages                  -> conversations (newest activity first); ?q= searches name or message text
// GET /api/messages?view=unread      -> { unread } total for the navigation badge
// GET /api/messages?requestId=<id>   -> { conversation, messages } for one thread
export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId');

    if (requestId) {
      const thread = await db().connectionRequest.findUnique({
        where: { id: requestId },
        include: {
          fromWorkspace: participantSelect,
          toWorkspace: participantSelect,
          // Newest page of the history, flipped to chronological order below.
          messages: { orderBy: { createdAt: 'desc' }, take: THREAD_LIMIT }
        }
      });
      if (!thread || (thread.fromWorkspaceId !== session.id && thread.toWorkspaceId !== session.id)) throw new ApiError('Conversation not found.', 404);
      if (thread.status !== 'accepted') throw new ApiError('Messaging opens once the connection is accepted.', 403);
      const unread = (await unreadCounts(session.id)).get(thread.id) ?? 0;
      return {
        conversation: toConversation(thread, session.id, unread),
        messages: thread.messages
          .slice()
          .reverse()
          .map((message) => ({ id: message.id, body: message.body, mine: message.senderId === session.id, createdAt: message.createdAt }))
      };
    }

    if (url.searchParams.get('view') === 'unread') {
      let unread = 0;
      for (const count of (await unreadCounts(session.id)).values()) unread += count;
      return { unread };
    }

    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
    const where = participantWhere(session.id);
    if (q) {
      // Names are only searchable when the profile is discoverable, so a search
      // can never reveal who a private profile belongs to.
      const nameMatch = { profile: { is: { visibility: 'discoverable', name: { contains: q, mode: 'insensitive' as const } } } };
      where.AND = [
        {
          OR: [
            { messages: { some: { body: { contains: q, mode: 'insensitive' } } } },
            { fromWorkspaceId: session.id, toWorkspace: nameMatch },
            { toWorkspaceId: session.id, fromWorkspace: nameMatch }
          ]
        }
      ];
    }
    const [rows, unread] = await Promise.all([
      db().connectionRequest.findMany({
        where,
        take: 100,
        include: {
          fromWorkspace: participantSelect,
          toWorkspace: participantSelect,
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, senderId: true, createdAt: true } }
        }
      }),
      unreadCounts(session.id)
    ]);
    const conversations = rows
      .map((row) => toConversation(row, session.id, unread.get(row.id) ?? 0))
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
    return { conversations };
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    rateLimit(request, 'messages', 30);
    const session = await workspace();
    const input = sendInput.parse(await jsonBody(request));
    const thread = await db().connectionRequest.findUnique({ where: { id: input.requestId } });
    if (!thread || (thread.fromWorkspaceId !== session.id && thread.toWorkspaceId !== session.id)) throw new ApiError('Conversation not found.', 404);
    if (thread.status !== 'accepted') throw new ApiError('Messaging opens once the connection is accepted.', 403);
    const message = await db().message.create({ data: { requestId: input.requestId, senderId: session.id, body: input.body } });
    // Sending a message implies the sender has read everything before it.
    await db().connectionRequest.update({
      where: { id: thread.id },
      data: thread.fromWorkspaceId === session.id ? { fromReadAt: message.createdAt } : { toReadAt: message.createdAt }
    });
    await recordEvent(session.id, 'message.sent', '', thread.opportunityId);
    return { id: message.id, body: message.body, mine: true, createdAt: message.createdAt };
  });
}

// PATCH { requestId }: mark the conversation as read for the signed-in participant.
export async function PATCH(request: Request) {
  return handle(request, async () => {
    rateLimit(request, 'messages-read', 120);
    const session = await workspace();
    const input = readInput.parse(await jsonBody(request));
    const thread = await db().connectionRequest.findUnique({ where: { id: input.requestId } });
    if (!thread || (thread.fromWorkspaceId !== session.id && thread.toWorkspaceId !== session.id)) throw new ApiError('Conversation not found.', 404);
    if (thread.status !== 'accepted') throw new ApiError('Messaging opens once the connection is accepted.', 403);
    const readAt = new Date();
    await db().connectionRequest.update({
      where: { id: thread.id },
      data: thread.fromWorkspaceId === session.id ? { fromReadAt: readAt } : { toReadAt: readAt }
    });
    return { id: thread.id, readAt };
  });
}
