'use client';

import { useMemo, useState } from 'react';
import { Compass, Loader2, Radar, Send, Sparkles } from 'lucide-react';
import {
  api, splitTerms, CATEGORIES, EMPTY_LISTING,
  type Draft, type ListingForm,
} from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';
import { OpportunityCard, fieldClass, labelClass } from '@/components/ui-bits';

export default function DiscoverPage() {
  const {
    opportunities, savedIds, savedCount, toggleSave, addTracker, hasProfile,
    lang, flash, load, refreshOpportunities, t,
  } = useWorkspace();
  const [category, setCategory] = useState('All');
  const [savedOnly, setSavedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingForm, setListingForm] = useState<ListingForm>(EMPTY_LISTING);
  const [publishing, setPublishing] = useState(false);
  const [ingestUrl, setIngestUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const visible = useMemo(() => opportunities.filter(item => {
    if (savedOnly && !savedIds.has(item.id)) return false;
    if (category !== 'All' && item.category !== category) return false;
    return true;
  }), [opportunities, savedOnly, savedIds, category]);

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await refreshOpportunities(searchQuery.trim() || undefined);
    flash(searchQuery.trim() ? `Search results for “${searchQuery.trim()}”.` : 'Showing all opportunities.');
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    setPublishing(true);
    const deadlineValue = listingForm.deadline ? new Date(listingForm.deadline).toISOString() : null;
    try {
      await api('/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          ...listingForm,
          requirements: splitTerms(listingForm.requirements),
          offers: splitTerms(listingForm.offers),
          sourceUrl: listingForm.sourceUrl || null,
          evidence: draft ? draft.evidence : null,
          deadline: deadlineValue && !Number.isNaN(new Date(deadlineValue).getTime()) ? deadlineValue : null,
        }),
      });
      setListingForm(EMPTY_LISTING);
      setDraft(null);
      setShowListingForm(false);
      await load();
      flash('Listing published. It is marked unverified until a source is confirmed.');
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not publish your listing.');
    } finally { setPublishing(false); }
  };

  const ingestSource = async (event: React.FormEvent) => {
    event.preventDefault();
    setIngesting(true);
    try {
      const result = await api<{ draft: Draft }>('/api/ingest', { method: 'POST', body: JSON.stringify({ url: ingestUrl }) });
      setDraft(result.draft);
      setListingForm({
        ...EMPTY_LISTING,
        title: result.draft.title, organization: result.draft.organization, category: result.draft.category,
        location: result.draft.location, industry: result.draft.industry, description: result.draft.description,
        requirements: result.draft.requirements.join(', '), offers: result.draft.offers.join(', '),
        sourceUrl: result.draft.sourceUrl,
      });
      setShowListingForm(true);
      flash(`Draft extracted with ${result.draft.confidence} confidence. Review every field before publishing.`);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not extract a listing from that source.');
    } finally { setIngesting(false); }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass aria-hidden className="h-5 w-5 text-brand-600" />
          <h1 className="text-xl font-bold text-slate-900">{t('Discover', 'खोजें')}</h1>
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
            {t('Saved', 'सहेजे')} ({savedCount})
          </button>
          <button type="button" onClick={() => setShowListingForm(value => !value)} aria-expanded={showListingForm}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            {showListingForm ? 'Close' : '+ Post listing'}
          </button>
        </div>
        <form onSubmit={runSearch} className="flex items-center gap-2">
          <label htmlFor="feed-search" className="sr-only">Search opportunities</label>
          <input id="feed-search" type="search" placeholder="Search opportunities…" value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="w-44 rounded-lg border-slate-300 text-sm sm:w-56" />
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        </form>
      </div>

      <form onSubmit={ingestSource} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="ingest-url" className={labelClass}>Extract from a source (TruthLens)</label>
          <input id="ingest-url" type="url" required placeholder="https://example.org/opportunity"
            value={ingestUrl} onChange={event => setIngestUrl(event.target.value)} className={`${fieldClass} mt-1`} />
          <p className="mt-1 text-xs text-slate-500">
            Paste an HTTPS page; the AI drafts a listing with verbatim evidence quotes. Nothing publishes until you review it.
          </p>
        </div>
        <button type="submit" disabled={ingesting}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {ingesting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} {ingesting ? 'Extracting…' : 'Extract draft'}
        </button>
      </form>

      {showListingForm && (
        <form onSubmit={publish} className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-5">
          <h2 className="text-base font-semibold text-slate-900">Publish an opportunity</h2>
          <p className="text-xs text-slate-500">
            Submissions are marked unverified. Add an HTTPS source URL so others can check the original.
          </p>
          {draft && (
            <div className="rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
              <p className="font-semibold">AI draft from source · confidence: {draft.confidence}</p>
              <ul className="mt-1 space-y-0.5">
                {draft.evidence.map((item, index) => (
                  <li key={index}><span className="font-medium">{item.field}:</span> “{item.quote}”</li>
                ))}
              </ul>
              <p className="mt-1 italic text-slate-500">Review every field below before publishing. Quotes must match the source.</p>
            </div>
          )}
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
          <OpportunityCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={toggleSave} onTrack={addTracker} />
        ))}
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <Radar aria-hidden className="h-3.5 w-3.5" /> {lang === 'en' ? 'Ranked full-text search runs on the server; filters apply client-side.' : 'रैंक की गई खोज सर्वर पर चलती है; फ़िल्टर क्लाइंट-साइड लागू होते हैं।'}
      </p>
    </main>
  );
}
