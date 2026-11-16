'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  api, splitTerms, EMPTY_FORM, t as tr,
  type Lang, type MsgKey, type Opportunity, type Profile, type ProfileForm, type Tracker,
} from '@/lib/client-api';

type WorkspaceContextValue = {
  loading: boolean;
  error: string;
  notice: string;
  setError: (message: string) => void;
  flash: (message: string) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MsgKey, vars?: { count?: number }) => string;
  email: string | null;
  savedIds: Set<string>;
  savedCount: number;
  toggleSave: (id: string) => Promise<void>;
  profileForm: ProfileForm;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  hasProfile: boolean;
  savingProfile: boolean;
  saveProfile: (event: React.FormEvent) => Promise<void>;
  opportunities: Opportunity[];
  load: () => Promise<void>;
  refreshOpportunities: (query?: string) => Promise<void>;
  primaryRole: string | null;
  signOut: () => Promise<void>;
  trackers: Tracker[] | null;
  setTrackers: React.Dispatch<React.SetStateAction<Tracker[] | null>>;
  refreshTrackers: () => Promise<void>;
  trackedIds: Set<string>;
  trackPendingIds: Set<string>;
  toggleTrack: (opportunity: Opportunity) => Promise<void>;
  untrack: (tracker: Tracker) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  const langRef = useRef<Lang>('en');
  langRef.current = lang;
  // Translations are generated lazily; while some are pending we poll a few times.
  const retryTimer = useRef<number | undefined>(undefined);
  const scheduleRetryRef = useRef<((query: string | undefined, attempt: number) => void) | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_FORM);
  const [hasProfile, setHasProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);
  // Single source of truth for tracking: the Discover cards and the Trackers page both read this.
  const [trackers, setTrackers] = useState<Tracker[] | null>(null);
  const trackersRef = useRef<Tracker[] | null>(null);
  trackersRef.current = trackers;
  const [trackPendingIds, setTrackPendingIds] = useState<Set<string>>(new Set());
  // Synchronous guard so a double click can never fire two requests for the same opportunity.
  const trackInFlight = useRef<Set<string>>(new Set());
  const trackedIds = useMemo(
    () => new Set((trackers ?? []).flatMap(row => (row.opportunityId ? [row.opportunityId] : []))),
    [trackers],
  );

  const load = useCallback(async () => {
    try {
      const ws = await api<{ profile: Profile | null; saved: { opportunityId: string }[]; email: string | null; primaryRole: string | null }>('/api/workspace');
      const feed = await api<{ opportunities: Opportunity[]; pending?: number }>(`/api/opportunities?lang=${langRef.current}`);
      const tracked = await api<{ trackers: Tracker[] }>('/api/trackers');
      if (ws.profile) {
        const p = ws.profile;
        setProfileForm({
          ...p,
          capabilities: p.capabilities.map(item => item.label).join(', '),
          needs: p.needs.map(item => item.label).join(', '),
        });
        setHasProfile(true);
      } else if (ws.primaryRole) {
        setProfileForm(previous => ({ ...previous, role: ws.primaryRole ?? previous.role }));
      }
      setEmail(ws.email);
      setPrimaryRole(ws.primaryRole);
      setSavedIds(new Set(ws.saved.map(entry => entry.opportunityId)));
      setOpportunities(feed.opportunities);
      // Keep rows that are mid-request so an in-flight optimistic update is not clobbered.
      setTrackers(tracked.trackers.filter(row => !(row.opportunityId && trackInFlight.current.has(row.opportunityId)))
        .concat((trackersRef.current ?? []).filter(row => row.opportunityId && trackInFlight.current.has(row.opportunityId))));
      if (feed.pending) scheduleRetryRef.current?.(undefined, 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    setError('');
    window.setTimeout(() => setNotice(''), 4000);
  }, []);

  const saveProfile = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true); setError('');
    const payload = {
      ...profileForm,
      roles: [profileForm.role],
      capabilities: splitTerms(profileForm.capabilities),
      needs: splitTerms(profileForm.needs),
    };
    try {
      await api('/api/profile', { method: 'PUT', body: JSON.stringify(payload) });
      setHasProfile(true);
      await load();
      flash('Opportunity DNA saved. Matches are refreshed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your DNA.');
    } finally { setSavingProfile(false); }
  }, [profileForm, load, flash]);

  const toggleSave = useCallback(async (id: string) => {
    const isSaved = savedIds.has(id);
    setSavedIds(previous => {
      const next = new Set(previous);
      if (isSaved) next.delete(id); else next.add(id);
      return next;
    });
    try {
      await api('/api/saved', { method: 'POST', body: JSON.stringify({ opportunityId: id, saved: !isSaved }) });
    } catch (caught) {
      setSavedIds(previous => {
        const next = new Set(previous);
        if (isSaved) next.add(id); else next.delete(id);
        return next;
      });
      setError(caught instanceof Error ? caught.message : 'Could not update saved items.');
    }
  }, [savedIds]);

  const fetchFeed = useCallback(async (query: string | undefined, attempt: number) => {
    window.clearTimeout(retryTimer.current);
    try {
      const params = new URLSearchParams({ lang: langRef.current });
      if (query) params.set('q', query);
      const feed = await api<{
        opportunities: Opportunity[];
        pending?: number;
        translation?: { status: 'ok' | 'unavailable' | 'error'; reason?: string };
      }>(`/api/opportunities?${params}`);
      setOpportunities(feed.opportunities);
      const tr = feed.translation;
      if (tr?.status === 'unavailable') {
        setError(tr.reason || 'Translation is not available right now.');
      } else if (feed.pending && attempt < 4) {
        scheduleRetryRef.current?.(query, attempt + 1);
      } else if (feed.pending && tr?.status === 'error') {
        setError(`Some listings could not be translated: ${tr.reason || 'unknown error'}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed.');
    }
  }, []);

  scheduleRetryRef.current = (query, attempt) => {
    window.clearTimeout(retryTimer.current);
    retryTimer.current = window.setTimeout(() => { void fetchFeed(query, attempt); }, 8000);
  };

  const refreshOpportunities = useCallback(async (query?: string) => {
    await fetchFeed(query, 0);
  }, [fetchFeed]);

  useEffect(() => () => window.clearTimeout(retryTimer.current), []);

  // Re-fetch listings in the newly chosen language (translations are cached server-side).
  const firstLang = useRef(true);
  useEffect(() => {
    if (firstLang.current) { firstLang.current = false; return; }
    void refreshOpportunities();
  }, [lang, refreshOpportunities]);

  const signOut = useCallback(async () => {
    try {
      await api('/api/auth/sign-out', { method: 'POST' });
      window.location.assign('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign out.');
    }
  }, []);

  const refreshTrackers = useCallback(async () => {
    try {
      const data = await api<{ trackers: Tracker[] }>('/api/trackers');
      const inFlight = trackInFlight.current;
      setTrackers(previous => [
        ...(previous ?? []).filter(row => row.opportunityId && inFlight.has(row.opportunityId)),
        ...data.trackers.filter(row => !(row.opportunityId && inFlight.has(row.opportunityId))),
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your trackers.');
    }
  }, []);

  const setPending = useCallback((id: string, pending: boolean) => {
    if (pending) trackInFlight.current.add(id); else trackInFlight.current.delete(id);
    setTrackPendingIds(new Set(trackInFlight.current));
  }, []);

  const toggleTrack = useCallback(async (opportunity: Opportunity) => {
    const id = opportunity.id;
    if (trackInFlight.current.has(id)) return;
    const current = trackersRef.current ?? [];
    const existing = current.find(row => row.opportunityId === id);
    setPending(id, true);
    try {
      if (existing) {
        // Untrack: remove optimistically, restore on failure. Only the tracker row is deleted.
        const index = current.indexOf(existing);
        setTrackers(previous => (previous ?? []).filter(row => row.opportunityId !== id));
        try {
          await api('/api/trackers', { method: 'DELETE', body: JSON.stringify({ opportunityId: id }) });
          flash(`Stopped tracking “${opportunity.title}”.`);
        } catch (caught) {
          setTrackers(previous => {
            const rows = (previous ?? []).filter(row => row.opportunityId !== id);
            rows.splice(Math.min(index, rows.length), 0, existing);
            return rows;
          });
          setError(caught instanceof Error ? caught.message : 'Could not stop tracking.');
        }
      } else {
        const optimistic: Tracker = {
          id: `pending-${id}`,
          opportunityId: id,
          kind: 'application',
          title: opportunity.title,
          stage: 'identified',
          notes: '',
          counterpart: opportunity.organization,
          updatedAt: new Date().toISOString(),
          opportunity: {
            id, title: opportunity.title, organization: opportunity.organization, category: opportunity.category,
            location: opportunity.location, description: opportunity.description, sourceUrl: opportunity.sourceUrl,
            deadline: opportunity.deadline, isDemo: opportunity.isDemo,
          },
        };
        setTrackers(previous => [optimistic, ...(previous ?? []).filter(row => row.opportunityId !== id)]);
        try {
          const result = await api<{ tracker: Tracker }>('/api/trackers', {
            method: 'POST',
            body: JSON.stringify({ opportunityId: id, kind: 'application', title: opportunity.title, counterpart: opportunity.organization }),
          });
          setTrackers(previous => (previous ?? []).map(row => (row.opportunityId === id ? result.tracker : row)));
          flash(`Tracking “${opportunity.title}”.`);
        } catch (caught) {
          setTrackers(previous => (previous ?? []).filter(row => row.opportunityId !== id));
          setError(caught instanceof Error ? caught.message : 'Could not start tracking.');
        }
      }
    } finally {
      setPending(id, false);
    }
  }, [flash, setPending]);

  // Untrack from the Trackers page (also works for rows that have no linked opportunity).
  const untrack = useCallback(async (tracker: Tracker) => {
    const key = tracker.opportunityId ?? tracker.id;
    if (trackInFlight.current.has(key)) return;
    const current = trackersRef.current ?? [];
    const index = current.indexOf(tracker);
    setPending(key, true);
    setTrackers(previous => (previous ?? []).filter(row => row.id !== tracker.id));
    try {
      await api('/api/trackers', {
        method: 'DELETE',
        body: JSON.stringify(tracker.opportunityId ? { opportunityId: tracker.opportunityId } : { id: tracker.id }),
      });
      flash(`Stopped tracking “${tracker.title}”.`);
    } catch (caught) {
      setTrackers(previous => {
        const rows = (previous ?? []).filter(row => row.id !== tracker.id);
        rows.splice(Math.min(Math.max(index, 0), rows.length), 0, tracker);
        return rows;
      });
      setError(caught instanceof Error ? caught.message : 'Could not stop tracking.');
    } finally {
      setPending(key, false);
    }
  }, [flash, setPending]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    loading, error, notice, setError, flash,
    lang, setLang, t: (key, vars) => tr(lang, key, vars),
    email, primaryRole,
    savedIds, savedCount: savedIds.size, toggleSave,
    profileForm, setProfileForm, hasProfile, savingProfile, saveProfile,
    opportunities, load, refreshOpportunities,
    trackers, setTrackers, refreshTrackers, trackedIds, trackPendingIds, toggleTrack, untrack,
    signOut,
  }), [loading, error, notice, flash, lang, email, primaryRole, savedIds, toggleSave, profileForm,
    hasProfile, savingProfile, saveProfile, opportunities, load, refreshOpportunities,
    trackers, refreshTrackers, trackedIds, trackPendingIds, toggleTrack, untrack, signOut]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
}
