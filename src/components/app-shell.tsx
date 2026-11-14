'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle, CheckCircle2, Building2, Dna, LayoutDashboard, Loader2, MessagesSquare,
  Radar, Users,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { LANGS } from '@/lib/client-api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dna', label: 'Opportunity DNA', icon: Dna },
  { href: '/discover', label: 'Discover', icon: Radar },
  { href: '/connections', label: 'Connections', icon: MessagesSquare },
  { href: '/trackers', label: 'Trackers', icon: Users },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/pulse', label: 'Market Pulse', icon: Radar },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    loading, error, notice, lang, setLang, t,
    email, primaryRole, signOut,
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
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Dna aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-bold text-slate-900">Career360</span>
                <span className="block text-xs text-slate-500">From information to opportunity to action</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {email && (
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="max-w-[16rem] truncate">{email}</span>
                  {primaryRole && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                      {primaryRole}
                    </span>
                  )}
                </span>
              )}
              <button type="button" onClick={() => setLang(lang === 'en' ? 'hi' : lang === 'hi' ? 'mr' : 'en')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50" aria-label="Switch language">
                {LANGS[(LANGS.findIndex(l => l.id === lang) + 1) % LANGS.length].label}
              </button>
              {email ? (
                <button type="button" onClick={signOut}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  {t('Sign out', 'साइन आउट')}
                </button>
              ) : (
                <Link href="/signin"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                  {t('Sign in', 'साइन इन')}
                </Link>
              )}
            </div>
          </div>
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
          Demo listings are explicitly fictional and labelled. User submissions are unverified. Your workspace is private to your account.
        </p>
      </footer>
    </div>
  );
}
