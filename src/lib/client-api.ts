// Shared client-side types, fetch helper and labels for the workspace pages.

export const ROLES = ['Startup', 'Candidate', 'Recruiter', 'Creator', 'Business', 'Event organiser', 'Sponsor / Brand'] as const;
export const CATEGORIES = ['Partnerships', 'Funding', 'Jobs & internships', 'Events', 'Collaborations', 'Learning'] as const;

export type Weights = { needs: number; capabilities: number; industry: number; location: number };
export type Bridge = { topic: string; label: string; url: string };
export type MatchResult = {
  score: number;
  forYou: string[];
  forThem: string[];
  missing: string[];
  bridges: Bridge[];
  missingPreferred: string[];
  preferredBridges: Bridge[];
  weights: Weights;
  industry: boolean;
  location: boolean;
};
export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  category: string;
  location: string;
  industry: string;
  description: string;
  requirements: string[];
  preferred: string[];
  offers: string[];
  sourceUrl: string | null;
  evidence: { field: string; quote: string }[] | null;
  publishedAt: string;
  deadline: string | null;
  isDemo: boolean;
  trust: string;
  match: MatchResult | null;
};
export type Profile = {
  name: string; role: string; industry: string; location: string; description: string;
  stage: string; interests: string; constraints: string; goals: string;
  visibility: string;
  capabilities: { label: string }[]; needs: { label: string }[];
};
export type ProfileForm = {
  name: string; role: string; industry: string; location: string; description: string;
  stage: string; interests: string; constraints: string; goals: string;
  capabilities: string; needs: string; visibility: string;
};
export type ListingForm = {
  title: string; organization: string; category: string; location: string; industry: string;
  description: string; requirements: string; preferred: string; offers: string; sourceUrl: string; deadline: string;
};
export type Draft = {
  title: string; organization: string; category: string; location: string; industry: string;
  description: string; requirements: string[]; preferred: string[]; offers: string[];
  sourceUrl: string; evidence: { field: string; quote: string }[]; confidence: string;
};
export type Connections = {
  sent: { id: string; status: string; message: string; createdAt: string; to: { name: string; roles: string[] } }[];
  received: { id: string; status: string; message: string; createdAt: string; from: { name: string; roles: string[] } }[];
};
export type Tracker = { id: string; kind: string; title: string; stage: string; notes: string; counterpart: string; updatedAt: string };
export type Metrics = {
  window: { days: number };
  discovery: { searches: number; views: number; saves: number; listingsPublished: number };
  outcomes: { connectionRequests: number; connectionsAccepted: number; trackersCreated: number; stagesAdvanced: number; messagesSent: number };
  totals: { workspaces: number };
  sdg: { category: string; sourceBackedListings: number; reverified: number }[];
};

export const EMPTY_FORM: ProfileForm = {
  name: '', role: 'Candidate', industry: '', location: '', description: '',
  stage: '', interests: '', constraints: '', goals: '', capabilities: '', needs: '',
  visibility: 'private',
};
export const EMPTY_LISTING: ListingForm = {
  title: '', organization: '', category: 'Partnerships', location: '', industry: '',
  description: '', requirements: '', preferred: '', offers: '', sourceUrl: '', deadline: '',
};

export type Lang = 'en' | 'hi' | 'mr';
import enMessages from '@/messages/en.json';
import hiMessages from '@/messages/hi.json';
import mrMessages from '@/messages/mr.json';

export type MsgKey = keyof typeof enMessages;
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' }, { id: 'hi', label: 'हिंदी' }, { id: 'mr', label: 'मराठी' },
];
export const messages = {
  en: enMessages as Record<MsgKey, string>,
  hi: hiMessages as Record<MsgKey, string>,
  mr: mrMessages as Partial<Record<MsgKey, string>>,
};

// Message catalogs live in src/messages/*.json; Marathi falls back to the Hindi
// copy where a dedicated string is not written yet, and Hindi to English.
const PLURAL = /\{count, plural, ((?:[^{}]|\{[^{}]*\})*)\}/;

function formatPlural(lang: Lang, template: string, count: number): string {
  const cases = new Map<string, string>();
  for (const match of template.matchAll(/(=[0-9]+|zero|one|two|few|many|other)\s*\{([^}]*)\}/g)) {
    cases.set(match[1], match[2]);
  }
  const exact = cases.get(`=${count}`);
  const category = new Intl.PluralRules(lang === 'mr' ? 'mr' : lang === 'hi' ? 'hi' : 'en').select(count);
  const body = exact ?? cases.get(category) ?? cases.get('other') ?? '';
  return body.replace(/#/g, new Intl.NumberFormat(lang).format(count));
}

export const t = (lang: Lang, key: MsgKey, vars?: { count?: number }) => {
  const raw = messages[lang]?.[key] ?? (lang === 'mr' ? messages.hi[key] : messages.en[key]) ?? messages.en[key];
  let text: string = typeof raw === 'string' ? raw : key;
  if (vars && typeof vars.count === 'number' && PLURAL.test(text)) {
    const count = vars.count;
    text = text.replace(PLURAL, (_, tpl: string) => formatPlural(lang, tpl, count));
  }
  return text.replace(/\{count\}/g, String(vars?.count ?? '{count}'));
};

export const splitTerms = (value: string) =>
  value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 20);

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data ? String((data as { error: unknown }).error) : 'Something went wrong.';
    throw new Error(message);
  }
  return data as T;
}
