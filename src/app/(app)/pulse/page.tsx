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
    try {
      setMetrics(await api<Metrics>('/api/metrics?days=30'));
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not load Market Pulse.');
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return (
    <main className="mx-10 flex-1 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-slate-900">{t('pulse.title')}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        {t('pulse.intro')}
      </p>
      {loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {t('pulse.loading')}
        </p>
      ) : metrics ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('pulse.discoveryTitle')}
            </h2>
            <ul className="mt-2 space-y-1 text-slate-700">
              <li>{t('pulse.searches')} {metrics.discovery.searches}</li>
              <li>{t('pulse.views')} {metrics.discovery.views}</li>
              <li>{t('pulse.saves')} {metrics.discovery.saves}</li>
              <li>{t('pulse.published')} {metrics.discovery.listingsPublished}</li>
            </ul>
          </section>
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {t('pulse.outcomesTitle')}
            </h2>
            <ul className="mt-2 space-y-1 text-slate-700">
              <li>
                {t('pulse.connectionsAccepted')} {metrics.outcomes.connectionsAccepted} {t('pulse.of')}{' '}
                {metrics.outcomes.connectionRequests} {t('pulse.requested')}
              </li>
              <li>{t('pulse.trackersCreated')} {metrics.outcomes.trackersCreated}</li>
              <li>{t('pulse.stagesAdvanced')} {metrics.outcomes.stagesAdvanced}</li>
              <li>{t('pulse.messagesSent')} {metrics.outcomes.messagesSent}</li>
            </ul>
          </section>
          <section className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              {t('pulse.sdgTitle')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t('pulse.sdgIntro')}</p>
            {metrics.sdg.length === 0 ? (
              <p className="mt-2 text-slate-700">{t('pulse.sdgEmpty')}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-slate-700">
                {metrics.sdg.map((row) => (
                  <li key={row.category}>
                    {row.category}: {row.sourceBackedListings} {t('pulse.sourceBacked')}, {row.reverified} {t('pulse.reverified')}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="sm:col-span-2 text-xs text-slate-500">
            {t('pulse.disclaimer')}
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {t('pulse.empty')}
        </p>
      )}
    </main>
  );
}