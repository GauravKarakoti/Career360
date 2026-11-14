import { db } from '@/lib/db';
import { ApiError, handle, rateLimit, workspace } from '@/lib/session';
import { recordEvent } from '@/lib/events';
export const runtime = 'nodejs';

// Re-verification: re-fetch the cited source and check that the stored
// evidence quotes still appear on the live page. Listings whose source has
// changed are marked "stale" instead of silently keeping their old claims.
async function fetchPageText(url: string): Promise<string | null> {
  try {
    const page = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Career360Bot/1.0)' },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow'
    });
    if (!page.ok) return null;
    const limit = 200000;
    let html = (await page.text()).slice(0, limit);
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);
  } catch {
    return null;
  }
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function verifyOpportunity(id: string): Promise<{ status: string; matched: number; total: number }> {
  const opportunity = await db().opportunity.findUnique({ where: { id } });
  if (!opportunity) throw new ApiError('Opportunity not found', 404);
  if (!opportunity.sourceUrl) throw new ApiError('This listing has no source URL to re-verify.', 400);

  const evidence = Array.isArray(opportunity.evidence)
    ? (opportunity.evidence as { field?: string; quote?: string }[])
    : [];
  const quotes = evidence.map((entry) => (entry && typeof entry.quote === 'string' ? entry.quote : '')).filter(Boolean);

  const text = await fetchPageText(opportunity.sourceUrl);
  let status: string;
  let matched = 0;

  if (text === null) {
    status = 'unreachable';
  } else {
    const haystack = normalize(text);
    matched = quotes.filter((quote) => haystack.includes(normalize(quote))).length;
    status = matched === 0 ? 'stale' : matched === quotes.length ? 'verified' : 'partial';
  }

  await db().opportunity.update({
    where: { id },
    data: { sourceStatus: status, lastVerifiedAt: new Date() }
  });
  await recordEvent(opportunity.ownerId ?? '', 'source.reverified', `${status} (${matched}/${quotes.length} quotes)`, id);
  return { status, matched, total: quotes.length };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, async () => {
    rateLimit(request, 'reverify', 10);
    await workspace();
    const { id } = await params;
    return { reverified: await verifyOpportunity(id) };
  });
}
