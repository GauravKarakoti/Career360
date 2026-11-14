'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle, CheckCircle2, Compass, Dna, Loader2, MessagesSquare,
  Radar, RotateCcw, Users,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { AuthPanel } from '@/components/auth-panel';

const NAV = [
  { href: '/', label: 'Overview', icon: Compass },
  { href: '/dna', label: 'Opportunity DNA', icon: Dna },
  { href: '/discover', label: 'Discover', icon: Radar },
  { href: '/connections', label: 'Connections', icon: MessagesSquare },
  { href: '/trackers', label: 'Trackers', icon: Users },
  { href: '/pulse', label: 'Market Pulse', icon: Radar },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    loading, error, notice, setError, lang, setLang, t,
    email, savedCount, signOut, resetWorkspace, showAuth, setShowAuth,
  } = useWorkspace();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-slate-500">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> {t('Loading your workspace…', 'आपका वर्कस्पेस लोड हो रहा है…')}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Dna aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-bold text-slate-900">Career360</span>
                <span className="block text-xs text-slate-500">From information to opportunity to action</span>
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs text-slate-500">
                {email
                  ? t('Signed in as', 'साइन इन:') + ` ${email} · ${savedCount} ${t('saved', 'सहेजे')}`
                  : t('Private guest session', 'निजी अतिथि सत्र') + ` · ${savedCount} ${t('saved', 'सहेजे')}`}
              </span>
              <button type="button" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50" aria-label="Switch language">
                {lang === 'en' ? 'हिंदी' : 'English'}
              </button>
              {email ? (
                <button type="button" onClick={signOut}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  {t('Sign out', 'साइन आउट')}
                </button>
              ) : (
                <button type="button" onClick={() => setShowAuth(!showAuth)} aria-expanded={showAuth}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                  {t('Account', 'खाता')}
                </button>
              )}
              <button type="button" onClick={resetWorkspace}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                <RotateCcw aria-hidden className="h-4 w-4" /> {t('Reset', 'रीसेट')}
              </button>
            </div>
          </div>
          {showAuth && !email && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <AuthPanel lang={lang} onAuthed={async () => setShowAuth(false)} onError={setError} />
            </div>
          )}
          <nav aria-label="Main" className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {NAV.map(entry => {
              const active = pathname === entry.href;
              return (
                <Link key={entry.href} href={entry.href} aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  <entry.icon aria-hidden className="h-4 w-4" /> {entry.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {(error || notice) && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6" role="status" aria-live="polite">
          {error ? (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200">
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
            </p>
          )}
        </div>
      )}

      {children}

      <footer className="mt-10 border-t border-slate-200 bg-white py-6">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-500 sm:px-6">
          Demo listings are explicitly fictional and labelled. User submissions are unverified. Your data stays in a private guest session.
        </p>
      </footer>
    </div>
  );
}
