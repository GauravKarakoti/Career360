import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { recordEvent } from '@/lib/events';
import { match } from '@/lib/matching';
import { ApiError, handle, jsonBody, signedInAccount, workspace } from '@/lib/session';
import { opportunityInput } from '@/lib/validation';
import { syncOpportunitiesForDna } from '@/lib/web-discovery';
import { localizeListings, parseLang } from '@/lib/translate';
import { cleanRequirements, isUnstopUrl } from '@/lib/listing-terms';
import { htmlToMarkdown, looksLikeMarkup, truncateMarkdown } from '@/lib/rich-text';

const ROLE_ALLOWED_CATEGORIES: Record<string, readonly string[]> = {
  Candidate: ['Collaborations', 'Learning'],
  Recruiter: ['Jobs & internships', 'Learning'],
  Startup: ['Jobs & internships', 'Partnerships', 'Collaborations', 'Events'],
  Creator: ['Collaborations', 'Partnerships', 'Events', 'Learning'],
  Business: ['Partnerships', 'Jobs & internships', 'Collaborations', 'Funding'],
  'Event organiser': ['Events', 'Partnerships', 'Collaborations'],
  'Sponsor / Brand': ['Funding', 'Partnerships', 'Collaborations', 'Events'],
};

function computeSearchRelevance(
  query: string,
  canonical: {
    title: string;
    organization: string;
    category: string;
    industry: string;
    location: string;
    description: string;
    requirements: string[];
    preferred: string[];
    offers: string[];
  },
  localized: {
    title: string;
    organization: string;
    category: string;
    industry: string;
    location: string;
    description: string;
    requirements: string[];
    preferred?: string[];
    offers: string[];
  },
  ftsRank: number
): number {
  const normQuery = query.toLowerCase().trim();
  if (!normQuery) return 1;

  const tokens = normQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const titlePool = `${canonical.title} ${localized.title}`.toLowerCase();
  const orgPool = `${canonical.organization} ${localized.organization}`.toLowerCase();
  const tagsPool = [
    ...canonical.requirements,
    ...canonical.offers,
    ...canonical.preferred,
    ...localized.requirements,
    ...localized.offers,
    ...(localized.preferred ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const metaPool = [
    canonical.category,
    canonical.industry,
    canonical.location,
    localized.category,
    localized.industry,
    localized.location,
  ]
    .join(' ')
    .toLowerCase();
  const descPool = `${canonical.description} ${localized.description}`.toLowerCase();

  const fullHaystack = `${titlePool} ${orgPool} ${tagsPool} ${metaPool} ${descPool}`;

  // Every search token must appear somewhere in the listing (canonical or translated) or have a positive FTS rank
  const allTokensMatch = tokens.every((token) => fullHaystack.includes(token));
  if (!allTokensMatch && ftsRank <= 0) {
    return 0;
  }

  let score = ftsRank * 25;

  if (titlePool.includes(normQuery)) score += 50;
  if (orgPool.includes(normQuery)) score += 40;
  if (tagsPool.includes(normQuery)) score += 35;
  if (metaPool.includes(normQuery)) score += 25;
  if (descPool.includes(normQuery)) score += 10;

  for (const token of tokens) {
    if (titlePool.includes(token)) score += 20;
    if (orgPool.includes(token)) score += 15;
    if (tagsPool.includes(token)) score += 15;
    if (metaPool.includes(token)) score += 10;
    if (descPool.includes(token)) score += 4;
  }

  return Math.max(score, 1);
}

export async function GET(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
    const lang = parseLang(url.searchParams.get('lang'));

    const profile = await db().profile.findUnique({
      where: { workspaceId: session.id },
      include: { capabilities: true, needs: true },
    });

    // Sync web opportunities on initial feed load (skip during active search queries so search stays fast)
    if (profile && !q) {
      await syncOpportunitiesForDna({
        role: profile.role,
        industry: profile.industry,
        location: profile.location,
        capabilities: profile.capabilities.map((c) => c.label),
        needs: profile.needs.map((n) => n.label),
        description: profile.description,
        stage: profile.stage ?? undefined,
        interests: profile.interests ?? undefined,
        constraints: profile.constraints ?? undefined,
        goals: profile.goals ?? undefined,
      }).catch(() => null);
    }

    // Compute PostgreSQL full-text rank boosts when q is present
    const ftsRanks = new Map<string, number>();
    if (q) {
      const rankedRows = await db()
        .$queryRaw<{ id: string; rank: number }[]>(Prisma.sql`
          SELECT
            "id",
            COALESCE(
              ts_rank(
                COALESCE(
                  "searchVector",
                  to_tsvector('english', COALESCE("title", '') || ' ' || COALESCE("organization", '') || ' ' || COALESCE("description", ''))
                ),
                websearch_to_tsquery('english', ${q})
              ),
              0
            ) AS "rank"
          FROM "Opportunity"
          WHERE ("ownerId" IS NULL OR "ownerId" = ${session.id})
        `)
        .catch(() => []);

      for (const row of rankedRows) {
        if (row.rank > 0) {
          ftsRanks.set(row.id, Number(row.rank));
        }
      }
    }

    const listings = await db().opportunity.findMany({
      where: {
        OR: [{ ownerId: null }, { ownerId: session.id }],
      },
      orderBy: { publishedAt: 'desc' },
      take: 200,
    });

    // Self-heal rows stored by older versions: raw/truncated HTML descriptions and
    // non-skill "requirements" (Remote, Undergraduate, All ...).
    const repairs: Promise<unknown>[] = [];
    for (const row of listings) {
      if (looksLikeMarkup(row.description)) {
        row.description = truncateMarkdown(htmlToMarkdown(row.description), 3500);
        if (row.ownerId === null) {
          repairs.push(
            db().opportunity.update({
              where: { id: row.id },
              data: { description: row.description },
            })
          );
        }
      }
      if (row.ownerId === null) {
        row.requirements = cleanRequirements(row.requirements, {
          unstop: isUnstopUrl(row.sourceUrl),
        });
      }
    }
    void Promise.allSettled(repairs);

    const canonicalById = new Map(listings.map((item) => [item.id, item]));

    const now = new Date();
    const scored = listings.map((item) => ({
      ...item,
      ownerId: undefined,
      match: match(profile, item),
      trust:
        item.deadline && item.deadline < now
          ? 'Expired'
          : item.sourceUrl && item.evidence
            ? 'Sourced'
            : item.isDemo
              ? 'Demo · fictional'
              : 'Unverified',
    }));

    if (!q) {
      scored.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    }

    // Localize listings so search works across both canonical English and translated Hindi text
    const { items: localizedItems, pending, translation } = await localizeListings(scored, lang);

    let opportunities = localizedItems;

    if (q) {
      const matchedWithScore = localizedItems
        .map((item) => {
          const canonical = canonicalById.get(item.id) ?? item;
          const relevance = computeSearchRelevance(
            q,
            canonical,
            item,
            ftsRanks.get(item.id) ?? 0
          );
          return { item, relevance };
        })
        .filter((entry) => entry.relevance > 0);

      matchedWithScore.sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return (b.item.match?.score ?? 0) - (a.item.match?.score ?? 0);
      });

      opportunities = matchedWithScore.map((entry) => entry.item);

      await recordEvent(
        session.id,
        'opportunity.viewed',
        `search:${q}`,
        opportunities[0]?.id ?? null
      ).catch(() => {});
    }

    return { opportunities, query: q || null, lang, pending, translation };
  });
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const data = opportunityInput.parse(await jsonBody(request));

    const [account, profile] = await Promise.all([
      signedInAccount().catch(() => null),
      db().profile.findUnique({ where: { workspaceId: session.id }, select: { role: true } }),
    ]);

    const activeRole = account?.primaryRole || profile?.role;
    if (activeRole && ROLE_ALLOWED_CATEGORIES[activeRole]) {
      const allowed = ROLE_ALLOWED_CATEGORIES[activeRole];
      if (!allowed.includes(data.category)) {
        throw new ApiError(
          `As a ${activeRole}, you can only publish listings in: ${allowed.join(', ')}.`,
          403
        );
      }
    }

    const { deadline, evidence, ...fields } = data;
    const listing = await db().opportunity.create({
      data: {
        ...fields,
        evidence: evidence ?? undefined,
        deadline: deadline ? new Date(deadline) : null,
        ownerId: session.id,
      },
    });
    return { id: listing.id };
  });
}