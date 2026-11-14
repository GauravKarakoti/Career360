import { db } from '@/lib/db';
import { handle, jsonBody, workspace } from '@/lib/session';
import { profileInput } from '@/lib/validation';
export async function PUT(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const { capabilities, needs, roles, ...identity } = profileInput.parse(await jsonBody(request));
    const fields = { ...identity, role: roles[0], roles };
    const profile = await db().profile.upsert({ where: { workspaceId: session.id },
      create: { ...fields, workspaceId: session.id, capabilities: { create: capabilities.map(label => ({ label })) }, needs: { create: needs.map(label => ({ label })) } },
      update: { ...fields, capabilities: { deleteMany: {}, create: capabilities.map(label => ({ label })) }, needs: { deleteMany: {}, create: needs.map(label => ({ label })) } },
      include: { capabilities: true, needs: true }
    });
    return { profile };
  });
}
