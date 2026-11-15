import { db } from '@/lib/db';
import { aiAvailable, chatJson, schemaOf } from '@/lib/ai';

export type DnaInput = {
  role: string;
  industry: string;
  location: string;
  capabilities: string[];
  needs: string[];
  description?: string;
  stage?: string;
  interests?: string;
  constraints?: string;
  goals?: string;
  preferredLanguage?: 'en' | 'hi';
};

export type DiscoveredListing = {
  title: string;
  organization: string;
  category:
    | 'Partnerships'
    | 'Funding'
    | 'Jobs & internships'
    | 'Events'
    | 'Collaborations'
    | 'Learning';
  location: string;
  industry: string;
  description: string;
  requirements: string[];
  preferred: string[];
  offers: string[];
  sourceUrl: string;
  evidence: { field: string; quote: string }[];
  deadline: Date | null;
};

type CacheEntry = {
  expiresAt: number;
  sources: string[];
  totalMatched: number;
};

const CACHE_TTL_MS = 15 * 60 * 1000;

const globalForCache = globalThis as unknown as {
  __o360DnaSyncCache?: Map<string, CacheEntry>;
};
const dnaSyncCache =
  globalForCache.__o360DnaSyncCache ??
  (globalForCache.__o360DnaSyncCache = new Map<string, CacheEntry>());

export function cleanHtmlText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/class="[^"]*"/gi, ' ')
    .replace(/style="[^"]*"/gi, ' ')
    .replace(/styles-module__[^\s]+/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDnaSignature(dna: DnaInput): string {
  return [
    dna.role.toLowerCase().trim(),
    dna.industry.toLowerCase().trim(),
    dna.location.toLowerCase().trim(),
    [...dna.capabilities].map((c) => c.toLowerCase().trim()).sort().join(','),
    [...dna.needs].map((n) => n.toLowerCase().trim()).sort().join(','),
    (dna.preferredLanguage ?? 'en').toLowerCase(),
  ].join('|');
}

function buildSearchKeywords(dna: DnaInput): string[] {
  const rawTerms = [
    ...dna.capabilities.slice(0, 4),
    ...dna.needs.slice(0, 2),
    dna.industry,
    ...(dna.interests ? dna.interests.split(',').map((s) => s.trim()).slice(0, 2) : []),
  ]
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.toLowerCase() !== 'general');

  const unique = Array.from(new Set(rawTerms));
  return unique.length > 0 ? unique.slice(0, 5) : ['software', 'startup'];
}

async function fetchRemotiveOpportunities(
  keywords: string[],
  dna: DnaInput
): Promise<DiscoveredListing[]> {
  try {
    const primaryQuery = encodeURIComponent(keywords[0] ?? 'developer');
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${primaryQuery}&limit=12`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      jobs?: Array<{
        title?: string;
        company_name?: string;
        category?: string;
        candidate_required_location?: string;
        tags?: string[];
        description?: string;
        url?: string;
        salary?: string;
        job_type?: string;
      }>;
    };

    const jobs = (data.jobs ?? []).slice(0, 6);
    const results: DiscoveredListing[] = [];

    for (const job of jobs) {
      if (!job.title || !job.company_name || !job.url || !job.url.startsWith('https://')) {
        continue;
      }
      const cleanDesc = cleanHtmlText(job.description ?? '').slice(0, 1500);
      if (cleanDesc.length < 40) continue;

      const tags = (job.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 6);
      const offers = [
        job.salary ? `Compensation: ${job.salary}` : 'Competitive remote salary',
        job.job_type ? job.job_type.replace('_', ' ') : 'Full-time position',
        'Global team culture',
      ];

      results.push({
        title: job.title.slice(0, 160),
        organization: job.company_name.slice(0, 160),
        category: 'Jobs & internships',
        location: (job.candidate_required_location || 'Remote').slice(0, 160),
        industry: (job.category || dna.industry || 'Technology').slice(0, 160),
        description: cleanDesc,
        requirements: tags.length > 0 ? tags : dna.capabilities.slice(0, 4),
        preferred: [],
        offers,
        sourceUrl: job.url,
        evidence: [
          { field: 'title', quote: job.title.slice(0, 140) },
          { field: 'description', quote: cleanDesc.slice(0, 200) },
        ],
        deadline: null,
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function fetchUnstopOpportunities(
  _keywords: string[],
  dna: DnaInput
): Promise<DiscoveredListing[]> {
  try {
    const opportunityType =
      dna.role === 'Event organiser' || dna.role === 'Sponsor / Brand' || dna.role === 'Creator'
        ? 'hackathons'
        : 'all';

    const res = await fetch(
      `https://unstop.com/api/public/opportunity/search-result?opportunity=${opportunityType}&per_page=8&oppstatus=open`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];

    const payload = (await res.json()) as {
      data?: {
        data?: Array<Record<string, unknown>>;
      };
    };

    const rows = payload?.data?.data ?? [];
    const results: DiscoveredListing[] = [];

    for (const row of rows.slice(0, 6)) {
      const title = String(row.title ?? '').trim();
      const seoUrl = String(row.seo_url ?? row.public_url ?? '').trim();
      const orgObj = row.organisation as Record<string, unknown> | undefined;
      const orgName = String(orgObj?.name ?? row.organisation_name ?? 'Verified Organiser').trim();
      if (!title) continue;

      const fullUrl = seoUrl.startsWith('https://')
        ? seoUrl
        : seoUrl
          ? `https://unstop.com/${seoUrl.replace(/^\/+/, '')}`
          : '';
      if (!fullUrl.startsWith('https://')) continue;

      const rawType = String(row.type ?? row.subtype ?? '').toLowerCase();
      const category: DiscoveredListing['category'] =
        rawType.includes('job') || rawType.includes('internship')
          ? 'Jobs & internships'
          : rawType.includes('workshop') || rawType.includes('course')
            ? 'Learning'
            : 'Events';

      const filters = Array.isArray(row.filters) ? row.filters : [];
      const extractedTags = filters
        .map((f: Record<string, unknown>) => String(f.name ?? '').trim())
        .filter(Boolean)
        .slice(0, 6);

      const details = cleanHtmlText(String(row.details ?? row.short_desc ?? title));
      const description =
        details.length >= 30
          ? details.slice(0, 1500)
          : `${title} hosted by ${orgName}.`;

      const endDateStr = String(row.end_date ?? '');
      const parsedDeadline = endDateStr ? new Date(endDateStr) : null;

      results.push({
        title: title.slice(0, 160),
        organization: orgName.slice(0, 160),
        category,
        location: String(row.region ?? 'Online / Hybrid').slice(0, 160),
        industry: dna.industry || 'Technology',
        description,
        requirements:
          extractedTags.length > 0
            ? extractedTags
            : dna.capabilities.slice(0, 4),
        preferred: [],
        offers: ['Recognition & prizes', 'Networking opportunities', 'Verified participation'],
        sourceUrl: fullUrl,
        evidence: [
          { field: 'title', quote: title.slice(0, 140) },
          { field: 'organization', quote: orgName.slice(0, 140) },
        ],
        deadline:
          parsedDeadline && !Number.isNaN(parsedDeadline.getTime()) ? parsedDeadline : null,
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function fetchArbeitnowOpportunities(
  keywords: string[],
  dna: DnaInput
): Promise<DiscoveredListing[]> {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const payload = (await res.json()) as {
      data?: Array<{
        title?: string;
        company_name?: string;
        location?: string;
        remote?: boolean;
        url?: string;
        tags?: string[];
        description?: string;
      }>;
    };

    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const allItems = payload.data ?? [];

    const matched = allItems.filter((item) => {
      const hay = `${item.title ?? ''} ${(item.tags ?? []).join(' ')} ${item.description ?? ''}`.toLowerCase();
      return lowerKeywords.some((kw) => hay.includes(kw));
    });

    const selected = (matched.length > 0 ? matched : allItems).slice(0, 5);
    const results: DiscoveredListing[] = [];

    for (const item of selected) {
      if (!item.title || !item.company_name || !item.url?.startsWith('https://')) continue;
      const cleanDesc = cleanHtmlText(item.description ?? '').slice(0, 1500);
      if (cleanDesc.length < 40) continue;

      const tags = (item.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 6);

      results.push({
        title: item.title.slice(0, 160),
        organization: item.company_name.slice(0, 160),
        category: 'Jobs & internships',
        location: item.remote
          ? `Remote · ${item.location || 'Global'}`
          : (item.location || 'Remote').slice(0, 160),
        industry: (dna.industry || tags[0] || 'Technology').slice(0, 160),
        description: cleanDesc,
        requirements: tags.length > 0 ? tags : dna.capabilities.slice(0, 4),
        preferred: [],
        offers: [
          item.remote ? 'Remote flexibility' : 'On-site / Hybrid setup',
          'Professional growth',
          'Competitive compensation',
        ],
        sourceUrl: item.url,
        evidence: [
          { field: 'title', quote: item.title.slice(0, 140) },
          { field: 'description', quote: cleanDesc.slice(0, 200) },
        ],
        deadline: null,
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function refineAndTranslateListings(
  listings: DiscoveredListing[],
  dna: DnaInput
): Promise<DiscoveredListing[]> {
  if (listings.length === 0) return listings;
  const targetLang = dna.preferredLanguage ?? 'en';
  if (!aiAvailable()) return listings;

  try {
    const batch = listings.slice(0, 6).map((item, idx) => ({
      idx,
      title: item.title,
      organization: item.organization,
      rawDesc: item.description.slice(0, 800),
      category: item.category,
    }));

    const schema = schemaOf(
      {
        items: {
          type: 'array',
          items: schemaOf(
            {
              idx: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              category: {
                type: 'string',
                enum: [
                  'Partnerships',
                  'Funding',
                  'Jobs & internships',
                  'Events',
                  'Collaborations',
                  'Learning',
                ],
              },
              requirements: { type: 'array', items: { type: 'string' } },
              offers: { type: 'array', items: { type: 'string' } },
            },
            ['idx', 'title', 'description', 'category', 'requirements', 'offers']
          ),
        },
      },
      ['items']
    );

    const languageInstruction =
      targetLang === 'hi'
        ? 'Translate the cleaned description, title, requirements, and offers into clear, professional Hindi.'
        : 'Ensure text is clean, professional English.';

    const refined = await chatJson<{
      items: Array<{
        idx: number;
        title: string;
        description: string;
        category: DiscoveredListing['category'];
        requirements: string[];
        offers: string[];
      }>;
    }>(
      [
        {
          role: 'system',
          content: [
            'You clean and refine raw scraped job/opportunity listings.',
            'Remove all HTML artefacts, CSS snippets, and formatting noise.',
            languageInstruction,
            'Extract accurate, role-specific requirements and genuine offers. NEVER assign generic mismatched tags like "Hackathons" to regular jobs.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Target Language Code: ${targetLang}\nUser DNA Role: ${dna.role}\n\nListings to clean & refine:\n${JSON.stringify(batch)}`,
        },
      ],
      'dna_web_refinement',
      schema
    );

    for (const entry of refined.items ?? []) {
      const target = listings[entry.idx];
      if (!target) continue;
      if (entry.title) target.title = entry.title.slice(0, 160);
      if (entry.description) target.description = entry.description.slice(0, 2000);
      if (entry.category) target.category = entry.category;
      if (entry.requirements?.length) target.requirements = entry.requirements.slice(0, 8);
      if (entry.offers?.length) target.offers = entry.offers.slice(0, 6);
    }
  } catch {
    // Keep base listings on timeout
  }

  return listings;
}

export async function syncOpportunitiesForDna(
  dna: DnaInput,
  options?: { force?: boolean }
): Promise<{
  created: number;
  reused: number;
  cached: boolean;
  sources: string[];
}> {
  const signature = buildDnaSignature(dna);
  const now = Date.now();

  if (!options?.force) {
    const hit = dnaSyncCache.get(signature);
    if (hit && hit.expiresAt > now) {
      return {
        created: 0,
        reused: hit.totalMatched,
        cached: true,
        sources: hit.sources,
      };
    }
  }

  const keywords = buildSearchKeywords(dna);

  const [remotive, unstop, arbeitnow] = await Promise.all([
    fetchRemotiveOpportunities(keywords, dna),
    fetchUnstopOpportunities(keywords, dna),
    fetchArbeitnowOpportunities(keywords, dna),
  ]);

  const sourcesUsed: string[] = [];
  if (remotive.length > 0) sourcesUsed.push('Remotive');
  if (unstop.length > 0) sourcesUsed.push('Unstop');
  if (arbeitnow.length > 0) sourcesUsed.push('Arbeitnow');

  const byUrl = new Map<string, DiscoveredListing>();
  for (const item of [...remotive, ...unstop, ...arbeitnow]) {
    if (!byUrl.has(item.sourceUrl)) {
      byUrl.set(item.sourceUrl, item);
    }
  }

  const discovered = await refineAndTranslateListings(Array.from(byUrl.values()), dna);

  let created = 0;
  let reused = 0;

  for (const item of discovered) {
    try {
      const existing = await db().opportunity.findFirst({
        where: {
          OR: [
            { sourceUrl: item.sourceUrl },
            { title: item.title, organization: item.organization },
          ],
        },
        select: { id: true },
      });

      if (existing) {
        reused += 1;
        continue;
      }

      await db().opportunity.create({
        data: {
          title: item.title,
          organization: item.organization,
          category: item.category,
          location: item.location,
          industry: item.industry,
          description: item.description,
          requirements: item.requirements,
          preferred: item.preferred,
          offers: item.offers,
          sourceUrl: item.sourceUrl,
          evidence: item.evidence,
          deadline: item.deadline,
          isDemo: false,
          ownerId: null,
        },
      });
      created += 1;
    } catch {
      // Skip duplicate
    }
  }

  dnaSyncCache.set(signature, {
    expiresAt: now + CACHE_TTL_MS,
    sources: sourcesUsed,
    totalMatched: created + reused,
  });

  return {
    created,
    reused,
    cached: false,
    sources: sourcesUsed,
  };
}