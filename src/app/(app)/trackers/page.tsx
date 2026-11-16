'use client';

import { useEffect } from 'react';
import { ExternalLink, Users, X } from 'lucide-react';
import { api, type MsgKey } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';

const STAGES = ['identified', 'applied', 'in conversation', 'committed', 'closed'] as const;

const STAGE_LABEL_KEYS: Record<(typeof STAGES)[number], MsgKey> = {
  identified: 'trackers.stage.identified',
  applied: 'trackers.stage.applied',
  'in conversation': 'trackers.stage.inConversation',
  committed: 'trackers.stage.committed',
  closed: 'trackers.stage.closed',
};

export default function TrackersPage() {
  const { flash, t, trackers, refreshTrackers, setTrackers, untrack, trackPendingIds } = useWorkspace();

  // Re-sync on every visit so changes from another tab/device show up.
  useEffect(() => {
    void refreshTrackers();
  }, [refreshTrackers]);

  const advance = async (id: string, stage: string) => {
    const previous = trackers;
    setTrackers((rows) => (rows ?? []).map((row) => (row.id === id ? { ...row, stage } : row)));
    try {
      await api('/api/trackers', { method: 'PATCH', body: JSON.stringify({ id, stage }) });
      const labelKey = STAGE_LABEL_KEYS[stage as (typeof STAGES)[number]];
      flash(`“${labelKey ? t(labelKey) : stage}”`);
    } catch (caught) {
      setTrackers(previous);
      flash(caught instanceof Error ? caught.message : 'Could not update the tracker.');
    }
  };

  return (
    <main className="mx-10 flex-1 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Users aria-hidden className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-slate-900">{t('trackers.title')}</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        {t('trackers.intro')}
      </p>
      <p className="mt-2 text-xs text-slate-500">{t('trackers.stagesLine')}</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        {trackers === null ? (
          <p className="text-xs text-slate-500">{t('trackers.loading')}</p>
        ) : trackers.length ? (
          <ul className="space-y-2">
            {trackers.map((tracker) => {
              const opportunity = tracker.opportunity;
              const organization = opportunity?.organization || tracker.counterpart;
              const busy = trackPendingIds.has(tracker.opportunityId ?? tracker.id) || tracker.id.startsWith('pending-');
              return (
                <li key={tracker.id} className="rounded-lg border border-slate-200 p-3 transition-opacity duration-200">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{tracker.title}</p>
                      <p className="text-xs text-slate-500">
                        <span className="capitalize">{tracker.kind}</span>
                        {organization ? ` · ${organization}` : ''}
                        {opportunity?.category ? ` · ${opportunity.category}` : ''}
                        {opportunity?.location ? ` · ${opportunity.location}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs">
                        <span className="sr-only">{tracker.title}</span>
                        <select
                          value={tracker.stage}
                          disabled={busy}
                          onChange={(event) => advance(tracker.id, event.target.value)}
                          className="rounded-lg border-slate-300 text-xs capitalize disabled:opacity-60"
                        >
                          {STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                              {t(STAGE_LABEL_KEYS[stage])}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void untrack(tracker)}
                        aria-label={t('trackers.untrackAria').replace('{title}', tracker.title)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <X aria-hidden className="h-3.5 w-3.5" />
                        {t('trackers.untrack')}
                      </button>
                    </div>
                  </div>
                  {opportunity?.description && (
                    <p className="mt-2 line-clamp-3 text-xs text-slate-600">{opportunity.description}</p>
                  )}
                  {(opportunity?.deadline || opportunity?.sourceUrl) && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {opportunity.deadline && (
                        <span>
                          {t('trackers.deadline')}: {new Date(opportunity.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {opportunity.sourceUrl && (
                        <a
                          href={opportunity.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                        >
                          {t('trackers.source')} <ExternalLink aria-hidden className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">{t('trackers.empty')}</p>
        )}
      </div>
    </main>
  );
}
