'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api, type Tracker } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';

const STAGES = ['identified', 'applied', 'in conversation', 'committed', 'closed'] as const;

export default function TrackersPage() {
  const { flash, t } = useWorkspace();
  const [trackers, setTrackers] = useState<Tracker[] | null>(null);

  const loadTrackers = useCallback(async () => {
    try { setTrackers((await api<{ trackers: Tracker[] }>('/api/trackers')).trackers); }
    catch (caught) { flash(caught instanceof Error ? caught.message : 'Could not load your trackers.'); }
  }, [flash]);

  useEffect(() => { void loadTrackers(); }, [loadTrackers]);

  const advance = async (id: string, stage: string) => {
    try {
      await api('/api/trackers', { method: 'PATCH', body: JSON.stringify({ id, stage }) });
      setTrackers((await api<{ trackers: Tracker[] }>('/api/trackers')).trackers);
      flash(`Tracker moved to “${stage}”.`);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not update the tracker.');
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Users aria-hidden className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-slate-900">{t('trackers.title')}</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        {t('trackers.intro')}
      </p>
      <p className="mt-2 text-xs text-slate-500">Stages: identified → applied → in conversation → committed → closed.</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        {trackers?.length ? (
          <ul className="space-y-2">
            {trackers.map(tracker => (
              <li key={tracker.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{tracker.title}</p>
                    <p className="text-xs capitalize text-slate-500">{tracker.kind}{tracker.counterpart ? ` · ${tracker.counterpart}` : ''}</p>
                  </div>
                  <label className="text-xs">
                    <span className="sr-only">Stage for {tracker.title}</span>
                    <select value={tracker.stage} onChange={event => advance(tracker.id, event.target.value)}
                      className="rounded-lg border-slate-300 text-xs capitalize">
                      {STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-slate-500">Nothing tracked yet. Use “Track” on a listing in Discover to start.</p>}
      </div>
    </main>
  );
}
