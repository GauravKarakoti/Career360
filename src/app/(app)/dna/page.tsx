'use client';

import { Dna, Loader2, ShieldCheck } from 'lucide-react';
import { ROLES } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';
import { fieldClass, labelClass } from '@/components/ui-bits';

export default function DnaPage() {
  const { profileForm, setProfileForm, hasProfile, savingProfile, saveProfile, t } = useWorkspace();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2">
          <Dna aria-hidden className="h-5 w-5 text-brand-600" />
          <h1 className="text-xl font-bold text-slate-900">{t('Your Opportunity DNA', 'आपका अवॉर्ट्यूनिटी DNA')}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {t('Describe what you offer and what you need. Matching is rule-based and fully transparent.',
            'बताएँ आप क्या देते हैं और क्या चाहते हैं। मैचिंग नियम-आधारित और पूरी तरह पारदर्शी है।')}
        </p>
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
