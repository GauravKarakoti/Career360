import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { recordEvent } from '@/lib/events';
export const runtime = 'nodejs';

const sendInput = z.object({ requestId: z.string().min(1).max(40), body: z.string().trim().min(1).max(2000) });

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId') || '';
    const thread = await db().connectionRequest.findUnique({
      where: { id: requestId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 200 } }
    });
    if (!thread || (thread.fromWorkspaceId !== session.id && thread.toWorkspaceId !== session.id)) throw new ApiError('Conversation not found.', 404);
    if (thread.status !== 'accepted') throw new ApiError('Messaging opens once the connection is accepted.', 403);
    return {
      messages: thread.messages.map(message => ({ id: message.id, body: message.body, mine: message.senderId === session.id, createdAt: message.createdAt }))
    };
  });
}
export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const input = sendInput.parse(await jsonBody(request));
    const thread = await db().connectionRequest.findUnique({ where: { id: input.requestId } });
    if (!thread || (thread.fromWorkspaceId !== session.id && thread.toWorkspaceId !== session.id)) throw new ApiError('Conversation not found.', 404);
    if (thread.status !== 'accepted') throw new ApiError('Messaging opens once the connection is accepted.', 403);
    const message = await db().message.create({ data: { requestId: input.requestId, senderId: session.id, body: input.body } });
    await recordEvent(session.id, 'message.sent', '', thread.opportunityId);
    return { id: message.id, createdAt: message.createdAt };
  });
}
