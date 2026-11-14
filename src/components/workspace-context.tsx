'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api, splitTerms, EMPTY_FORM, t as tr,
  type Lang, type Opportunity, type Profile, type ProfileForm,
} from '@/lib/client-api';

type WorkspaceContextValue = {
  loading: boolean;
  error: string;
  notice: string;
  setError: (message: string) => void;
  flash: (message: string) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (en: string, hi: string) => string;
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
  resetWorkspace: () => Promise<void>;
  signOut: () => Promise<void>;
  addTracker: (opportunity: Opportunity) => Promise<void>;
  showAuth: boolean;
  setShowAuth: (value: boolean) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  const [email, setEmail] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_FORM);
  const [hasProfile, setHasProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showAuth, setShowAuth] = useState(false);

  const load = useCallback(async () => {
    try {
      const ws = await api<{ profile: Profile | null; saved: { opportunityId: string }[]; email: string | null }>('/api/workspace');
      const feed = await api<{ opportunities: Opportunity[] }>('/api/opportunities');
      if (ws.profile) {
        const p = ws.profile;
        setProfileForm({
          ...p,
          capabilities: p.capabilities.map(item => item.label).join(', '),
          needs: p.needs.map(item => item.label).join(', '),
        });
        setHasProfile(true);
      }
      setEmail(ws.email);
      setSavedIds(new Set(ws.saved.map(entry => entry.opportunityId)));
      setOpportunities(feed.opportunities);
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

  const refreshOpportunities = useCallback(async (query?: string) => {
    try {
      const feed = await api<{ opportunities: Opportunity[] }>(`/api/opportunities${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setOpportunities(feed.opportunities);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed.');
    }
  }, []);

  const resetWorkspace = useCallback(async () => {
    if (!window.confirm('Reset this private workspace? Your DNA, saved items and listings are deleted.')) return;
    try {
      await api('/api/workspace', { method: 'DELETE' });
      setProfileForm(EMPTY_FORM); setHasProfile(false); setSavedIds(new Set()); setEmail(null);
      await load();
      flash('Workspace reset. A fresh private session has started.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset your workspace.');
    }
  }, [load, flash]);

  const signOut = useCallback(async () => {
    try {
      await api('/api/auth/sign-out', { method: 'POST' });
      setEmail(null);
      await load();
      flash(tr(lang, 'Signed out. This guest session starts fresh.', 'साइन आउट। यह अतिथि सत्र नया शुरू होता है।'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign out.');
    }
  }, [lang, load, flash]);

  const addTracker = useCallback(async (opportunity: Opportunity) => {
    try {
      await api('/api/trackers', {
        method: 'POST',
        body: JSON.stringify({ opportunityId: opportunity.id, kind: 'application', title: opportunity.title, counterpart: opportunity.organization })
      });
      flash(`Tracking “${opportunity.title}”.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start tracking.');
    }
  }, [flash]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    loading, error, notice, setError, flash,
    lang, setLang, t: (en, hi) => tr(lang, en, hi),
    email,
    savedIds, savedCount: savedIds.size, toggleSave,
    profileForm, setProfileForm, hasProfile, savingProfile, saveProfile,
    opportunities, load, refreshOpportunities,
    resetWorkspace, signOut, addTracker,
    showAuth, setShowAuth,
  }), [loading, error, notice, flash, lang, email, savedIds, toggleSave, profileForm,
    hasProfile, savingProfile, saveProfile, opportunities, load, refreshOpportunities,
    resetWorkspace, signOut, addTracker, showAuth]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
}
