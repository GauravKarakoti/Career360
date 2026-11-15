'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/client-api';
import { roles } from '@/lib/validation';

const ROLE_BLURBS: Record<string, string> = {
  Candidate: 'Internships, jobs and skill gaps',
  Startup: 'Investors, mentors and co-founders',
  Recruiter: 'Publish roles, reach matching talent',
  Creator: 'Sponsorships and brand collaborations',
  Business: 'Customers, suppliers and partners',
  'Event organiser': 'Sponsors, speakers and vendors',
  'Sponsor / Brand': 'Events and creators worth your budget',
};

const inputClass = 'mt-1 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

export function SignUpForm() {
  const router = useRouter();
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      role: String(data.get('role') ?? ''),
    };
    if (!payload.role) { setError('Choose your role to continue.'); return; }
    setBusy(true); setError('');
    try {
      const result = await api<{ recoveryCode: string; email: string }>('/api/auth/sign-up', {
        method: 'POST', body: JSON.stringify(payload),
      });
      setRecoveryCode(result.recoveryCode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-up failed.');
      setBusy(false);
    }
  }

  if (recoveryCode) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account created</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This is your account recovery code. It is shown <strong>only once</strong> - store it somewhere safe.
          It is the only way to recover access if you forget your password.
        </p>
        <p className="mt-4 select-all rounded-xl bg-slate-900 px-4 py-3 text-center font-mono text-lg tracking-widest text-white">
          {recoveryCode}
        </p>
        <button type="button" onClick={() => router.replace('/dashboard')}
          className="mt-6 w-full rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Go to my dashboard
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">Pick the role that fits you best - your dashboard adapts to it.</p>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-900">I am a…</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {roles.map(role => (
            <label key={role}
              className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-inset has-checked:ring-brand-600">
              <input type="radio" name="role" value={role} className="mt-0.5 h-4 w-4 accent-brand-600" />
              <span>
                <span className="block font-semibold text-slate-900">{role}</span>
                <span className="block text-xs text-slate-500">{ROLE_BLURBS[role]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3">
        <label className="block text-sm font-semibold text-slate-900">
          Email
          <input type="email" name="email" required autoComplete="email" defaultValue=""
            className={inputClass} />
        </label>
        <label className="block text-sm font-semibold text-slate-900">
          Password <span className="font-normal text-slate-500">(at least 8 characters)</span>
          <input type="password" name="password" required minLength={8} autoComplete="new-password" defaultValue=""
            className={inputClass} />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-inset ring-red-200">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <button type="submit" disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Create account
      </button>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account? <Link href="/signin" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'sign-in' | 'recover'>('sign-in');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const destination = next && next.startsWith('/') ? next : '/dashboard';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      if (mode === 'sign-in') {
        await api('/api/auth/sign-in', {
          method: 'POST',
          body: JSON.stringify({ email: String(data.get('email') ?? ''), password: String(data.get('password') ?? '') }),
        });
        router.replace(destination);
      } else {
        await api('/api/auth/recover', {
          method: 'POST',
          body: JSON.stringify({
            email: String(data.get('email') ?? ''),
            recoveryCode: String(data.get('recoveryCode') ?? ''),
            newPassword: String(data.get('password') ?? ''),
          }),
        });
        window.location.assign(destination);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in to your Opportunity DNA, saved items and trackers.</p>

      <div className="mt-5 grid gap-3">
        <label className="block text-sm font-semibold text-slate-900">
          Email
          <input type="email" name="email" required autoComplete="email" defaultValue="" className={inputClass} />
        </label>
        {mode === 'sign-in' ? (
          <label className="block text-sm font-semibold text-slate-900">
            Password
            <input type="password" name="password" required autoComplete="current-password" defaultValue="" className={inputClass} />
          </label>
        ) : (
          <>
            <label className="block text-sm font-semibold text-slate-900">
              Recovery code
              <input type="text" name="recoveryCode" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-normal text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </label>
            <label className="block text-sm font-semibold text-slate-900">
              New password
              <input type="password" name="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </label>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-inset ring-red-200">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <button type="submit" disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
        {mode === 'sign-in' ? 'Sign in' : 'Reset password'}
      </button>
      <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'recover' : 'sign-in'); setError(''); }}
        className="mt-3 w-full text-sm font-semibold text-brand-700 hover:underline">
        {mode === 'sign-in' ? 'Forgot your password? Use a recovery code' : 'Back to sign in'}
      </button>
      <p className="mt-4 text-sm text-slate-600">
        New here? <Link href="/signup" className="font-semibold text-brand-700 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
