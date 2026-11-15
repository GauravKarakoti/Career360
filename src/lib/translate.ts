import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { aiAvailable, chatJson, schemaOf } from '@/lib/ai';

export type SupportedLang = 'en' | 'hi';

const LANG_NAME: Record<SupportedLang, string> = { en: 'English', hi: 'Hindi (Devanagari)' };

type Translatable = {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  offers: string[];
};

const CONCURRENCY = 2; // parallel calls; more tends to trip provider tokens-per-minute limits
const MAX_PER_REQUEST = 6; // top-ranked listings per page load; the client polls for the rest
const WAIT_MS = 25_000; // how long a page load waits before showing the original text

const hashOf = (item: Translatable) =>
  createHash('sha1').update(`${item.title}\n${item.description}`).digest('hex').slice(0, 16);

export function parseLang(value: string | null | undefined): SupportedLang {
  return value === 'hi' ? 'hi' : 'en';
}

// One listing per call, so a single failure or rate limit never loses a whole batch.
async function translateChunk(chunk: Translatable[], lang: SupportedLang) {
  const schema = schemaOf(
    {
      items: {
        type: 'array',
        items: schemaOf(
          {
            idx: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'array', items: { type: 'string' } },
            offers: { type: 'array', items: { type: 'string' } },
          },
          ['idx', 'title', 'description', 'requirements', 'offers']
        ),
      },
    },
    ['items']
  );

  const result = await chatJson<{
    items: { idx: number; title: string; description: string; requirements: string[]; offers: string[] }[];
  }>(
    [
      {
        role: 'system',
        content: [
          `Translate opportunity listings into ${LANG_NAME[lang]}.`,
          'The description uses a small Markdown subset: "## " headings, "- " bullets, **bold**, blank lines between paragraphs.',
          'Keep that structure EXACTLY: same number of headings, bullets and paragraphs, same order. Do not add or drop content.',
          'Do not translate company names, product/technology names (React, Solidity, AWS...), URLs, emails or numbers.',
          'If a field is already in the target language, return it unchanged.',
          'Return requirements and offers with the same number of items, in the same order.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify(
          chunk.map((item, idx) => ({
            idx,
            title: item.title,
            description: item.description,
            requirements: item.requirements,
            offers: item.offers,
          }))
        ),
      },
    ],
    'opportunity_translation',
    schema,
    { model: process.env.GROQ_TRANSLATE_MODEL || undefined, lowReasoning: true }
  );

  const rows = [];
  for (const entry of result.items ?? []) {
    const source = chunk[entry.idx];
    if (!source || !entry.title?.trim() || !entry.description?.trim()) continue;
    rows.push({
      opportunityId: source.id,
      lang,
      title: entry.title.trim().slice(0, 300),
      description: entry.description.trim().slice(0, 6000),
      requirements: entry.requirements?.length ? entry.requirements.slice(0, 20) : source.requirements,
      offers: entry.offers?.length ? entry.offers.slice(0, 20) : source.offers,
      sourceHash: hashOf(source),
    });
  }
  if (rows.length) {
    try {
      // Replace any stale row, then insert.
      await db().opportunityTranslation.deleteMany({
        where: { lang, opportunityId: { in: rows.map((r) => r.opportunityId) } },
      });
      await db().opportunityTranslation.createMany({ data: rows, skipDuplicates: true });
    } catch (error) {
      // Still show this translation now even if it could not be cached.
      console.error('translate: could not save to OpportunityTranslation (run prisma migrate + generate?):', error);
    }
  }
  return rows;
}

/**
 * Returns the listings with title/description/requirements/offers in `lang`.
 * Cached translations are applied immediately; missing ones are generated (bounded
 * per request) and saved for every later reader. Falls back to the original text.
 */
export type TranslationStatus = { status: 'ok' | 'unavailable' | 'error'; reason?: string };

/**
 * Returns the listings with title/description/requirements/offers in `lang`.
 * Cached translations are applied immediately; missing ones are generated (bounded
 * per request) and saved for every later reader. Falls back to the original text and
 * reports why, so the UI can say so instead of silently showing the wrong language.
 */
export async function localizeListings<T extends Translatable>(
  items: T[],
  lang: SupportedLang
): Promise<{ items: T[]; pending: number; translation: TranslationStatus }> {
  if (lang === 'en' || items.length === 0) return { items, pending: 0, translation: { status: 'ok' } };

  type Row = {
    opportunityId: string; title: string; description: string;
    requirements: string[]; offers: string[]; sourceHash: string;
  };
  const fresh = new Map<string, Row>();
  const missing: T[] = [];
  let cacheError: string | null = null;

  try {
    const cached = await db().opportunityTranslation.findMany({
      where: { lang, opportunityId: { in: items.map((i) => i.id) } },
    });
    const byId = new Map(cached.map((row) => [row.opportunityId, row]));
    for (const item of items) {
      const row = byId.get(item.id);
      if (row && row.sourceHash === hashOf(item)) fresh.set(item.id, row);
      else missing.push(item);
    }
  } catch (error) {
    console.error('translate: cache read failed (run prisma migrate + generate?):', error);
    cacheError = 'Translation cache is unavailable. Run the database migration and `prisma generate`.';
    missing.push(...items);
  }

  const errors: string[] = [];
  if (missing.length && aiAvailable()) {
    const queue = missing.slice(0, MAX_PER_REQUEST);
    let stop = false;
    const worker = async () => {
      while (!stop) {
        const item = queue.shift();
        if (!item) return;
        try {
          const rows = await translateChunk([item], lang);
          for (const row of rows) fresh.set(row.opportunityId, row);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('translate failed:', message);
          errors.push(message);
          // Rate limited or provider down: stop hammering it, the client will poll again.
          if (/rate limited|HTTP 4|HTTP 5/.test(message)) stop = true;
        }
      }
    };
    // Wait a bounded time. Slow calls keep running and still save to the cache.
    await Promise.race([
      Promise.all(Array.from({ length: CONCURRENCY }, worker)),
      new Promise((resolve) => setTimeout(resolve, WAIT_MS)),
    ]);
  }

  const out = items.map((item) => {
    const row = fresh.get(item.id);
    return row
      ? { ...item, title: row.title, description: row.description, requirements: row.requirements, offers: row.offers }
      : item;
  });
  const pending = items.filter((item) => !fresh.has(item.id)).length;

  let translation: TranslationStatus = { status: 'ok' };
  if (pending > 0 && !aiAvailable()) {
    console.error('translate: GROQ_API_KEY is not set, showing original text');
    translation = { status: 'unavailable', reason: 'Translation is not configured on this server (GROQ_API_KEY is missing).' };
  } else if (pending > 0 && (errors.length || cacheError)) {
    translation = { status: 'error', reason: errors[0] ?? cacheError ?? undefined };
  }
  return { items: out, pending: translation.status === 'unavailable' ? 0 : pending, translation };
}
