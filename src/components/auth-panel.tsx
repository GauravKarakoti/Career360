'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, type Lang } from '@/lib/client-api';

export function AuthPanel({ lang, onAuthed, onError }: {
  lang: Lang;
  onAuthed: (email: string) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'recover'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryIssued, setRecoveryIssued] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); onError('');
    try {
      if (mode === 'signup') {
        const result = await api<{ email: string; recoveryCode: string }>('/api/auth/sign-up', {
          method: 'POST', body: JSON.stringify({ email, password })
        });
        setRecoveryIssued(result.recoveryCode);
        await onAuthed(result.email);
      } else if (mode === 'signin') {
        const result = await api<{ email: string }>('/api/auth/sign-in', {
          method: 'POST', body: JSON.stringify({ email, password })
        });
        await onAuthed(result.email);
      } else {
        const result = await api<{ recoveryCode: string }>('/api/auth/recover', {
          method: 'POST', body: JSON.stringify({ email, recoveryCode, password })
        });
        setRecoveryIssued(result.recoveryCode);
        setMode('signin');
      }
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Authentication failed.');
    } finally { setBusy(false); }
  };

  const labels = {
    signin: { title: 'Sign in', action: 'Sign in', switch: 'New here? Create an account' },
    signup: { title: 'Create account', action: 'Create account', switch: 'Already registered? Sign in' },
    recover: { title: 'Reset password', action: 'Reset with recovery code', switch: 'Back to sign in' },
  }[mode];

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{labels.title}</h2>
          <button type="button" onClick={() => setMode(mode === 'recover' ? 'signin' : 'recover')}
            className="text-xs font-medium text-brand-700 hover:underline">
            {mode === 'recover' ? 'Back to sign in' : 'Forgot password?'}
          </button>
        </div>
        {recoveryIssued && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
            Save this recovery code now — it is shown only once: <strong className="font-mono">{recoveryIssued}</strong>
          </p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700">Email</label>
            <input id="auth-email" type="email" required autoComplete="email" value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border-slate-300 text-sm" />
          </div>
          {mode === 'recover' && (
            <div>
              <label htmlFor="auth-code" className="block text-xs font-medium text-slate-700">Recovery code</label>
              <input id="auth-code" required value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)}
                className="mt-1 w-full rounded-lg border-slate-300 font-mono text-sm" placeholder="XXXX-XXXX-XXXX" />
            </div>
          )}
          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700">
              {mode === 'recover' ? 'New password' : 'Password'}
            </label>
            <input id="auth-password" type="password" required minLength={10} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password} onChange={event => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border-slate-300 text-sm" />
            {mode !== 'signin' && <p className="mt-1 text-xs text-slate-500">At least 10 characters.</p>}
          </div>
          <button type="submit" disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} {labels.action}
          </button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); onError(''); }}
          className="mt-3 text-xs font-medium text-slate-600 hover:underline">
          {labels.switch}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          {lang === 'en'
            ? 'No email is sent. Recovery uses the one-time code shown at sign-up.'
            : 'कोई ईमेल नहीं भेजा जाता। रिकवरी साइन-अप पर दिखाए गए वन-टाइम कोड से होती है।'}
        </p>
      </div>
    </div>
  );
}
