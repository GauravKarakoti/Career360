'use client';

import Link from 'next/link';
import { ChevronRight, Compass, Dna, MessagesSquare, Radar, Users } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';

export default function OverviewPage() {
  const { hasProfile, savedCount, opportunities, t } = useWorkspace();

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
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Career360 · Your next action</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Find the people who need what you offer.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Build your Opportunity DNA, explore complementary matches and understand what to do next.
          Search in English, हिंदी or Hinglish, with source evidence alongside each recommendation.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={hasProfile ? '/discover' : '/dna'}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {hasProfile ? 'Browse matches' : 'Build my Opportunity DNA'} <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/pulse"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            See Market Pulse
          </Link>
        </div>
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
              {t('Open', 'खोलें')} <ChevronRight aria-hidden className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
