'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Globe,
  Loader2,
  Radar,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  api,
  splitTerms,
  CATEGORIES,
  EMPTY_LISTING,
  type Draft,
  type Lang,
  type ListingForm,
  type MsgKey,
} from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';
import { OpportunityCard, fieldClass, labelClass } from '@/components/ui-bits';

export const ROLE_ALLOWED_CATEGORIES: Record<string, readonly string[]> = {
  Candidate: ['Collaborations', 'Learning'],
  Recruiter: ['Jobs & internships', 'Learning'],
  Startup: ['Jobs & internships', 'Partnerships', 'Collaborations', 'Events'],
  Creator: ['Collaborations', 'Partnerships', 'Events', 'Learning'],
  Business: ['Partnerships', 'Jobs & internships', 'Collaborations', 'Funding'],
  'Event organiser': ['Events', 'Partnerships', 'Collaborations'],
  'Sponsor / Brand': ['Funding', 'Partnerships', 'Collaborations', 'Events'],
};

const ROLE_LABEL_KEYS: Record<string, MsgKey> = {
  Candidate: 'dashboard.role.Candidate.label',
  Startup: 'dashboard.role.Startup.label',
  Recruiter: 'dashboard.role.Recruiter.label',
  Creator: 'dashboard.role.Creator.label',
  Business: 'dashboard.role.Business.label',
  'Event organiser': 'dashboard.role.EventOrganiser.label',
  'Sponsor / Brand': 'dashboard.role.SponsorBrand.label',
};

const ROLE_POLICY_COPY: Record<
  Lang,
  {
    allowedNote: (role: string, allowed: string) => string;
    blockedExtractTitle: string;
    blockedExtractBody: (title: string, category: string, role: string, allowed: string) => string;
    blockedPublishError: (category: string, role: string, allowed: string) => string;
    webSyncTitle: string;
    webSyncSub: (totalCount: number, cached: boolean) => string;
    syncBtn: string;
    syncingBtn: string;
    webOnlyFilter: (count: number) => string;
  }
> = {
  en: {
    allowedNote: (role, allowed) =>
      `As a ${role}, you can publish listings in: ${allowed}.`,
    blockedExtractTitle: 'Category restricted for your role',
    blockedExtractBody: (title, category, role, allowed) =>
      `“${title}” was identified as a “${category}” opportunity. As a ${role}, you cannot extract or publish “${category}” listings (you can only post: ${allowed}).`,
    blockedPublishError: (category, role, allowed) =>
      `As a ${role}, you cannot publish in “${category}”. Allowed categories: ${allowed}.`,
    webSyncTitle: 'DNA-Matched Web & Database Feed',
    webSyncSub: (totalCount, cached) =>
      `${totalCount} listings scored against your Opportunity DNA${cached ? ' · served from fast cache' : ''}.`,
    syncBtn: 'Refresh web matches',
    syncingBtn: 'Syncing web…',
    webOnlyFilter: (count) => `Live Web (${count})`,
  },
  hi: {
    allowedNote: (role, allowed) =>
      `${role} के रूप में, आप केवल इन श्रेणियों में लिस्टिंग प्रकाशित कर सकते हैं: ${allowed}।`,
    blockedExtractTitle: 'आपकी भूमिका के लिए यह श्रेणी प्रतिबंधित है',
    blockedExtractBody: (title, category, role, allowed) =>
      `“${title}” को “${category}” श्रेणी के अवसर के रूप में पहचाना गया है। ${role} के रूप में आप “${category}” लिस्टिंग नहीं निकाल या प्रकाशित कर सकते (आप केवल ये पोस्ट कर सकते हैं: ${allowed})।`,
    blockedPublishError: (category, role, allowed) =>
      `${role} के रूप में आप “${category}” में प्रकाशित नहीं कर सकते। अनुमत श्रेणियाँ: ${allowed}।`,
    webSyncTitle: 'DNA-आधारित लाइव वेब और डेटाबेस फ़ीड',
    webSyncSub: (totalCount, cached) =>
      `आपके अपॉर्चुनिटी DNA से मैच किए गए ${totalCount} अवसर${cached ? ' · तेज़ कैश से लोड' : ''}।`,
    syncBtn: 'वेब मैच रिफ्रेश करें',
    syncingBtn: 'वेब से खोज रहे हैं…',
    webOnlyFilter: (count) => `लाइव वेब (${count})`,
  },
};

export default function DiscoverPage() {
  const {
    opportunities,
    savedIds,
    savedCount,
    toggleSave,
    addTracker,
    hasProfile,
    primaryRole,
    profileForm,
    lang,
    flash,
    load,
    refreshOpportunities,
    t,
  } = useWorkspace();

  const [category, setCategory] = useState('All');
  const [savedOnly, setSavedOnly] = useState(false);
  const [webOnly, setWebOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingForm, setListingForm] = useState<ListingForm>(EMPTY_LISTING);
  const [publishing, setPublishing] = useState(false);
  const [ingestUrl, setIngestUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ingestRoleError, setIngestRoleError] = useState<string | null>(null);
  const [syncingWeb, setSyncingWeb] = useState(false);
  const [servedFromCache, setServedFromCache] = useState(false);
  const autoSyncedRef = useRef(false);

  const activeRole = primaryRole || profileForm.role || 'Candidate';
  const allowedCategories = useMemo(
    () => ROLE_ALLOWED_CATEGORIES[activeRole] ?? ROLE_ALLOWED_CATEGORIES.Candidate,
    [activeRole]
  );

  const translatedRole = ROLE_LABEL_KEYS[activeRole]
    ? t(ROLE_LABEL_KEYS[activeRole])
    : activeRole;
  const policyCopy = ROLE_POLICY_COPY[lang] ?? ROLE_POLICY_COPY.en;

  useEffect(() => {
    if (!allowedCategories.includes(listingForm.category)) {
      setListingForm((f) => ({ ...f, category: allowedCategories[0] }));
    }
  }, [allowedCategories, listingForm.category]);

  const syncFromWeb = useCallback(
    async (force = false) => {
      if (!hasProfile) return;
      setSyncingWeb(true);
      try {
        const res = await api<{
          ok: boolean;
          created: number;
          reused: number;
          cached: boolean;
          sources: string[];
        }>('/api/opportunities/sync', {
          method: 'POST',
          body: JSON.stringify({ force }),
        });
        setServedFromCache(res.cached);
        if (res.created > 0 || force) {
          await refreshOpportunities(searchQuery.trim() || undefined);
        }
        if (force) {
          flash(
            res.created > 0
              ? `+${res.created} new live opportunities matched (${res.sources.join(', ')}).`
              : `Feed is up to date (${res.reused} cached web matches).`
          );
        }
      } catch {
        // Silent on background sync; flash only on manual trigger
        if (force) flash('Could not reach external opportunity feeds right now.');
      } finally {
        setSyncingWeb(false);
      }
    },
    [hasProfile, refreshOpportunities, searchQuery, flash]
  );

  // Automatically sync web opportunities once when user has DNA
  useEffect(() => {
    if (hasProfile && !autoSyncedRef.current) {
      autoSyncedRef.current = true;
      void syncFromWeb(false);
    }
  }, [hasProfile, syncFromWeb]);

  const webListingsCount = useMemo(
    () => opportunities.filter((item) => !item.isDemo && Boolean(item.sourceUrl)).length,
    [opportunities]
  );

  const visible = useMemo(
    () =>
      opportunities.filter((item) => {
        if (savedOnly && !savedIds.has(item.id)) return false;
        if (webOnly && (item.isDemo || !item.sourceUrl)) return false;
        if (category !== 'All' && item.category !== category) return false;
        return true;
      }),
    [opportunities, savedOnly, webOnly, savedIds, category]
  );

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await refreshOpportunities(searchQuery.trim() || undefined);
    flash(searchQuery.trim() ? `“${searchQuery.trim()}”` : t('discover.showingAll'));
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!allowedCategories.includes(listingForm.category)) {
      const msg = policyCopy.blockedPublishError(
        listingForm.category,
        translatedRole,
        allowedCategories.join(', ')
      );
      flash(msg);
      return;
    }

    setPublishing(true);
    const deadlineValue = listingForm.deadline ? new Date(listingForm.deadline).toISOString() : null;
    try {
      await api('/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          ...listingForm,
          requirements: splitTerms(listingForm.requirements),
          preferred: splitTerms(listingForm.preferred),
          offers: splitTerms(listingForm.offers),
          sourceUrl: listingForm.sourceUrl || null,
          evidence: draft ? draft.evidence : null,
          deadline:
            deadlineValue && !Number.isNaN(new Date(deadlineValue).getTime())
              ? deadlineValue
              : null,
        }),
      });
      setListingForm({ ...EMPTY_LISTING, category: allowedCategories[0] });
      setDraft(null);
      setShowListingForm(false);
      await load();
      flash(t('discover.publishSuccess'));
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : t('discover.publishError'));
    } finally {
      setPublishing(false);
    }
  };

  const ingestSource = async (event: React.FormEvent) => {
    event.preventDefault();
    setIngesting(true);
    setIngestRoleError(null);
    try {
      const result = await api<{ draft: Draft }>('/api/ingest', {
        method: 'POST',
        body: JSON.stringify({ url: ingestUrl }),
      });

      if (!allowedCategories.includes(result.draft.category)) {
        const message = policyCopy.blockedExtractBody(
          result.draft.title,
          result.draft.category,
          translatedRole,
          allowedCategories.join(', ')
        );
        setDraft(null);
        setShowListingForm(false);
        setIngestRoleError(message);
        flash(message);
        return;
      }

      setDraft(result.draft);
      setListingForm({
        ...EMPTY_LISTING,
        title: result.draft.title,
        organization: result.draft.organization,
        category: result.draft.category,
        location: result.draft.location,
        industry: result.draft.industry,
        description: result.draft.description,
        requirements: result.draft.requirements.join(', '),
        preferred: (result.draft.preferred ?? []).join(', '),
        offers: result.draft.offers.join(', '),
        sourceUrl: result.draft.sourceUrl,
      });
      setShowListingForm(true);
      flash(`${t('discover.aiDraftHeader')} ${result.draft.confidence}`);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : t('discover.extractError'));
    } finally {
      setIngesting(false);
    }
  };

  return (
    <main className="mx-10 flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass aria-hidden className="h-5 w-5 text-brand-600" />
          <h1 className="text-xl font-bold text-slate-900">{t('discover.title')}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t('discover.field.category')}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
          >
            <option value="All">{t('discover.allCategories')}</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={webOnly}
            onClick={() => setWebOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
              webOnly
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-300'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            <Globe aria-hidden className="h-3.5 w-3.5" />
            {policyCopy.webOnlyFilter(webListingsCount)}
          </button>
          <button
            type="button"
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly((value) => !value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
              savedOnly
                ? 'bg-brand-50 text-brand-700 ring-brand-300'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {t('discover.savedCount', { count: savedCount })}
          </button>
          <button
            type="button"
            onClick={() => {
              setIngestRoleError(null);
              setShowListingForm((value) => !value);
            }}
            aria-expanded={showListingForm}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {showListingForm ? t('discover.closeForm') : t('discover.postListing')}
          </button>
        </div>
        <form onSubmit={runSearch} className="flex items-center gap-2">
          <label htmlFor="feed-search" className="sr-only">
            {t('discover.searchLabel')}
          </label>
          <input
            id="feed-search"
            type="search"
            placeholder={t('discover.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-44 rounded-lg border border-slate-300 p-1.5 text-sm sm:w-56"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t('discover.searchBtn')}
          </button>
        </form>
      </div>

      {/* DNA Web Sync & Cache Status Bar */}
      {hasProfile ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Globe aria-hidden className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900">{policyCopy.webSyncTitle}</p>
              <p className="text-xs text-slate-600">
                {policyCopy.webSyncSub(webListingsCount, opportunities.length, servedFromCache)}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={syncingWeb}
            onClick={() => void syncFromWeb(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-300 hover:bg-brand-50 disabled:opacity-60"
          >
            <RefreshCw aria-hidden className={`h-3.5 w-3.5 ${syncingWeb ? 'animate-spin' : ''}`} />
            {syncingWeb ? policyCopy.syncingBtn : policyCopy.syncBtn}
          </button>
        </div>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-inset ring-sky-200">
          <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {t('discover.buildDnaPrompt')}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={ingestSource} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="ingest-url" className={labelClass}>
                {t('discover.ingestLabel')}
              </label>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {policyCopy.allowedNote(translatedRole, allowedCategories.join(', '))}
              </span>
            </div>
            <input
              id="ingest-url"
              type="url"
              required
              placeholder="https://example.org/opportunity"
              value={ingestUrl}
              onChange={(event) => {
                setIngestUrl(event.target.value);
                if (ingestRoleError) setIngestRoleError(null);
              }}
              className={`${fieldClass} mt-1`}
            />
            <p className="mt-1 text-xs text-slate-500">{t('discover.ingestHint')}</p>
          </div>
          <button
            type="submit"
            disabled={ingesting}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {ingesting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}{' '}
            {ingesting ? t('discover.extracting') : t('discover.extractBtn')}
          </button>
        </form>

        {ingestRoleError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs text-amber-900"
          >
            <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">{policyCopy.blockedExtractTitle}</p>
              <p className="mt-0.5 leading-relaxed">{ingestRoleError}</p>
            </div>
          </div>
        )}
      </div>

      {showListingForm && (
        <form
          onSubmit={publish}
          className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">{t('discover.publishTitle')}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/80 px-3 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              {policyCopy.allowedNote(translatedRole, allowedCategories.join(', '))}
            </span>
          </div>
          <p className="text-xs text-slate-500">{t('discover.publishNote')}</p>
          {draft && (
            <div className="rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
              <p className="font-semibold">
                {t('discover.aiDraftHeader')} {draft.confidence}
              </p>
              <ul className="mt-1 space-y-0.5">
                {draft.evidence.map((item, index) => (
                  <li key={index}>
                    <span className="font-medium">{item.field}:</span> “{item.quote}”
                  </li>
                ))}
              </ul>
              <p className="mt-1 italic text-slate-500">{t('discover.aiDraftReviewNote')}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="l-title" className={labelClass}>
                {t('discover.field.title')}
              </label>
              <input
                id="l-title"
                required
                maxLength={160}
                value={listingForm.title}
                onChange={(event) => setListingForm((f) => ({ ...f, title: event.target.value }))}
                className={fieldClass}
                placeholder={t('discover.field.titlePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="l-org" className={labelClass}>
                {t('discover.field.org')}
              </label>
              <input
                id="l-org"
                required
                maxLength={160}
                value={listingForm.organization}
                onChange={(event) =>
                  setListingForm((f) => ({ ...f, organization: event.target.value }))
                }
                className={fieldClass}
                placeholder={t('discover.field.orgPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="l-category" className={labelClass}>
                {t('discover.field.category')}
              </label>
              <select
                id="l-category"
                value={listingForm.category}
                onChange={(event) =>
                  setListingForm((f) => ({ ...f, category: event.target.value }))
                }
                className={fieldClass}
              >
                {allowedCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="l-industry" className={labelClass}>
                {t('discover.field.industry')}
              </label>
              <input
                id="l-industry"
                required
                maxLength={160}
                value={listingForm.industry}
                onChange={(event) =>
                  setListingForm((f) => ({ ...f, industry: event.target.value }))
                }
                className={fieldClass}
                placeholder={t('discover.field.industryPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="l-location" className={labelClass}>
                {t('discover.field.location')}
              </label>
              <input
                id="l-location"
                required
                maxLength={160}
                value={listingForm.location}
                onChange={(event) =>
                  setListingForm((f) => ({ ...f, location: event.target.value }))
                }
                className={fieldClass}
                placeholder={t('discover.field.locationPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="l-deadline" className={labelClass}>
                {t('discover.field.deadline')}
              </label>
              <input
                id="l-deadline"
                type="datetime-local"
                value={listingForm.deadline}
                onChange={(event) =>
                  setListingForm((f) => ({ ...f, deadline: event.target.value }))
                }
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="l-description" className={labelClass}>
              {t('discover.field.description')}
            </label>
            <textarea
              id="l-description"
              required
              rows={3}
              minLength={20}
              maxLength={2000}
              value={listingForm.description}
              onChange={(event) =>
                setListingForm((f) => ({ ...f, description: event.target.value }))
              }
              className={fieldClass}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="l-offers" className={labelClass}>
                {t('discover.field.offers')}
              </label>
              <input
                id="l-offers"
                required
                value={listingForm.offers}
                onChange={(event) => setListingForm((f) => ({ ...f, offers: event.target.value }))}
                className={fieldClass}
                placeholder={t('discover.field.offersPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="l-requirements" className={labelClass}>
                {t('discover.field.requirements')}
              </label>
              <input
                id="l-requirements"
                required
                value={listingForm.requirements}
                onChange={(event) =>
                  setListingForm((f) => ({ ...f, requirements: event.target.value }))
                }
                className={fieldClass}
                placeholder={t('discover.field.requirementsPlaceholder')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="l-preferred" className={labelClass}>
              {t('discover.field.preferred')}
            </label>
            <input
              id="l-preferred"
              value={listingForm.preferred}
              onChange={(event) => setListingForm((f) => ({ ...f, preferred: event.target.value }))}
              className={fieldClass}
              placeholder={t('discover.field.preferredPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="l-source" className={labelClass}>
              {t('discover.field.sourceUrl')}
            </label>
            <input
              id="l-source"
              type="url"
              value={listingForm.sourceUrl}
              onChange={(event) => setListingForm((f) => ({ ...f, sourceUrl: event.target.value }))}
              className={fieldClass}
              placeholder="https://example.com/announcement"
            />
          </div>
          <button
            type="submit"
            disabled={publishing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Send aria-hidden className="h-4 w-4" />
            )}
            {publishing ? t('discover.publishing') : t('discover.publishBtn')}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-4">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {savedOnly && savedCount === 0 ? t('discover.emptySaved') : t('discover.emptyFilter')}
          </p>
        ) : (
          visible.map((item) => (
            <OpportunityCard
              key={item.id}
              item={item}
              saved={savedIds.has(item.id)}
              onToggleSave={toggleSave}
              onTrack={addTracker}
            />
          ))
        )}
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <Radar aria-hidden className="h-3.5 w-3.5" /> {t('discover.searchNote')}
      </p>
    </main>
  );
}