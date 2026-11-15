'use client';

import Link from 'next/link';
import { ChevronRight, Compass, Dna, MessagesSquare, Radar, Users } from 'lucide-react';
import { type MsgKey } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';

type RoleKeyConfig = {
  labelKey: MsgKey;
  headlineKey: MsgKey;
  subKey: MsgKey;
  primaryHref: string;
  primaryLabelKey: MsgKey;
  focusKeys: [MsgKey, MsgKey, MsgKey];
};

const ROLE_CONFIG: Record<string, RoleKeyConfig> = {
  Candidate: {
    labelKey: 'dashboard.role.Candidate.label',
    headlineKey: 'dashboard.role.Candidate.headline',
    subKey: 'dashboard.role.Candidate.sub',
    primaryHref: '/discover',
    primaryLabelKey: 'dashboard.role.Candidate.primary',
    focusKeys: [
      'dashboard.role.Candidate.focus1',
      'dashboard.role.Candidate.focus2',
      'dashboard.role.Candidate.focus3',
    ],
  },
  Startup: {
    labelKey: 'dashboard.role.Startup.label',
    headlineKey: 'dashboard.role.Startup.headline',
    subKey: 'dashboard.role.Startup.sub',
    primaryHref: '/discover',
    primaryLabelKey: 'dashboard.role.Startup.primary',
    focusKeys: [
      'dashboard.role.Startup.focus1',
      'dashboard.role.Startup.focus2',
      'dashboard.role.Startup.focus3',
    ],
  },
  Recruiter: {
    labelKey: 'dashboard.role.Recruiter.label',
    headlineKey: 'dashboard.role.Recruiter.headline',
    subKey: 'dashboard.role.Recruiter.sub',
    primaryHref: '/discover',
    primaryLabelKey: 'dashboard.role.Recruiter.primary',
    focusKeys: [
      'dashboard.role.Recruiter.focus1',
      'dashboard.role.Recruiter.focus2',
      'dashboard.role.Recruiter.focus3',
    ],
  },
  Creator: {
    labelKey: 'dashboard.role.Creator.label',
    headlineKey: 'dashboard.role.Creator.headline',
    subKey: 'dashboard.role.Creator.sub',
    primaryHref: '/discover',
    primaryLabelKey: 'dashboard.role.Creator.primary',
    focusKeys: [
      'dashboard.role.Creator.focus1',
      'dashboard.role.Creator.focus2',
      'dashboard.role.Creator.focus3',
    ],
  },
  Business: {
    labelKey: 'dashboard.role.Business.label',
    headlineKey: 'dashboard.role.Business.headline',
    subKey: 'dashboard.role.Business.sub',
    primaryHref: '/discover',
    primaryLabelKey: 'dashboard.role.Business.primary',
    focusKeys: [
      'dashboard.role.Business.focus1',
      'dashboard.role.Business.focus2',
      'dashboard.role.Business.focus3',
    ],
  },
  'Event organiser': {
    labelKey: 'dashboard.role.EventOrganiser.label',
    headlineKey: 'dashboard.role.EventOrganiser.headline',
    subKey: 'dashboard.role.EventOrganiser.sub',
    primaryHref: '/dna',
    primaryLabelKey: 'dashboard.role.EventOrganiser.primary',
    focusKeys: [
      'dashboard.role.EventOrganiser.focus1',
      'dashboard.role.EventOrganiser.focus2',
      'dashboard.role.EventOrganiser.focus3',
    ],
  },
  'Sponsor / Brand': {
    labelKey: 'dashboard.role.SponsorBrand.label',
    headlineKey: 'dashboard.role.SponsorBrand.headline',
    subKey: 'dashboard.role.SponsorBrand.sub',
    primaryHref: '/discover',
    primaryLabelKey: 'dashboard.role.SponsorBrand.primary',
    focusKeys: [
      'dashboard.role.SponsorBrand.focus1',
      'dashboard.role.SponsorBrand.focus2',
      'dashboard.role.SponsorBrand.focus3',
    ],
  },
};

const FALLBACK = ROLE_CONFIG.Candidate;

export default function DashboardPage() {
  const { hasProfile, savedCount, opportunities, primaryRole, email, t } = useWorkspace();
  const config = (primaryRole && ROLE_CONFIG[primaryRole]) || FALLBACK;
  const roleLabel = primaryRole && ROLE_CONFIG[primaryRole]
    ? t(ROLE_CONFIG[primaryRole].labelKey)
    : t('dashboard.defaultRole');

  const sections = [
    {
      href: '/dna',
      icon: Dna,
      title: t('dashboard.sec.dna.title'),
      done: hasProfile,
      body: hasProfile ? t('dashboard.sec.dna.doneBody') : t('dashboard.sec.dna.todoBody'),
    },
    {
      href: '/discover',
      icon: Radar,
      title: t('dashboard.sec.discover.title'),
      done: savedCount > 0,
      body: `${opportunities.length} ${t('dashboard.sec.discover.inFeed')} ${savedCount} ${t('dashboard.sec.discover.saved')} ${t('dashboard.sec.discover.bodySuffix')}`,
    },
    {
      href: '/connections',
      icon: MessagesSquare,
      title: t('dashboard.sec.connections.title'),
      done: false,
      body: t('dashboard.sec.connections.body'),
    },
    {
      href: '/trackers',
      icon: Users,
      title: t('dashboard.sec.trackers.title'),
      done: false,
      body: t('dashboard.sec.trackers.body'),
    },
    {
      href: '/pulse',
      icon: Compass,
      title: t('dashboard.sec.pulse.title'),
      done: false,
      body: t('dashboard.sec.pulse.body'),
    },
  ];

  return (
    <main className="mx-10 px-4 py-8 sm:px-6">
      <section className="rounded-[10px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/[0.03] sm:p-10">
        <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700 ring-1 ring-inset ring-brand-200">
          Career360 · {roleLabel} {t('dashboard.badgeSuffix')}
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">
          {t(config.headlineKey)}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          {t(config.subKey)}
        </p>
        {!hasProfile && (
          <p className="mt-4 inline-flex rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
            {t('dashboard.firstStep')}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={hasProfile ? config.primaryHref : '/dna'}
            className="inline-flex items-center gap-2 rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 transition hover:bg-brand-700"
          >
            {hasProfile ? t(config.primaryLabelKey) : t('dashboard.buildDnaCta')}{' '}
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link
            href="/pulse"
            className="inline-flex items-center gap-2 rounded-[10px] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 hover:text-ink"
          >
            {t('dashboard.seePulse')}
          </Link>
        </div>
        <ul className="mt-6 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          {config.focusKeys.map((key) => (
            <li
              key={key}
              className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200"
            >
              <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {t(key)}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Workspace sections" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <entry.icon aria-hidden className="h-5 w-5 text-brand-600" />
              {entry.done && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {t('dashboard.started')}
                </span>
              )}
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-900">{entry.title}</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{entry.body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:underline">
              {t('dashboard.open')} <ChevronRight aria-hidden className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>

      <p className="mt-6 text-center text-xs text-slate-400">
        {t('dashboard.signedInAs')} {email} · {t('dashboard.rolePrefix')} {roleLabel}
      </p>
    </main>
  );
}