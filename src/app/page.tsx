import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Compass,
  Dna,
  FileCheck2,
  Globe,
  Megaphone,
  Mic,
  Radar,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { signedInAccount } from '@/lib/session';

export const metadata = {
  title: 'Career360 | From information to opportunity to action',
  description:
    'Build your Opportunity DNA, discover complementary opportunities from the web and workspace with source evidence, and turn matches into tracked outcomes.',
};

const ROLES = [
  {
    icon: Briefcase,
    role: 'Candidate',
    copy: 'Internships, jobs, hackathons and fellowships ranked by skill overlap, with capability gaps bridged for you.',
    discover: ['Jobs & internships', 'Events & hackathons', 'Funding & fellowships', 'Collaborations', 'Learning'],
    post: ['Collaborations', 'Learning'],
  },
  {
    icon: Trophy,
    role: 'Startup',
    copy: 'Investors, accelerators, mentors, early customers and technical talent — mutual value explained on both sides.',
    discover: ['Funding & grants', 'Partnerships', 'Collaborations', 'Events', 'Talent profiles'],
    post: ['Jobs & internships', 'Partnerships', 'Collaborations', 'Events'],
  },
  {
    icon: Users,
    role: 'Recruiter',
    copy: 'Publish openings with verbatim source evidence and reach discoverable candidates whose DNA matches your stack.',
    discover: ['Discoverable candidate DNA', 'Hiring events', 'Skill-bridge cohorts'],
    post: ['Jobs & internships', 'Learning'],
  },
  {
    icon: Megaphone,
    role: 'Creator',
    copy: 'Brand sponsorships, event speaking slots and creator collaborations matched to your niche and audience.',
    discover: ['Brand sponsorships', 'Events', 'Partnerships', 'Collaborations'],
    post: ['Collaborations', 'Partnerships', 'Events', 'Learning'],
  },
  {
    icon: Building2,
    role: 'Business',
    copy: 'Sales leads, suppliers, B2B distribution partners and RFPs matched to what you sell and what you lack.',
    discover: ['Partnerships & RFPs', 'Suppliers & vendors', 'Collaborations', 'Events'],
    post: ['Partnerships', 'Jobs & internships', 'Collaborations', 'Funding'],
  },
  {
    icon: CalendarDays,
    role: 'Event organiser',
    copy: 'List hackathons, conferences and meetups once; sponsors, speakers and attendees see a verified, source-backed event.',
    discover: ['Sponsors & brands', 'Speakers & creators', 'Community partners'],
    post: ['Events', 'Partnerships', 'Collaborations'],
  },
  {
    icon: Mic,
    role: 'Sponsor / Brand',
    copy: 'Compare events, creators and grant programs with TruthLens source verification, then reach out in one click.',
    discover: ['Verified events', 'Creator collaborations', 'Startup partnerships'],
    post: ['Funding', 'Partnerships', 'Collaborations', 'Events'],
  },
];

const PILLARS = [
  {
    icon: Radar,
    title: 'Discover (Web + Workspace)',
    body: 'Once you build your DNA, Career360 fetches matching jobs, hackathons, sponsorships, grants and collaborations from the live web and workspace database.',
  },
  {
    icon: Dna,
    title: 'Mutual Intelligence',
    body: 'Opportunity DNA structures what you offer and what you need. The matchmaker explains why a connection works for both sides — never a bare percentage.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Scoped & Source-Verified',
    body: 'TruthLens verifies verbatim source quotes on every listing, and role-based publishing ensures recruiters post jobs, organisers post events, and candidates post peer collaborations.',
  },
];

const PREVIEW_DNA = {
  capabilities: ['TypeScript', 'Next.js App Router', 'REST & Postgres', 'Hindi / English'],
  needs: ['Product engineering role', 'Direct founder mentorship'],
  gaps: ['Production pgvector tuning'],
};

export default async function LandingPage() {
  const account = await signedInAccount().catch(() => null);
  if (account) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-10 flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Dna aria-hidden className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">Career360</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/signin"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200 bg-canvas">
          <div className="mx-10 px-4 py-14 sm:px-6 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Column: Hero Copy & CTAs */}
              <div className="min-w-0 lg:col-span-7">
                <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700 ring-1 ring-inset ring-brand-200">
                  Career360 AI · multilingual
                </p>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-heading sm:text-5xl">
                  Find the people who need what you offer.
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                  Build your Opportunity DNA once. Career360 automatically fetches matching opportunities
                  from the internet and our verified workspace database — then explains the mutual fit
                  and skill bridges in English or हिंदी.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-[10px] bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700"
                  >
                    Create my free account <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/signin"
                    className="inline-flex items-center gap-2 rounded-[10px] bg-white px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 hover:text-ink"
                  >
                    I already have an account
                  </Link>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Free during the pilot · your data stays in your private workspace
                </p>
              </div>

              {/* Right Column: Live Workspace Preview Card */}
              <div
                aria-label="Opportunity workspace preview"
                className="min-w-0 lg:col-span-5"
              >
                <div className="rounded-[10px] border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-900/[0.05] sm:p-6">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
                        <Dna aria-hidden className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Opportunity DNA → Web &amp; DB Match</p>
                        <p className="text-[11px] text-slate-500">Candidate ↔ Seed Startup</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                      Demo · fictional
                    </span>
                  </div>

                  {/* DNA Capabilities & Needs */}
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        What you offer (Capabilities)
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {PREVIEW_DNA.capabilities.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md bg-brand-50/80 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200/60"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200/80 bg-canvas p-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          What you need
                        </p>
                        <ul className="mt-1 space-y-1 text-xs font-medium text-slate-700">
                          {PREVIEW_DNA.needs.map((item) => (
                            <li key={item} className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                          Skill gap flagged
                        </p>
                        <p className="mt-1 text-xs font-medium text-amber-900">
                          {PREVIEW_DNA.gaps[0]}
                        </p>
                        <p className="mt-0.5 text-[11px] text-amber-700">
                          Bridged via free learning link
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Why This Match Card */}
                  <div className="mt-4 rounded-[10px] border border-brand-200/80 bg-brand-50/40 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700">
                        <Sparkles aria-hidden className="h-3.5 w-3.5" />
                        Why this match works for both sides
                      </span>
                      <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                        4/4 core needs met
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                      <strong className="font-semibold text-slate-900">Founding Full-Stack Fellow</strong>{' '}
                      needs your TypeScript &amp; Next.js stack plus Hindi/English fluency for user
                      research, and offers direct founder mentorship.
                    </p>
                  </div>

                  {/* TruthLens Verification Footer */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                      <FileCheck2 aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      TruthLens: Live web &amp; source verified
                    </span>
                    <span className="font-medium text-slate-600">
                      Tracker: <strong className="text-slate-900">Saved → Shortlisted</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="How it works" className="border-y border-slate-200 bg-white">
          <div className="mx-10 grid gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
            {PILLARS.map((pillar, index) => (
              <div
                key={pillar.title}
                className="rounded-[10px] border border-slate-200 bg-canvas p-6 shadow-sm shadow-slate-900/[0.03]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-brand-600 text-white shadow-sm shadow-brand-600/30">
                  <pillar.icon aria-hidden className="h-5 w-5" />
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Step {index + 1}
                </p>
                <h2 className="mt-1 text-lg font-bold">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{pillar.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-10 px-4 py-16 sm:px-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h2 className="max-w-xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                One platform, seven kinds of ambition.
              </h2>
              <p className="mt-2 max-w-2xl text-base text-slate-600">
                Choose your role at sign-up. Every role can discover across the entire live feed, while
                publishing and TruthLens source extraction are tailored to what your role genuinely offers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1.5 font-semibold text-brand-800">
                <Globe aria-hidden className="h-4 w-4 text-brand-600" />
                Auto-synced from the internet + workspace DB
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">Cached &amp; scored against your DNA</span>
            </div>
          </div>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((entry) => (
              <li
                key={entry.role}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
                      <entry.icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      {entry.role}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900">{entry.role}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{entry.copy}</p>
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3.5">
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                      <Compass aria-hidden className="h-3.5 w-3.5" /> Can discover
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {entry.discover.map((item) => (
                        <span
                          key={item}
                          className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-inset ring-sky-200/80"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                      <Send aria-hidden className="h-3.5 w-3.5" /> Can post &amp; extract
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {entry.post.map((item) => (
                        <span
                          key={item}
                          className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200/80"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-slate-200 bg-slate-900">
          <div className="mx-10 px-4 py-16 text-center sm:px-6">
            <h2
              style={{ color: '#ffffff' }}
              className="text-2xl font-bold tracking-tight !text-white sm:text-3xl"
            >
              Your next opportunity is a profile away.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-300">
              Build your Opportunity DNA in five minutes. Matches from the web and workspace update the
              moment the market moves.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Get started free <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <CheckCircle2 aria-hidden className="h-4 w-4" /> User submissions stay unverified until
              sourced
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6">
        <p className="mx-10 px-4 text-center text-xs text-slate-500 sm:px-6">
          Career360 - From information to opportunity to action.
        </p>
      </footer>
    </div>
  );
}