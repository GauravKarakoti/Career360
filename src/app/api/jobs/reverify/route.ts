import { db } from '@/lib/db';
import { verifyOpportunity } from '@/app/api/opportunities/[id]/reverify/route';
export const runtime = 'nodejs';

// Authorized ingestion job: re-verifies the sources of listings older than a
// day, oldest first. Guarded by the CRON_SECRET bearer token so only the
// scheduler (Vercel Cron, GitHub Actions, scripts/reverify-job.mjs) can run it.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db().opportunity.findMany({
    where: { sourceUrl: { not: null }, OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: cutoff } }] },
    orderBy: { lastVerifiedAt: { sort: 'asc', nulls: 'first' } },
    take: 20,
    select: { id: true }
  });

  const results = [];
  for (const { id } of stale) {
    try {
      results.push({ id, ...(await verifyOpportunity(id)) });
    } catch {
      results.push({ id, status: 'error' });
    }
  }
  return Response.json({ checked: results.length, results });
}
