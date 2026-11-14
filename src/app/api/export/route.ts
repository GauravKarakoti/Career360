import { z } from 'zod';
import { ApiError, handle, workspace } from '@/lib/session';
import { requireMembership } from '@/lib/org';
import { db } from '@/lib/db';

function csvResponse(rows: (string | number | boolean | null)[][], filename: string) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => r.map(esc).join(',')).join('\n');
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}

// CSV export is built by hand (not via handle) so the CSV body is returned verbatim.
export async function GET(request: Request) {
  try {
    const session = await workspace();
    const kind = new URL(request.url).searchParams.get('kind');

    if (kind === 'trackers') {
      const trackers = await db().tracker.findMany({
        where: { workspaceId: session.id },
        orderBy: { createdAt: 'desc' },
        include: { opportunity: { select: { title: true, organization: true } } },
      });
      return csvResponse([
        ['opportunity', 'organization', 'stage', 'note', 'created', 'updated'],
        ...trackers.map((t) => [t.opportunity?.title ?? '(deleted)', t.opportunity?.organization ?? '', t.stage, t.notes, t.createdAt.toISOString(), t.updatedAt.toISOString()]),
      ], 'trackers.csv');
    }

    if (kind === 'audit') {
      const orgId = new URL(request.url).searchParams.get('orgId');
      if (!orgId) throw new ApiError('Add an orgId to export an audit log.', 400);
      await requireMembership(session.accountId!, orgId, 'admin');
      const entries = await db().auditLog.findMany({
        where: { orgId }, orderBy: { createdAt: 'desc' }, take: 5000,
        include: { account: { select: { email: true } } },
      });
      return csvResponse([
        ['timestamp', 'actor', 'action', 'detail'],
        ...entries.map((e) => [e.createdAt.toISOString(), e.account?.email ?? 'system', e.action, e.detail]),
      ], 'audit-log.csv');
    }

    throw new ApiError('Unknown export kind. Use kind=trackers or kind=audit&orgId=…', 400);
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Export API error', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ error: 'We could not build the export. Please try again.' }, { status: 500 });
  }
}
