'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink } from 'lucide-react';
import type { MatchResult, Opportunity } from '@/lib/client-api';

export const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500';
export const labelClass = 'block text-sm font-medium text-slate-700';

export function Chip({ label, tone }: { label: string; tone: 'offer' | 'need' | 'gap' }) {
  const tones = {
    offer: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    need: 'bg-sky-50 text-sky-700 ring-sky-200',
    gap: 'bg-amber-50 text-amber-700 ring-amber-200',
  } as const;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{label}</span>;
}

export function MatchPanel({ match }: { match: MatchResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700">
        <span>Why this match — {match.forYou.length + match.forThem.length} complementary connections</span>
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 px-3 py-3 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-700">What you can get</p>
            {match.forYou.length
              ? <ul className="mt-1 list-disc space-y-0.5 pl-4">{match.forYou.map(item => <li key={item}>{item}</li>)}</ul>
              : <p className="mt-1 italic">Nothing they offer matches your stated needs yet.</p>}
          </div>
          <div>
            <p className="font-semibold text-slate-700">What you can give</p>
            {match.forThem.length
              ? <ul className="mt-1 list-disc space-y-0.5 pl-4">{match.forThem.map(item => <li key={item}>{item}</li>)}</ul>
              : <p className="mt-1 italic">Nothing you offer matches their requirements yet.</p>}
          </div>
          {match.missing.length > 0 && (
            <div>
              <p className="font-semibold text-slate-700">Gaps to bridge</p>
              <div className="mt-1 flex flex-wrap gap-1.5">{match.missing.map(item => <Chip key={item} label={item} tone="gap" />)}</div>
            </div>
          )}
          <p className="text-slate-500">
            Rule-based scoring — {match.weights.needs}% your needs × their offers, {match.weights.capabilities}% your
            capabilities × their requirements, {match.weights.industry}% industry fit, {match.weights.location}% location fit.
          </p>
        </div>
      )}
    </div>
  );
}

export function OpportunityCard({ item, saved, onToggleSave, onTrack }: {
  item: Opportunity; saved: boolean; onToggleSave: (id: string) => void; onTrack: (item: Opportunity) => void;
}) {
  const trustLabel = item.isDemo ? 'Demo · fictional' : `Unverified · ${item.trust}`;
  const trustTone = item.isDemo
    ? 'bg-violet-50 text-violet-700 ring-violet-200'
    : item.trust === 'Expired'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-slate-100 text-slate-600 ring-slate-300';
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{item.organization} · {item.category} · {item.location}</p>
        </div>
        {item.match && (
          <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
            {item.match.score}% match
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${trustTone}`}>{trustLabel}</span>
        {item.match?.location && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Location fit</span>}
        {item.match?.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Industry fit</span>}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.description}</p>
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-emerald-700">Offers:</span>
          {item.offers.map(label => <Chip key={label} label={label} tone="offer" />)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-sky-700">Looking for:</span>
          {item.requirements.map(label => <Chip key={label} label={label} tone="need" />)}
        </div>
      </div>
      {item.match && <MatchPanel match={item.match} />}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onToggleSave(item.id)} aria-pressed={saved}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
            saved ? 'bg-brand-50 text-brand-700 ring-brand-300' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
          }`}>
          {saved ? <BookmarkCheck aria-hidden className="h-4 w-4" /> : <Bookmark aria-hidden className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" onClick={() => onTrack(item)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          Track
        </button>
        {item.sourceUrl && (
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Source <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}
