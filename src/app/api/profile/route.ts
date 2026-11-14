import { db } from '@/lib/db';
import { handle, jsonBody, workspace } from '@/lib/session';
import { profileInput } from '@/lib/validation';
export async function PUT(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const { capabilities, needs, ...identity } = profileInput.parse(await jsonBody(request));
    const profile = await db().profile.upsert({ where: { workspaceId: session.id },
      create: { ...identity, workspaceId: session.id, capabilities: { create: capabilities.map(label => ({ label })) }, needs: { create: needs.map(label => ({ label })) } },
      update: { ...identity, capabilities: { deleteMany: {}, create: capabilities.map(label => ({ label })) }, needs: { deleteMany: {}, create: needs.map(label => ({ label })) } },
      include: { capabilities: true, needs: true }
    });
    return { profile };
  });
}
