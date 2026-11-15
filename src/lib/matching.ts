type DNA = {
  role: string;
  industry: string;
  location: string;
  capabilities: { label: string }[];
  needs: { label: string }[];
};

type Listing = {
  title?: string;
  description?: string;
  offers: string[];
  requirements: string[];
  preferred?: string[] | null;
  industry: string;
  location: string;
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[._/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP_WORDS = new Set([
  'and',
  'or',
  'the',
  'for',
  'with',
  'in',
  'to',
  'of',
  'a',
  'an',
  'on',
  'at',
  'by',
]);

const tokenize = (value: string) =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

/**
 * Checks whether two capability/need/offer phrases represent the same or overlapping concept.
 * Preserves exact matches and also handles real-world web variations (e.g. "React.js" <-> "React",
 * "Frontend development" <-> "Frontend", "Internship" <-> "Paid internship").
 */
function termsMatch(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 3 && normB.length >= 3 && (normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (!tokensA.length || !tokensB.length) return false;

  return tokensA.some(
    (tA) =>
      tA.length >= 3 &&
      tokensB.some(
        (tB) =>
          tB.length >= 3 &&
          (tA === tB ||
            (tA.length >= 4 && tB.length >= 4 && (tA.startsWith(tB) || tB.startsWith(tA))))
      )
  );
}

const overlap = (wanted: string[], available: string[], fallbackText?: string) => {
  const normFallback = fallbackText ? normalize(fallbackText) : '';
  return wanted.filter((value) => {
    if (available.some((other) => termsMatch(value, other))) return true;
    const normVal = normalize(value);
    return normVal.length >= 4 && normFallback.includes(normVal);
  });
};

function locationsAlign(profileLoc: string, listingLoc: string): boolean {
  const a = normalize(profileLoc);
  const b = normalize(listingLoc);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if ((a.includes('remote') || a.includes('online')) && (b.includes('remote') || b.includes('online') || b.includes('global') || b.includes('anywhere'))) {
    return true;
  }
  const tokensA = tokenize(profileLoc);
  const tokensB = tokenize(listingLoc);
  return tokensA.some((t) => t.length >= 3 && tokensB.includes(t));
}

function industriesAlign(profileInd: string, listingInd: string): boolean {
  const a = normalize(profileInd);
  const b = normalize(listingInd);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const techSynonyms = ['technology', 'software', 'it', 'saas', 'ai', 'fintech', 'web3', 'engineering', 'developer'];
  if (techSynonyms.some((s) => a.includes(s)) && techSynonyms.some((s) => b.includes(s))) {
    return true;
  }
  return termsMatch(profileInd, listingInd);
}

const weights: Record<string, [number, number, number, number]> = {
  Startup: [45, 35, 15, 5],
  Candidate: [30, 50, 15, 5],
  Recruiter: [50, 30, 15, 5],
  Creator: [40, 40, 15, 5],
  Business: [45, 35, 15, 5],
  'Event organiser': [50, 30, 15, 5],
  'Sponsor / Brand': [45, 35, 15, 5],
};

// Real, free learning sources used to bridge skill gaps. Matched by keyword
// against the missing requirement; anything unmatched gets a general search link.
const learningSources: { keywords: string[]; label: string; url: (topic: string) => string }[] = [
  {
    keywords: ['react', 'next', 'javascript', 'typescript', 'frontend', 'css', 'html'],
    label: 'freeCodeCamp',
    url: (t) => `https://www.google.com/search?q=${encodeURIComponent(t + ' site:freecodecamp.org')}`,
  },
  {
    keywords: ['python', 'data', 'ml', 'machine learning', 'ai', 'pandas'],
    label: 'Kaggle Learn',
    url: (t) => `https://www.google.com/search?q=${encodeURIComponent(t + ' site:kaggle.com/learn')}`,
  },
  {
    keywords: ['marketing', 'seo', 'brand', 'growth', 'content'],
    label: 'Google Skillshop',
    url: (t) => `https://www.google.com/search?q=${encodeURIComponent(t + ' site:skillshop.google')}`,
  },
  {
    keywords: ['finance', 'accounting', 'excel', 'startup', 'pitch', 'funding'],
    label: 'Startup India Learning & E-learning',
    url: (t) =>
      `https://www.google.com/search?q=${encodeURIComponent(t + ' site:startupindia.gov.in OR site:nptel.ac.in')}`,
  },
  {
    keywords: ['design', 'figma', 'ui', 'ux'],
    label: 'Figma Learn',
    url: (t) => `https://www.google.com/search?q=${encodeURIComponent(t + ' site:help.figma.com')}`,
  },
  {
    keywords: ['cloud', 'aws', 'devops', 'docker', 'kubernetes'],
    label: 'AWS Skill Builder (free tier)',
    url: (t) => `https://www.google.com/search?q=${encodeURIComponent(t + ' site:explore.skillbuilder.aws')}`,
  },
  {
    keywords: ['communication', 'english', 'hindi', 'speaking', 'writing', 'interview'],
    label: 'British Council LearnEnglish',
    url: (t) =>
      `https://www.google.com/search?q=${encodeURIComponent(t + ' site:learnenglish.britishcouncil.org')}`,
  },
];

const fallbackSource = {
  label: 'YouTube (free courses)',
  url: (t: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t + ' full course free')}`,
};

export function bridgeFor(requirement: string) {
  const topic = requirement.trim();
  const needle = normalize(topic);
  const source = learningSources.find((s) =>
    s.keywords.some((k) => needle.includes(k) || k.includes(needle))
  );
  const chosen = source ?? fallbackSource;
  return { topic, label: chosen.label, url: chosen.url(topic) };
}

export function match(profile: DNA | null, listing: Listing) {
  if (!profile) return null;
  const capabilities = profile.capabilities.map((item) => item.label);
  const needs = profile.needs.map((item) => item.label);
  const contextText = `${listing.title ?? ''} ${listing.description ?? ''}`;

  const forYou = overlap(needs, listing.offers, contextText);
  const forThem = overlap(listing.requirements, capabilities);
  const preferred = (listing.preferred ?? []).slice(0, 20);
  const forThemPreferred = overlap(preferred, capabilities);
  const missing = listing.requirements.filter((item) => !forThem.includes(item));
  // Preferred items a profile lacks are reported, but never counted in the score.
  const missingPreferred = preferred.filter((item) => !forThemPreferred.includes(item));

  const [needsWeight, skillsWeight, industryWeight, locationWeight] =
    weights[profile.role] || weights.Startup;

  const industry = industriesAlign(profile.industry, listing.industry);
  const location = locationsAlign(profile.location, listing.location);

  const score = Math.round(
    (needs.length ? forYou.length / needs.length : 0) * needsWeight +
      (listing.requirements.length ? forThem.length / listing.requirements.length : 0) * skillsWeight +
      Number(industry) * industryWeight +
      Number(location) * locationWeight
  );

  return {
    score,
    forYou,
    forThem,
    missing,
    missingPreferred,
    bridges: missing.map(bridgeFor),
    preferredBridges: missingPreferred.map(bridgeFor),
    weights: {
      needs: needsWeight,
      capabilities: skillsWeight,
      industry: industryWeight,
      location: locationWeight,
    },
    industry,
    location,
  };
}