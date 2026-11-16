'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle, CheckCircle2, Building2, Dna, Handshake, LayoutDashboard, Loader2, MessageCircle,
  Radar, Users,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { LANGS, type MsgKey } from '@/lib/client-api';

const NAV: { href: string; labelKey: MsgKey; icon: typeof LayoutDashboard }[] = [
  { href: '/dashboard', labelKey: 'shell.nav.dashboard', icon: LayoutDashboard },
  { href: '/dna', labelKey: 'shell.nav.dna', icon: Dna },
  { href: '/discover', labelKey: 'discover.title', icon: Radar },
  { href: '/connections', labelKey: 'connections.title', icon: Handshake },
  { href: '/messages', labelKey: 'shell.nav.messages', icon: MessageCircle },
  { href: '/trackers', labelKey: 'trackers.title', icon: Users },
  { href: '/organizations', labelKey: 'orgs.title', icon: Building2 },
  { href: '/pulse', labelKey: 'pulse.title', icon: Radar },
];

const ROLE_LABEL_KEYS: Record<string, MsgKey> = {
  Candidate: 'dashboard.role.Candidate.label',
  Startup: 'dashboard.role.Startup.label',
  Recruiter: 'dashboard.role.Recruiter.label',
  Creator: 'dashboard.role.Creator.label',
  Business: 'dashboard.role.Business.label',
  'Event organiser': 'dashboard.role.EventOrganiser.label',
  'Sponsor / Brand': 'dashboard.role.SponsorBrand.label',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    loading, error, notice, lang, setLang, t,
    email, primaryRole, signOut, unreadMessages,
  } = useWorkspace();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-slate-500">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> {t('shell.loading')}
      </div>
    );
  }

  const nextLang = LANGS[(LANGS.findIndex((l) => l.id === lang) + 1) % LANGS.length];
  const translatedRole = primaryRole
    ? (ROLE_LABEL_KEYS[primaryRole] ? t(ROLE_LABEL_KEYS[primaryRole]) : primaryRole)
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-600 text-white shadow-sm shadow-brand-600/30">
                <Dna aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-bold tracking-tight text-heading">Career360</span>
                <span className="block text-xs text-slate-500">{t('shell.tagline')}</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {email && (
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="max-w-[16rem] truncate">{email}</span>
                  {translatedRole && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                      {translatedRole}
                    </span>
                  )}
                </span>
              )}
              <button
                type="button"
                onClick={() => setLang(nextLang.id)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                aria-label={t('shell.switchLang')}
              >
                {nextLang.label}
              </button>
              {email ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                >
                  {t('shell.signOut')}
                </button>
              ) : (
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  {t('shell.signIn')}
                </Link>
              )}
            </div>
          </div>
          <nav aria-label="Main" className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {NAV.map((entry) => {
              const active = pathname === entry.href;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                  }`}
                >
                  <entry.icon aria-hidden className={`h-4 w-4 ${active ? '' : 'text-slate-400'}`} />{' '}
                  {t(entry.labelKey)}
                  {entry.href === '/messages' && unreadMessages > 0 && (
                    <span
                      aria-label={t('messages.unreadLabel', { count: unreadMessages })}
                      className={`ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-5 ${
                        active ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'
                      }`}
                    >
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {(error || notice) && (
        <div className="mx-10 px-4 pt-4 sm:px-6" role="status" aria-live="polite">
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

      <div className="flex flex-1 flex-col pb-10">
        {children}
      </div>

      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <p className="mx-10 px-4 text-center text-xs text-slate-500 sm:px-6">
          {t('shell.footer')}
        </p>
      </footer>
    </div>
  );
}