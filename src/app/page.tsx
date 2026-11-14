import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight, Building2, CalendarDays, CheckCircle2, Dna, Megaphone,
  Mic, Radar, ShieldCheck, Trophy, Users, Briefcase,
} from 'lucide-react';
import { signedInAccount } from '@/lib/session';

export const metadata = {
  title: 'Career360 | From information to opportunity to action',
  description: 'Build your Opportunity DNA, discover complementary opportunities with source evidence, and turn matches into tracked outcomes.',
};

const ROLES = [
  { icon: Briefcase, role: 'Candidate', copy: 'Internships and jobs ranked by skill overlap, with the gaps bridged for you.' },
  { icon: Trophy, role: 'Startup', copy: 'Investors, accelerators, mentors and your first customers — mutual value explained.' },
  { icon: Users, role: 'Recruiter', copy: 'Publish roles with evidence-backed requirements and reach matching talent.' },
  { icon: Megaphone, role: 'Creator', copy: 'Sponsorships and brand collaborations matched to your audience.' },
  { icon: Building2, role: 'Business', copy: 'Sales leads, suppliers and distribution partners for what you sell and lack.' },
  { icon: CalendarDays, role: 'Event organiser', copy: 'Sponsors, speakers and vendors see a verified, evidence-backed event.' },
  { icon: Mic, role: 'Sponsor / Brand', copy: 'Compare events and creators, check sources, then reach out in one click.' },
];

const PILLARS = [
  {
    icon: Radar, title: 'Discover',
    body: 'One feed across jobs, hackathons, sponsorships, grants, investors and freelance work — every listing with its source, date and verification status.',
  },
  {
    icon: Dna, title: 'Intelligence',
    body: 'Opportunity DNA structures what you offer and what you need. The matchmaker explains why a connection makes sense for both sides — never a bare percentage.',
  },
  {
    icon: ShieldCheck, title: 'Trust, verified',
    body: 'TruthLens shows the verbatim evidence behind every AI-drafted listing. Nothing publishes until a human reviews the sources.',
  },
];

export default async function LandingPage() {
  const account = await signedInAccount().catch(() => null);
  if (account) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Dna aria-hidden className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">Career360</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/signin" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Opportunity360 AI · multilingual
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Find the people who need what you offer.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
              Career360 understands what you can do, what you need and what you&apos;re missing — then connects
              you with the startups, recruiters, creators and events that complete the picture. In English,
              हिंदी or Hinglish.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
                Create my free account <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link href="/signin"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                I already have an account
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">Free during the pilot · your data stays in your private workspace</p>
          </div>
        </section>

        <section aria-label="How it works" className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
            {PILLARS.map((pillar, index) => (
              <div key={pillar.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
                  <pillar.icon aria-hidden className="h-5 w-5" />
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Step {index + 1}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{pillar.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="max-w-xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            One platform, seven kinds of ambition.
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Choose your role at sign-up — your dashboard, matches and first actions adapt to it. You can hold
            multiple roles on one account.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map(entry => (
              <li key={entry.role} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <entry.icon aria-hidden className="h-5 w-5 text-brand-600" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">{entry.role}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{entry.copy}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-slate-200 bg-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Your next opportunity is a profile away.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-300">
              Build your Opportunity DNA in five minutes. Matches update the moment the market moves.
            </p>
            <Link href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Get started free <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <CheckCircle2 aria-hidden className="h-4 w-4" /> Demo listings are labelled fictional · user submissions stay unverified until sourced
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-500 sm:px-6">
          Career360 — From information to opportunity to action.
        </p>
      </footer>
    </div>
  );
}
