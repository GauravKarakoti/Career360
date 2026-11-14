'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Bookmark, BookmarkCheck, CheckCircle2, ChevronDown, Compass,
  Dna, ExternalLink, Loader2, RotateCcw, Send, Sparkles,
} from 'lucide-react';

const ROLES = ['Startup', 'Candidate', 'Recruiter', 'Creator', 'Business', 'Event organiser', 'Sponsor / Brand'] as const;
const CATEGORIES = ['Partnerships', 'Funding', 'Jobs & internships', 'Events', 'Collaborations', 'Learning'] as const;

type Weights = { needs: number; capabilities: number; industry: number; location: number };
type MatchResult = {
  score: number;
  forYou: string[];
  forThem: string[];
  missing: string[];
  weights: Weights;
  industry: boolean;
  location: boolean;
};
type Opportunity = {
  id: string;
  title: string;
  organization: string;
  category: string;
  location: string;
  industry: string;
  description: string;
  requirements: string[];
  offers: string[];
  sourceUrl: string | null;
  publishedAt: string;
  deadline: string | null;
  isDemo: boolean;
  trust: string;
  match: MatchResult | null;
};
type Profile = {
  name: string; role: string; industry: string; location: string; description: string;
  stage: string; interests: string; constraints: string; goals: string;
  capabilities: { label: string }[]; needs: { label: string }[];
};
type ProfileForm = {
  name: string; role: string; industry: string; location: string; description: string;
  stage: string; interests: string; constraints: string; goals: string;
  capabilities: string; needs: string;
};

const EMPTY_FORM: ProfileForm = {
  name: '', role: 'Candidate', industry: '', location: '', description: '',
  stage: '', interests: '', constraints: '', goals: '', capabilities: '', needs: '',
};
const EMPTY_LISTING = {
  title: '', organization: '', category: 'Partnerships', location: '', industry: '',
  description: '', requirements: '', offers: '', sourceUrl: '', deadline: '',
};

const splitTerms = (value: string) =>
  value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 20);

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data ? String((data as { error: unknown }).error) : 'Something went wrong.';
    throw new Error(message);
  }
  return data as T;
}

function Chip({ label, tone }: { label: string; tone: 'offer' | 'need' | 'gap' }) {
  const tones = {
    offer: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    need: 'bg-sky-50 text-sky-700 ring-sky-200',
    gap: 'bg-amber-50 text-amber-700 ring-amber-200',
  } as const;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{label}</span>;
}

function MatchPanel({ match }: { match: MatchResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700">
        <span>Why this match — {match.forYou.length + match.forThem.length} complementary connections</span>
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 px-3 py-3 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-700">What you can get</p>
            {match.forYou.length
              ? <ul className="mt-1 list-disc space-y-0.5 pl-4">{match.forYou.map(item => <li key={item}>{item}</li>)}</ul>
              : <p className="mt-1 italic">Nothing they offer matches your stated needs yet.</p>}
          </div>
          <div>
            <p className="font-semibold text-slate-700">What you can give</p>
            {match.forThem.length
              ? <ul className="mt-1 list-disc space-y-0.5 pl-4">{match.forThem.map(item => <li key={item}>{item}</li>)}</ul>
              : <p className="mt-1 italic">Nothing you offer matches their requirements yet.</p>}
          </div>
          {match.missing.length > 0 && (
            <div>
              <p className="font-semibold text-slate-700">Gaps to bridge</p>
              <div className="mt-1 flex flex-wrap gap-1.5">{match.missing.map(item => <Chip key={item} label={item} tone="gap" />)}</div>
            </div>
          )}
          <p className="text-slate-500">
            Rule-based scoring — {match.weights.needs}% your needs × their offers, {match.weights.capabilities}% your
            capabilities × their requirements, {match.weights.industry}% industry fit, {match.weights.location}% location fit.
          </p>
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ item, saved, onToggleSave }: {
  item: Opportunity; saved: boolean; onToggleSave: (id: string) => void;
}) {
  const trustLabel = item.isDemo ? 'Demo · fictional' : `Unverified · ${item.trust}`;
  const trustTone = item.isDemo
    ? 'bg-violet-50 text-violet-700 ring-violet-200'
    : item.trust === 'Expired'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-slate-100 text-slate-600 ring-slate-300';
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{item.organization} · {item.category} · {item.location}</p>
        </div>
        {item.match && (
          <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
            {item.match.score}% match
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${trustTone}`}>{trustLabel}</span>
        {item.match?.location && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Location fit</span>}
        {item.match?.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Industry fit</span>}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.description}</p>
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-emerald-700">Offers:</span>
          {item.offers.map(label => <Chip key={label} label={label} tone="offer" />)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-sky-700">Looking for:</span>
          {item.requirements.map(label => <Chip key={label} label={label} tone="need" />)}
        </div>
      </div>
      {item.match && <MatchPanel match={item.match} />}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onToggleSave(item.id)} aria-pressed={saved}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
            saved ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
          }`}>
          {saved ? <BookmarkCheck aria-hidden className="h-4 w-4" /> : <Bookmark aria-hidden className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save'}
        </button>
        {item.sourceUrl && (
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Source <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}

const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500';
const labelClass = 'block text-sm font-medium text-slate-700';

export default function Workspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_FORM);
  const [hasProfile, setHasProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string>('All');
  const [savedOnly, setSavedOnly] = useState(false);
  const [listingForm, setListingForm] = useState(EMPTY_LISTING);
  const [showListingForm, setShowListingForm] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const ws = await api<{ profile: Profile | null; saved: { opportunityId: string }[] }>('/api/workspace');
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

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true); setError('');
    const payload = {
      ...profileForm,
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
  };

  const toggleSave = async (id: string) => {
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
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    setPublishing(true); setError('');
    const deadlineValue = listingForm.deadline ? new Date(listingForm.deadline).toISOString() : null;
    try {
      await api('/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          ...listingForm,
          requirements: splitTerms(listingForm.requirements),
          offers: splitTerms(listingForm.offers),
          sourceUrl: listingForm.sourceUrl || null,
          deadline: deadlineValue && !Number.isNaN(new Date(deadlineValue).getTime()) ? deadlineValue : null,
        }),
      });
      setListingForm(EMPTY_LISTING);
      setShowListingForm(false);
      await load();
      flash('Listing published. It is marked unverified until a source is confirmed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not publish your listing.');
    } finally { setPublishing(false); }
  };

  const resetWorkspace = async () => {
    if (!window.confirm('Reset this private workspace? Your DNA, saved items and listings are deleted.')) return;
    try {
      await api('/api/workspace', { method: 'DELETE' });
      setProfileForm(EMPTY_FORM); setHasProfile(false); setSavedIds(new Set()); setListingForm(EMPTY_LISTING);
      await load();
      flash('Workspace reset. A fresh private session has started.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset your workspace.');
    }
  };

  const visible = useMemo(() => opportunities.filter(item => {
    if (savedOnly && !savedIds.has(item.id)) return false;
    if (category !== 'All' && item.category !== category) return false;
    return true;
  }), [opportunities, savedOnly, savedIds, category]);

  const savedCount = savedIds.size;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-slate-500">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> Loading your workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Dna aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">Opportunity360 AI</p>
              <p className="text-xs text-slate-500">From information to opportunity to action</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Private guest session · {savedCount} saved</span>
            <button type="button" onClick={resetWorkspace}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <RotateCcw aria-hidden className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>
      </header>

      {(error || notice) && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6" role="status" aria-live="polite">
          {error ? (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
            </p>
          )}
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr]">
        <section aria-labelledby="dna-heading">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="h-5 w-5 text-brand-600" />
              <h2 id="dna-heading" className="text-lg font-bold text-slate-900">Your Opportunity DNA</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Describe what you offer and what you need. Matching is rule-based and fully transparent.
            </p>
            <form onSubmit={saveProfile} className="mt-4 space-y-3">
              <div>
                <label htmlFor="name" className={labelClass}>Name</label>
                <input id="name" required maxLength={160} value={profileForm.name}
                  onChange={event => setProfileForm(f => ({ ...f, name: event.target.value }))}
                  className={fieldClass} placeholder="Gaurav" />
              </div>
              <div>
                <label htmlFor="role" className={labelClass}>I am a…</label>
                <select id="role" value={profileForm.role}
                  onChange={event => setProfileForm(f => ({ ...f, role: event.target.value }))} className={fieldClass}>
                  {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="industry" className={labelClass}>Industry</label>
                  <input id="industry" required maxLength={160} value={profileForm.industry}
                    onChange={event => setProfileForm(f => ({ ...f, industry: event.target.value }))}
                    className={fieldClass} placeholder="Technology" />
                </div>
                <div>
                  <label htmlFor="location" className={labelClass}>Location</label>
                  <input id="location" required maxLength={160} value={profileForm.location}
                    onChange={event => setProfileForm(f => ({ ...f, location: event.target.value }))}
                    className={fieldClass} placeholder="Bengaluru · Remote" />
                </div>
              </div>
              <div>
                <label htmlFor="capabilities" className={labelClass}>Capabilities (comma-separated)</label>
                <textarea id="capabilities" required rows={2} value={profileForm.capabilities}
                  onChange={event => setProfileForm(f => ({ ...f, capabilities: event.target.value }))}
                  className={fieldClass} placeholder="Product development, Technical expertise" />
              </div>
              <div>
                <label htmlFor="needs" className={labelClass}>Needs (comma-separated)</label>
                <textarea id="needs" required rows={2} value={profileForm.needs}
                  onChange={event => setProfileForm(f => ({ ...f, needs: event.target.value }))}
                  className={fieldClass} placeholder="Funding, Mentorship, Distribution" />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>Short bio</label>
                <textarea id="description" required rows={3} maxLength={2000} value={profileForm.description}
                  onChange={event => setProfileForm(f => ({ ...f, description: event.target.value }))}
                  className={fieldClass} placeholder="What you are building or looking for, in a few lines." />
              </div>
              <details className="rounded-lg border border-slate-200 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">Optional context</summary>
                <div className="mt-3 space-y-3">
                  {([['stage', 'Stage'], ['interests', 'Interests'], ['constraints', 'Constraints'], ['goals', 'Goals']] as const).map(([key, label]) => (
                    <div key={key}>
                      <label htmlFor={key} className={labelClass}>{label}</label>
                      <input id={key} maxLength={500} value={profileForm[key]}
                        onChange={event => setProfileForm(f => ({ ...f, [key]: event.target.value }))}
                        className={fieldClass} />
                    </div>
                  ))}
                </div>
              </details>
              <button type="submit" disabled={savingProfile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {savingProfile ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Dna aria-hidden className="h-4 w-4" />}
                {savingProfile ? 'Saving…' : hasProfile ? 'Update my DNA' : 'Build my DNA'}
              </button>
            </form>
          </div>
        </section>

        <section aria-labelledby="discover-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass aria-hidden className="h-5 w-5 text-brand-600" />
              <h2 id="discover-heading" className="text-lg font-bold text-slate-900">Discover</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Filter by category" value={category}
                onChange={event => setCategory(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm">
                <option value="All">All categories</option>
                {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
              <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(value => !value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                  savedOnly ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}>
                Saved ({savedCount})
              </button>
              <button type="button" onClick={() => setShowListingForm(value => !value)} aria-expanded={showListingForm}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
                {showListingForm ? 'Close' : '+ Post listing'}
              </button>
            </div>
          </div>

          {showListingForm && (
            <form onSubmit={publish} className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-5">
              <h3 className="text-base font-semibold text-slate-900">Publish an opportunity</h3>
              <p className="text-xs text-slate-500">
                Submissions are marked unverified. Add an HTTPS source URL so others can check the original.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="l-title" className={labelClass}>Title</label>
                  <input id="l-title" required maxLength={160} value={listingForm.title}
                    onChange={event => setListingForm(f => ({ ...f, title: event.target.value }))}
                    className={fieldClass} placeholder="Seeking a technical co-founder" />
                </div>
                <div>
                  <label htmlFor="l-org" className={labelClass}>Organization</label>
                  <input id="l-org" required maxLength={160} value={listingForm.organization}
                    onChange={event => setListingForm(f => ({ ...f, organization: event.target.value }))}
                    className={fieldClass} placeholder="Independent" />
                </div>
                <div>
                  <label htmlFor="l-category" className={labelClass}>Category</label>
                  <select id="l-category" value={listingForm.category}
                    onChange={event => setListingForm(f => ({ ...f, category: event.target.value }))} className={fieldClass}>
                    {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="l-industry" className={labelClass}>Industry</label>
                  <input id="l-industry" required maxLength={160} value={listingForm.industry}
                    onChange={event => setListingForm(f => ({ ...f, industry: event.target.value }))}
                    className={fieldClass} placeholder="Technology" />
                </div>
                <div>
                  <label htmlFor="l-location" className={labelClass}>Location</label>
                  <input id="l-location" required maxLength={160} value={listingForm.location}
                    onChange={event => setListingForm(f => ({ ...f, location: event.target.value }))}
                    className={fieldClass} placeholder="Remote" />
                </div>
                <div>
                  <label htmlFor="l-deadline" className={labelClass}>Deadline (optional)</label>
                  <input id="l-deadline" type="datetime-local" value={listingForm.deadline}
                    onChange={event => setListingForm(f => ({ ...f, deadline: event.target.value }))}
                    className={fieldClass} />
                </div>
              </div>
              <div>
                <label htmlFor="l-description" className={labelClass}>Description (at least 20 characters)</label>
                <textarea id="l-description" required rows={3} minLength={20} maxLength={2000} value={listingForm.description}
                  onChange={event => setListingForm(f => ({ ...f, description: event.target.value }))}
                  className={fieldClass} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="l-offers" className={labelClass}>Offers (comma-separated)</label>
                  <input id="l-offers" required value={listingForm.offers}
                    onChange={event => setListingForm(f => ({ ...f, offers: event.target.value }))}
                    className={fieldClass} placeholder="Funding, Mentorship" />
                </div>
                <div>
                  <label htmlFor="l-requirements" className={labelClass}>Requirements (comma-separated)</label>
                  <input id="l-requirements" required value={listingForm.requirements}
                    onChange={event => setListingForm(f => ({ ...f, requirements: event.target.value }))}
                    className={fieldClass} placeholder="Pitch deck, Traction" />
                </div>
              </div>
              <div>
                <label htmlFor="l-source" className={labelClass}>Source URL (optional, HTTPS)</label>
                <input id="l-source" type="url" value={listingForm.sourceUrl}
                  onChange={event => setListingForm(f => ({ ...f, sourceUrl: event.target.value }))}
                  className={fieldClass} placeholder="https://example.com/announcement" />
              </div>
              <button type="submit" disabled={publishing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {publishing ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
                {publishing ? 'Publishing…' : 'Publish listing'}
              </button>
            </form>
          )}

          {!hasProfile && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-inset ring-sky-200">
              <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              Build your Opportunity DNA to unlock personalised match scores, complementary connections and capability gaps.
            </p>
          )}

          <div className="mt-4 space-y-4">
            {visible.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                {savedOnly && savedCount === 0 ? 'You have not saved any opportunities yet.' : 'No opportunities match this filter.'}
              </p>
            ) : visible.map(item => (
              <OpportunityCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={toggleSave} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-500 sm:px-6">
          Demo listings are explicitly fictional and labelled. User submissions are unverified. Your data stays in a private guest session.
        </p>
      </footer>
    </div>
  );
}
