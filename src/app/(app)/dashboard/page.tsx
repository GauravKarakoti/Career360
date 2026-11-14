'use client';

import Link from 'next/link';
import { ChevronRight, Compass, Dna, MessagesSquare, Radar, Users } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';

type RoleCopy = { headline: string; sub: string; primary: { href: string; label: string }; focus: string[] };

const ROLE_COPY: Record<string, RoleCopy> = {
  Candidate: {
    headline: 'Find the roles that fit what you already know.',
    sub: 'Compare your skills with live requirements, bridge the gaps and track every application to a decision.',
    primary: { href: '/discover', label: 'Browse opportunities' },
    focus: ['Internships and jobs ranked by skill overlap', 'Skill Bridge flags what is missing', 'Application tracker from saved to selected'],
  },
  Startup: {
    headline: 'Find investors, mentors and your first customers.',
    sub: 'Your DNA states what you offer and what you need — matches explain the mutual value on both sides.',
    primary: { href: '/discover', label: 'Find investors & partners' },
    focus: ['Investor and accelerator listings with sources', 'Mutual Match explains why both sides benefit', 'Track every lead from identified to committed'],
  },
  Recruiter: {
    headline: 'Reach talent whose capabilities match your openings.',
    sub: 'Publish roles with evidence-backed requirements and connect with discoverable profiles.',
    primary: { href: '/discover', label: 'Publish a role' },
    focus: ['Listings with verbatim source evidence', 'Ranked candidate-side skill overlap', 'Accept requests and start conversations'],
  },
  Creator: {
    headline: 'Find brands that need your audience.',
    sub: 'Sponsorships and collaborations ranked by audience fit, with the brand side explained too.',
    primary: { href: '/discover', label: 'Find sponsorships' },
    focus: ['Brand and event collaborations', 'TruthLens evidence on every listing', 'Campaign tracker built in'],
  },
  Business: {
    headline: 'Find customers, suppliers and distribution.',
    sub: 'Post what you sell and what you need — the matchmaker surfaces complementary businesses.',
    primary: { href: '/discover', label: 'Find leads & suppliers' },
    focus: ['Sales leads and supplier discovery', 'Resource Exchange for what you lack', 'Lead tracker from contact to conversion'],
  },
  'Event organiser': {
    headline: 'Find sponsors, speakers and collaborators.',
    sub: 'List your event once; brands and creators see a verified, evidence-backed opportunity.',
    primary: { href: '/dna', label: 'Build your event DNA' },
    focus: ['Sponsor and speaker discovery', 'Audience-compatibility matching', 'Partnership tracking'],
  },
  'Sponsor / Brand': {
    headline: 'Find events and creators worth your budget.',
    sub: 'Compare audiences, check sources with TruthLens, then reach out in one click.',
    primary: { href: '/discover', label: 'Find events & creators' },
    focus: ['Event discovery with verification status', 'Creator audience matching', 'Sponsorship pipeline tracking'],
  },
};

const FALLBACK = ROLE_COPY.Candidate;

export default function DashboardPage() {
  const { hasProfile, savedCount, opportunities, primaryRole, email, t } = useWorkspace();
  const copy = (primaryRole && ROLE_COPY[primaryRole]) || FALLBACK;
  const roleLabel = primaryRole ?? 'Opportunity seeker';

  const sections = [
    {
      href: '/dna', icon: Dna, title: 'Opportunity DNA',
      done: hasProfile,
      body: hasProfile
        ? 'Your DNA is built. Update your capabilities, needs and goals any time to sharpen matches.'
        : 'Tell the platform what you offer and what you need. This is the intelligence layer behind every match.',
    },
    {
      href: '/discover', icon: Radar, title: 'Discover',
      done: savedCount > 0,
      body: `${opportunities.length} opportunities in the feed, ${savedCount} saved. Ranked by mutual match, with why-this-match explanations.`,
    },
    {
      href: '/connections', icon: MessagesSquare, title: 'Connections',
      done: false,
      body: 'Send and answer collaboration requests, then continue the conversation in threads.',
    },
    {
      href: '/trackers', icon: Users, title: 'Trackers',
      done: false,
      body: 'Turn any listing into a tracked lead: identified, applied, in conversation, committed, closed.',
    },
    {
      href: '/pulse', icon: Compass, title: 'Market Pulse',
      done: false,
      body: 'Discovery intent versus achieved outcomes across the last 30 days — counted, not estimated.',
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          Career360 · {roleLabel} dashboard
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {copy.headline}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">{copy.sub}</p>
        {!hasProfile && (
          <p className="mt-4 inline-flex rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
            First step: build your Opportunity DNA — every match depends on it.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={hasProfile ? copy.primary.href : '/dna'}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {hasProfile ? copy.primary.label : 'Build my Opportunity DNA'} <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/pulse"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            See Market Pulse
          </Link>
        </div>
        <ul className="mt-6 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          {copy.focus.map(item => (
            <li key={item} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200">
              <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Workspace sections" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(entry => (
          <Link key={entry.href} href={entry.href}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow">
            <div className="flex items-center justify-between">
              <entry.icon aria-hidden className="h-5 w-5 text-brand-600" />
              {entry.done && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Started
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

      <p className="mt-6 text-center text-xs text-slate-400">Signed in as {email} · role {roleLabel}</p>
    </main>
  );
}
