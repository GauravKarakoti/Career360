import { z } from 'zod';
import { createHash } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { rateLimit } from '@/lib/session';
import { audit, requireMembership } from '@/lib/org';
import { db } from '@/lib/db';

const schema = z.object({ adminKey: z.string().min(10) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    rateLimit(request, 'org-verify', 5);
    const { id } = await params;
    const session = await workspace();
    await requireMembership(session.accountId!, id, 'admin');
    const { adminKey } = schema.parse(await jsonBody(request));

    const org = await db().organization.findUnique({ where: { id } });
    if (!org) throw new ApiError('Organization not found.', 404);
    if (org.verified) {
      const { adminKeyHash: _hash, ...safe } = org;
      return { organization: safe, alreadyVerified: true };
    }

    const attempt = createHash('sha256').update(adminKey).digest();
    const expected = Buffer.from(org.adminKeyHash, 'hex');
    if (attempt.length !== expected.length || !timingSafeEqual(attempt, expected)) {
      await audit(id, session.accountId!, 'org.verify_failed', '');
      throw new ApiError('That admin key does not match. Verification failed.', 403);
    }

    const updated = await db().organization.update({ where: { id }, data: { verified: true, verifiedAt: new Date() } });
    await audit(id, session.accountId!, 'org.verified', 'admin key confirmed');
    const { adminKeyHash: _hash, ...safe } = updated;
    return { organization: safe };
  });
}
