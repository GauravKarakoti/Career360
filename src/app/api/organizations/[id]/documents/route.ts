import { z } from 'zod';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { rateLimit } from '@/lib/session';
import { audit, requireMembership } from '@/lib/org';
import { db } from '@/lib/db';

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  accessLevel: z.enum(['members', 'admins']).optional().default('members'),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    rateLimit(request, 'org-docs', 20);
    const { id } = await params;
    const session = await workspace();
    await requireMembership(session.accountId!, id, 'admin');
    const data = schema.parse(await jsonBody(request));

    const document = await db().orgDocument.create({
      data: { orgId: id, title: data.title, body: data.body, accessLevel: data.accessLevel, createdById: session.accountId },
    });
    await audit(id, session.accountId!, 'document.created', data.title);
    return { document };
  });
}
