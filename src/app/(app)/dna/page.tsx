'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Dna,
  Eye,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { ROLES, splitTerms, type Lang, type MsgKey } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';
import { Chip, fieldClass, labelClass } from '@/components/ui-bits';
import { useRouter } from 'next/navigation';

type AiDraft = {
  name?: string;
  role: string;
  industry: string;
  location: string;
  capabilities: string[];
  needs: string[];
  description: string;
  stage?: string;
  interests?: string;
  constraints?: string;
  goals?: string;
};

type OptionalFieldKey = 'stage' | 'interests' | 'constraints' | 'goals';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
] as const;

const ROLE_LABEL_KEYS: Record<string, MsgKey> = {
  Candidate: 'dashboard.role.Candidate.label',
  Startup: 'dashboard.role.Startup.label',
  Recruiter: 'dashboard.role.Recruiter.label',
  Creator: 'dashboard.role.Creator.label',
  Business: 'dashboard.role.Business.label',
  'Event organiser': 'dashboard.role.EventOrganiser.label',
  'Sponsor / Brand': 'dashboard.role.SponsorBrand.label',
};

const OPTIONAL_FIELDS: readonly [OptionalFieldKey, MsgKey][] = [
  ['stage', 'dna.field.stage'],
  ['interests', 'dna.field.interests'],
  ['constraints', 'dna.field.constraints'],
  ['goals', 'dna.field.goals'],
];

const DNA_UI_COPY: Record<
  Lang,
  {
    placeholders: Record<OptionalFieldKey, string>;
    roleAutoNote: string;
    previewTitle: string;
    previewSubtitle: string;
    completeness: string;
    parsedCapabilities: string;
    parsedNeeds: string;
    emptyTags: string;
    weightsTitle: string;
    weightsNeeds: string;
    weightsCaps: string;
    weightsIndustry: string;
    weightsLocation: string;
  }
> = {
  en: {
    placeholders: {
      stage: 'e.g. Final-year student · Pre-seed · Bootstrapped',
      interests: 'e.g. FinTech, AI agents, Developer tools, Open source',
      constraints: 'e.g. Remote only · 20 hrs/week · Self-funded',
      goals: 'e.g. Land a summer internship · Close first 5 pilot users',
    },
    roleAutoNote: 'Auto-selected from your sign-in role',
    previewTitle: 'Live Opportunity DNA preview',
    previewSubtitle: 'How the match engine indexes your profile in real time.',
    completeness: 'Profile readiness',
    parsedCapabilities: 'Indexed capabilities (what you offer)',
    parsedNeeds: 'Indexed needs (what you seek)',
    emptyTags: 'Add comma-separated terms in the form to preview live match tags.',
    weightsTitle: 'Transparent match scoring weights',
    weightsNeeds: 'Your needs × their offers',
    weightsCaps: 'Your capabilities × their requirements',
    weightsIndustry: 'Industry alignment',
    weightsLocation: 'Location & remote fit',
  },
  hi: {
    placeholders: {
      stage: 'उदा. अंतिम वर्ष का छात्र · प्री-सीड · बूटस्ट्रैप्ड',
      interests: 'उदा. फिनटेक, AI एजेंट, डेवलपर टूल्स, ओपन सोर्स',
      constraints: 'उदा. केवल रिमोट · 20 घंटे/सप्ताह · स्व-वित्तपोषित',
      goals: 'उदा. समर इंटर्नशिप पाना · पहले 5 पायलट ग्राहक जोड़ना',
    },
    roleAutoNote: 'आपकी लॉगिन भूमिका के आधार पर स्वतः चयनित',
    previewTitle: 'लाइव अपॉर्चुनिटी DNA प्रीव्यू',
    previewSubtitle: 'मैच इंजन आपके प्रोफ़ाइल को वास्तविक समय में कैसे पढ़ता है।',
    completeness: 'प्रोफ़ाइल तत्परता',
    parsedCapabilities: 'सूचीबद्ध क्षमताएँ (आप क्या देते हैं)',
    parsedNeeds: 'सूचीबद्ध ज़रूरतें (आप क्या खोज रहे हैं)',
    emptyTags: 'लाइव मैच टैग देखने के लिए फ़ॉर्म में अल्पविराम से अलग किए गए शब्द लिखें।',
    weightsTitle: 'पारदर्शी मैच स्कोरिंग भार (Weights)',
    weightsNeeds: 'आपकी ज़रूरतें × उनकी पेशकश',
    weightsCaps: 'आपकी क्षमताएँ × उनकी आवश्यकताएँ',
    weightsIndustry: 'उद्योग अनुकूलता',
    weightsLocation: 'स्थान और रिमोट अनुकूलता',
  }
};

export default function DnaPage() {
  const router = useRouter();
  const {
    profileForm,
    setProfileForm,
    hasProfile,
    savingProfile,
    saveProfile,
    load,
    flash,
    primaryRole,
    lang,
    t,
  } = useWorkspace();

  const [syncingWeb, setSyncingWeb] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLanguage, setAiLanguage] = useState<'en' | 'hi'>(lang === 'hi' ? 'hi' : 'en');
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const ui = DNA_UI_COPY[lang] ?? DNA_UI_COPY.en;

  useEffect(() => {
    if (lang === 'en' || lang === 'hi') {
      setAiLanguage(lang);
    }
  }, [lang]);

  useEffect(() => {
    if (
      primaryRole &&
      ROLES.includes(primaryRole as (typeof ROLES)[number]) &&
      (!hasProfile || !profileForm.role)
    ) {
      setProfileForm((f) => (f.role === primaryRole ? f : { ...f, role: primaryRole }));
    }
  }, [hasProfile, primaryRole, profileForm.role, setProfileForm]);

  const capabilityList = useMemo(() => splitTerms(profileForm.capabilities), [profileForm.capabilities]);
  const needList = useMemo(() => splitTerms(profileForm.needs), [profileForm.needs]);

  const readinessPercent = useMemo(() => {
    const checks = [
      profileForm.name.trim().length > 0,
      profileForm.role.trim().length > 0,
      profileForm.industry.trim().length > 0,
      profileForm.location.trim().length > 0,
      capabilityList.length > 0,
      needList.length > 0,
      profileForm.description.trim().length >= 10,
      Boolean(
        profileForm.stage.trim() ||
          profileForm.interests.trim() ||
          profileForm.constraints.trim() ||
          profileForm.goals.trim()
      ),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [profileForm, capabilityList.length, needList.length]);

  async function handleSaveAndSync(event: React.FormEvent<HTMLFormElement>) {
    await saveProfile(event);
    setSyncingWeb(true);
    try {
      const res = await fetch('/api/opportunities/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const stats = (await res.json()) as { created: number; reused: number; sources: string[] };
        await load();
        const total = stats.created + stats.reused;
        flash(
          lang === 'hi'
            ? `DNA सहेजा गया! वेब और डेटाबेस से ${total} संबंधित अवसर आपके DNA मैच के साथ तैयार हैं।`
            : `DNA saved! ${total} relevant opportunities from the web & DB are matched and cached for you.`
        );
        router.push('/discover');
      }
    } catch {
      // Profile is still saved even if external web sync is offline
    } finally {
      setSyncingWeb(false);
    }
  }

  async function runAssist() {
    setAiBusy(true);
    setAiError(null);
    try {
      const response = await fetch('/api/profile/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, language: aiLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || t('dna.aiError'));
      setAiDraft(data.draft as AiDraft);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : t('dna.aiError'));
    } finally {
      setAiBusy(false);
    }
  }

  function applyDraft() {
    if (!aiDraft) return;
    setProfileForm((f) => ({
      ...f,
      name: aiDraft.name?.trim() || f.name,
      role: ROLES.includes(aiDraft.role as (typeof ROLES)[number]) ? aiDraft.role : f.role,
      industry: aiDraft.industry?.trim() || f.industry,
      location: aiDraft.location?.trim() || f.location,
      capabilities: aiDraft.capabilities.length ? aiDraft.capabilities.join(', ') : f.capabilities,
      needs: aiDraft.needs.length ? aiDraft.needs.join(', ') : f.needs,
      description: aiDraft.description?.trim() || f.description,
      stage: aiDraft.stage?.trim() || f.stage,
      interests: aiDraft.interests?.trim() || f.interests,
      constraints: aiDraft.constraints?.trim() || f.constraints,
      goals: aiDraft.goals?.trim() || f.goals,
    }));
    setAiDraft(null);
    setAiText('');
  }

  const displayedRole = ROLE_LABEL_KEYS[profileForm.role]
    ? t(ROLE_LABEL_KEYS[profileForm.role])
    : profileForm.role;

  return (
    <main className="mx-10 flex min-h-[calc(100vh-8.5rem)] flex-col justify-between px-4 py-6 sm:px-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Dna aria-hidden className="h-5 w-5 text-brand-600" />
              <h1 className="text-xl font-bold text-slate-900">{t('dna.title')}</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">{t('dna.intro')}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {ui.completeness}
              </p>
              <p className="text-sm font-bold text-slate-900">{readinessPercent}%</p>
            </div>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSaveAndSync}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={labelClass}>
                  {t('dna.field.name')}
                </label>
                <input
                  id="name"
                  required
                  maxLength={160}
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((f) => ({ ...f, name: event.target.value }))}
                  className={fieldClass}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1">
                  <label htmlFor="role" className={labelClass}>
                    {t('dna.field.role')}
                  </label>
                  {primaryRole && profileForm.role === primaryRole && (
                    <span className="text-[11px] font-medium text-brand-700">
                      {ui.roleAutoNote}
                    </span>
                  )}
                </div>
                <input
                  id="role"
                  required
                  value={profileForm.role}
                  className={fieldClass}
                  placeholder="profileForm.role"
                  disabled
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="industry" className={labelClass}>
                  {t('dna.field.industry')}
                </label>
                <input
                  id="industry"
                  required
                  maxLength={160}
                  value={profileForm.industry}
                  onChange={(event) =>
                    setProfileForm((f) => ({ ...f, industry: event.target.value }))
                  }
                  className={fieldClass}
                  placeholder={t('dna.field.industryPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="location" className={labelClass}>
                  {t('dna.field.location')}
                </label>
                <input
                  id="location"
                  required
                  maxLength={160}
                  value={profileForm.location}
                  onChange={(event) =>
                    setProfileForm((f) => ({ ...f, location: event.target.value }))
                  }
                  className={fieldClass}
                  placeholder={t('dna.field.locationPlaceholder')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="capabilities" className={labelClass}>
                  {t('dna.field.capabilities')}
                </label>
                <textarea
                  id="capabilities"
                  required
                  rows={3}
                  value={profileForm.capabilities}
                  onChange={(event) =>
                    setProfileForm((f) => ({ ...f, capabilities: event.target.value }))
                  }
                  className={fieldClass}
                  placeholder={t('dna.field.capabilitiesPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="needs" className={labelClass}>
                  {t('dna.field.needs')}
                </label>
                <textarea
                  id="needs"
                  required
                  rows={3}
                  value={profileForm.needs}
                  onChange={(event) => setProfileForm((f) => ({ ...f, needs: event.target.value }))}
                  className={fieldClass}
                  placeholder={t('dna.field.needsPlaceholder')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                {t('dna.field.bio')}
              </label>
              <textarea
                id="description"
                required
                rows={3}
                maxLength={2000}
                value={profileForm.description}
                onChange={(event) =>
                  setProfileForm((f) => ({ ...f, description: event.target.value }))
                }
                className={fieldClass}
                placeholder={t('dna.field.bioPlaceholder')}
              />
            </div>

            <details open className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                {t('dna.field.optionalContext')}
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {OPTIONAL_FIELDS.map(([key, labelKey]) => (
                  <div key={key}>
                    <label htmlFor={key} className={labelClass}>
                      {t(labelKey)}
                    </label>
                    <input
                      id={key}
                      maxLength={500}
                      value={profileForm[key]}
                      onChange={(event) =>
                        setProfileForm((f) => ({ ...f, [key]: event.target.value }))
                      }
                      placeholder={ui.placeholders[key]}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
            </details>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label htmlFor="visibility" className={labelClass}>
                  {t('dna.field.visibility')}
                </label>
                <select
                  id="visibility"
                  value={profileForm.visibility}
                  onChange={(event) =>
                    setProfileForm((f) => ({ ...f, visibility: event.target.value }))
                  }
                  className={fieldClass}
                >
                  <option value="private">{t('dna.field.visibilityPrivate')}</option>
                  <option value="discoverable">{t('dna.field.visibilityDiscoverable')}</option>
                </select>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <ShieldCheck aria-hidden className="h-3.5 w-3.5" />{' '}
                  {t('dna.field.visibilityNote')}
                </p>
              </div>

              <button
                type="submit"
                disabled={savingProfile || syncingWeb}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60"
              >
                {savingProfile || syncingWeb ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Dna aria-hidden className="h-4 w-4" />
                )}
                {savingProfile
                  ? t('dna.saving')
                  : syncingWeb
                    ? lang === 'hi'
                      ? 'वेब से अवसर खोजे जा रहे हैं…'
                      : 'Fetching live matches…'
                    : hasProfile
                      ? t('dna.updateBtn')
                      : t('dna.buildBtn')}
              </button>
            </div>
          </form>

          <div className="space-y-5 lg:col-span-5">
            <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-800">
                <Sparkles aria-hidden className="h-4 w-4" /> {t('dna.aiTitle')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{t('dna.aiIntro')}</p>
              <textarea
                value={aiText}
                onChange={(event) => setAiText(event.target.value)}
                rows={3}
                className={`${fieldClass} mt-2.5`}
                placeholder={t('dna.aiPlaceholder')}
              />
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <select
                  value={aiLanguage}
                  onChange={(event) => setAiLanguage(event.target.value as 'en' | 'hi')}
                  aria-label="AI reply language"
                  className={`${fieldClass} !mt-0 w-auto`}
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runAssist}
                  disabled={aiBusy || aiText.trim().length < 20}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {aiBusy ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 aria-hidden className="h-4 w-4" />
                  )}
                  {aiBusy ? t('dna.drafting') : t('dna.draftBtn')}
                </button>
              </div>
              {aiError && <p className="mt-2 text-sm text-red-600">{aiError}</p>}
              {aiDraft && (
                <div className="mt-3 rounded-lg border border-brand-300 bg-white p-3.5">
                  <p className="text-sm font-semibold text-slate-800">{t('dna.suggestedDraft')}</p>
                  <dl className="mt-2 space-y-1 text-xs text-slate-600">
                    {aiDraft.name && (
                      <div>
                        <dt className="inline font-semibold text-slate-700">
                          {t('dna.field.name')}:{' '}
                        </dt>
                        <dd className="inline">{aiDraft.name}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        {t('dna.field.role')}:{' '}
                      </dt>
                      <dd className="inline">{aiDraft.role}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        {t('dna.field.industry')}:{' '}
                      </dt>
                      <dd className="inline">{aiDraft.industry}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        {t('dna.field.location')}:{' '}
                      </dt>
                      <dd className="inline">{aiDraft.location}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        {t('dna.field.capabilities')}:{' '}
                      </dt>
                      <dd className="inline">{aiDraft.capabilities.join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        {t('dna.field.needs')}:{' '}
                      </dt>
                      <dd className="inline">{aiDraft.needs.join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        {t('dna.field.bio')}:{' '}
                      </dt>
                      <dd className="inline">{aiDraft.description}</dd>
                    </div>
                    {aiDraft.stage && (
                      <div>
                        <dt className="inline font-semibold text-slate-700">
                          {t('dna.field.stage')}:{' '}
                        </dt>
                        <dd className="inline">{aiDraft.stage}</dd>
                      </div>
                    )}
                    {aiDraft.interests && (
                      <div>
                        <dt className="inline font-semibold text-slate-700">
                          {t('dna.field.interests')}:{' '}
                        </dt>
                        <dd className="inline">{aiDraft.interests}</dd>
                      </div>
                    )}
                    {aiDraft.constraints && (
                      <div>
                        <dt className="inline font-semibold text-slate-700">
                          {t('dna.field.constraints')}:{' '}
                        </dt>
                        <dd className="inline">{aiDraft.constraints}</dd>
                      </div>
                    )}
                    {aiDraft.goals && (
                      <div>
                        <dt className="inline font-semibold text-slate-700">
                          {t('dna.field.goals')}:{' '}
                        </dt>
                        <dd className="inline">{aiDraft.goals}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={applyDraft}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      {t('dna.applyDraft')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDraft(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                    >
                      {t('dna.discardDraft')}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{ui.previewTitle}</h2>
                  <p className="text-xs text-slate-500">{ui.previewSubtitle}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                    profileForm.visibility === 'discoverable'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-slate-100 text-slate-600 ring-slate-300'
                  }`}
                >
                  {profileForm.visibility === 'discoverable' ? (
                    <Eye aria-hidden className="h-3 w-3" />
                  ) : (
                    <Lock aria-hidden className="h-3 w-3" />
                  )}
                  {profileForm.visibility}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-base font-bold text-slate-900">
                  {profileForm.name.trim() || '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {displayedRole} · {profileForm.industry.trim() || '—'} ·{' '}
                  {profileForm.location.trim() || '—'}
                </p>
                {profileForm.description.trim() && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {profileForm.description}
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    {ui.parsedCapabilities} ({capabilityList.length})
                  </p>
                  {capabilityList.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {capabilityList.map((item) => (
                        <Chip key={item} label={item} tone="offer" />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs italic text-slate-400">{ui.emptyTags}</p>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                    {ui.parsedNeeds} ({needList.length})
                  </p>
                  {needList.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {needList.map((item) => (
                        <Chip key={item} label={item} tone="need" />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs italic text-slate-400">{ui.emptyTags}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200/80 bg-canvas p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-brand-600" />
                  {ui.weightsTitle}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded bg-white px-2.5 py-1.5 ring-1 ring-inset ring-slate-200/80">
                    <span className="font-bold text-brand-700">40%</span> · {ui.weightsNeeds}
                  </div>
                  <div className="rounded bg-white px-2.5 py-1.5 ring-1 ring-inset ring-slate-200/80">
                    <span className="font-bold text-brand-700">40%</span> · {ui.weightsCaps}
                  </div>
                  <div className="rounded bg-white px-2.5 py-1.5 ring-1 ring-inset ring-slate-200/80">
                    <span className="font-bold text-brand-700">10%</span> · {ui.weightsIndustry}
                  </div>
                  <div className="rounded bg-white px-2.5 py-1.5 ring-1 ring-inset ring-slate-200/80">
                    <span className="font-bold text-brand-700">10%</span> · {ui.weightsLocation}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}