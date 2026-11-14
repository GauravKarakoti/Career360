'use client';

import { useState } from 'react';
import { Dna, Loader2, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { ROLES } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';
import { fieldClass, labelClass } from '@/components/ui-bits';

type AiDraft = {
  role: string; industry: string; location: string;
  capabilities: string[]; needs: string[]; description: string;
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'hinglish', label: 'Hinglish' },
] as const;

export default function DnaPage() {
  const { profileForm, setProfileForm, hasProfile, savingProfile, saveProfile, t } = useWorkspace();
  const [aiText, setAiText] = useState('');
  const [aiLanguage, setAiLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function runAssist() {
    setAiBusy(true); setAiError(null);
    try {
      const response = await fetch('/api/profile/assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, language: aiLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'The AI could not draft your profile. Try again.');
      setAiDraft(data.draft as AiDraft);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : 'The AI could not draft your profile. Try again.');
    } finally { setAiBusy(false); }
  }

  function applyDraft() {
    if (!aiDraft) return;
    setProfileForm(f => ({
      ...f,
      role: ROLES.includes(aiDraft.role as (typeof ROLES)[number]) ? aiDraft.role : f.role,
      industry: aiDraft.industry || f.industry,
      location: aiDraft.location || f.location,
      capabilities: aiDraft.capabilities.join(', '),
      needs: aiDraft.needs.join(', '),
      description: aiDraft.description || f.description,
    }));
    setAiDraft(null); setAiText('');
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2">
          <Dna aria-hidden className="h-5 w-5 text-brand-600" />
          <h1 className="text-xl font-bold text-slate-900">{t('dna.title')}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {t('dna.intro')}
        </p>
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-800">
            <Sparkles aria-hidden className="h-4 w-4" /> AI assist — draft my DNA
          </p>
          <p className="mt-1 text-xs text-slate-600">Describe yourself in a few lines in English, Hindi or Hinglish. The AI drafts the fields below; nothing is saved until you review and confirm.</p>
          <textarea value={aiText} onChange={event => setAiText(event.target.value)} rows={3}
            className={`${fieldClass} mt-2`}
            placeholder="e.g. I am a final-year student, I know React and Python, looking for an internship at a fintech startup…" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={aiLanguage} onChange={event => setAiLanguage(event.target.value as 'en' | 'hi' | 'hinglish')}
              aria-label="AI reply language" className={`${fieldClass} w-auto`}>
              {LANGUAGES.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}
            </select>
            <button type="button" onClick={runAssist} disabled={aiBusy || aiText.trim().length < 20}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {aiBusy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Wand2 aria-hidden className="h-4 w-4" />}
              {aiBusy ? 'Drafting…' : 'Draft with AI'}
            </button>
          </div>
          {aiError && <p className="mt-2 text-sm text-red-600">{aiError}</p>}
          {aiDraft && (
            <div className="mt-3 rounded-lg border border-brand-300 bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">Suggested draft — review before applying</p>
              <dl className="mt-2 space-y-1 text-sm text-slate-600">
                <div><dt className="inline font-medium text-slate-700">Role: </dt><dd className="inline">{aiDraft.role}</dd></div>
                <div><dt className="inline font-medium text-slate-700">Industry: </dt><dd className="inline">{aiDraft.industry}</dd></div>
                <div><dt className="inline font-medium text-slate-700">Location: </dt><dd className="inline">{aiDraft.location}</dd></div>
                <div><dt className="inline font-medium text-slate-700">Capabilities: </dt><dd className="inline">{aiDraft.capabilities.join(', ')}</dd></div>
                <div><dt className="inline font-medium text-slate-700">Needs: </dt><dd className="inline">{aiDraft.needs.join(', ')}</dd></div>
                <div><dt className="inline font-medium text-slate-700">Bio: </dt><dd className="inline">{aiDraft.description}</dd></div>
              </dl>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={applyDraft}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">Apply to form</button>
                <button type="button" onClick={() => setAiDraft(null)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Discard</button>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={saveProfile} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
          <div>
            <label htmlFor="visibility" className={labelClass}>Visibility</label>
            <select id="visibility" value={profileForm.visibility}
              onChange={event => setProfileForm(f => ({ ...f, visibility: event.target.value }))} className={fieldClass}>
              <option value="private">Private — nobody can contact me</option>
              <option value="discoverable">Discoverable — others can send connection requests</option>
            </select>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> Private profiles never appear to other users.
            </p>
          </div>
          <button type="submit" disabled={savingProfile}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {savingProfile ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Dna aria-hidden className="h-4 w-4" />}
            {savingProfile ? 'Saving…' : hasProfile ? 'Update my DNA' : 'Build my DNA'}
          </button>
        </form>
      </div>
    </main>
  );
}
