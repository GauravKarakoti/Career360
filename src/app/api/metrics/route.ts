import { db } from '@/lib/db';
import { handle, workspace } from '@/lib/session';
export const runtime = 'nodejs';

// Market Pulse separates DISCOVERY (what people looked at and saved) from
// ACHIEVED OUTCOMES (connections accepted, tracker stages advanced). Discovery
// numbers are intent, not results — the UI must never present them as outcomes.
export async function GET(request: Request) {
  return handle(request, async () => {
    await workspace();
    const url = new URL(request.url);
    const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const grouped = await db().activityEvent.groupBy({
      by: ['kind', 'detail'],
      where: { createdAt: { gte: since } },
      _count: { _all: true }
    });
    const count = (kind: string) => grouped.filter(row => row.kind === kind).reduce((sum, row) => sum + row._count._all, 0);

    const [workspaceAgg, listingAgg, acceptedAgg] = await Promise.all([
      db().workspace.aggregate({ _count: { _all: true } }),
      db().opportunity.aggregate({ _count: { _all: true }, where: { publishedAt: { gte: since } } }),
      db().connectionRequest.aggregate({ _count: { _all: true }, where: { status: 'accepted', respondedAt: { gte: since } } })
    ]);

    const searches = grouped.filter(row => row.kind === 'opportunity.viewed' && row.detail.startsWith('search:')).reduce((sum, row) => sum + row._count._all, 0);

    return {
      window: { days, since },
      discovery: {
        searches,
        views: count('opportunity.viewed'),
        saves: count('opportunity.saved'),
        listingsPublished: listingAgg._count._all
      },
      outcomes: {
        connectionRequests: count('connection.requested'),
        connectionsAccepted: acceptedAgg._count._all,
        trackersCreated: count('tracker.created'),
        stagesAdvanced: count('tracker.advanced'),
        messagesSent: count('message.sent')
      },
      totals: { workspaces: workspaceAgg._count._all }
    };
  });
}
