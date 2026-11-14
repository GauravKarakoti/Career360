'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, type Metrics } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';

export default function PulsePage() {
  const { flash, t } = useWorkspace();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    try { setMetrics(await api<Metrics>('/api/metrics?days=30')); }
    catch (caught) { flash(caught instanceof Error ? caught.message : 'Could not load Market Pulse.'); }
    finally { setLoading(false); }
  }, [flash]);

  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-slate-900">{t('pulse.title')}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        {t('pulse.intro')}
      </p>
      {loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Loading…</p>
      ) : metrics ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discovery (intent)</h2>
            <ul className="mt-2 space-y-1 text-slate-700">
              <li>Searches: {metrics.discovery.searches}</li>
              <li>Listing views: {metrics.discovery.views}</li>
              <li>Saves: {metrics.discovery.saves}</li>
              <li>Listings published: {metrics.discovery.listingsPublished}</li>
            </ul>
          </section>
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Achieved outcomes</h2>
            <ul className="mt-2 space-y-1 text-slate-700">
              <li>Connections accepted: {metrics.outcomes.connectionsAccepted} of {metrics.outcomes.connectionRequests} requested</li>
              <li>Trackers created: {metrics.outcomes.trackersCreated}</li>
              <li>Stages advanced: {metrics.outcomes.stagesAdvanced}</li>
              <li>Messages sent: {metrics.outcomes.messagesSent}</li>
            </ul>
          </section>
          <p className="sm:col-span-2 text-xs text-slate-500">
            Discovery numbers show interest, not results. Only “Achieved outcomes” reflects real progress.
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No metrics available yet.
        </p>
      )}
    </main>
  );
}
