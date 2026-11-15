'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api, type MsgKey, type Tracker } from '@/lib/client-api';
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
  const { flash, t } = useWorkspace();
  const [trackers, setTrackers] = useState<Tracker[] | null>(null);

  const loadTrackers = useCallback(async () => {
    try {
      setTrackers((await api<{ trackers: Tracker[] }>('/api/trackers')).trackers);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not load your trackers.');
    }
  }, [flash]);

  useEffect(() => {
    void loadTrackers();
  }, [loadTrackers]);

  const advance = async (id: string, stage: string) => {
    try {
      await api('/api/trackers', { method: 'PATCH', body: JSON.stringify({ id, stage }) });
      setTrackers((await api<{ trackers: Tracker[] }>('/api/trackers')).trackers);
      const labelKey = STAGE_LABEL_KEYS[stage as (typeof STAGES)[number]];
      flash(`“${labelKey ? t(labelKey) : stage}”`);
    } catch (caught) {
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
        {trackers?.length ? (
          <ul className="space-y-2">
            {trackers.map((tracker) => (
              <li key={tracker.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{tracker.title}</p>
                    <p className="text-xs capitalize text-slate-500">
                      {tracker.kind}{tracker.counterpart ? ` · ${tracker.counterpart}` : ''}
                    </p>
                  </div>
                  <label className="text-xs">
                    <span className="sr-only">{tracker.title}</span>
                    <select
                      value={tracker.stage}
                      onChange={(event) => advance(tracker.id, event.target.value)}
                      className="rounded-lg border-slate-300 text-xs capitalize"
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {t(STAGE_LABEL_KEYS[stage])}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">{t('trackers.empty')}</p>
        )}
      </div>
    </main>
  );
}