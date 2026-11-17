import { z } from 'zod';
import { randomBytes, createHash } from 'node:crypto';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { rateLimit } from '@/lib/session';
import { audit, slugify } from '@/lib/org';
import { db } from '@/lib/db';

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().default(''),
  website: z.string().max(200).optional().default(''),
});

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    if (!session.accountId) {
      return { organizations: [] };
    }

    const organizations = await db().organization.findMany({
      where: {
        memberships: {
          some: { accountId: session.accountId },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        website: true,
        verified: true,
        createdAt: true,
        _count: { select: { memberships: true, documents: true } },
      },
    });

    return { organizations };
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    rateLimit(request, 'org-create', 5);
    const session = await workspace();
    const account = await db().account.findUnique({ where: { id: session.accountId! } });
    if (!account) throw new ApiError('Sign in to create an organization.', 401);
    const data = createSchema.parse(await jsonBody(request));

    const adminKey = randomBytes(24).toString('base64url');
    const adminKeyHash = createHash('sha256').update(adminKey).digest('hex');
    const slug = `${slugify(data.name)}-${randomBytes(3).toString('hex')}`;

    const org = await db().organization.create({
      data: {
        name: data.name, slug, description: data.description, website: data.website,
        adminKeyHash,
        memberships: { create: { accountId: account.id, role: 'owner' } },
      },
    });
    await audit(org.id, account.id, 'org.created', `by ${account.email}`);
    // The admin key is shown once; its hash proves control at verification time.
    const { adminKeyHash: _hash, ...safe } = org;
    void _hash;
    return { organization: safe, adminKey };
  });
}
