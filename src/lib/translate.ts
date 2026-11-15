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

const CHUNK = 4; // listings per LLM call
const MAX_PER_REQUEST = 12; // cap work done inside one page load
const WAIT_MS = 15_000; // how long a page load waits before showing the original text

const hashOf = (item: Translatable) =>
  createHash('sha1').update(`${item.title}\n${item.description}`).digest('hex').slice(0, 16);

export function parseLang(value: string | null | undefined): SupportedLang {
  return value === 'hi' ? 'hi' : 'en';
}

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
    schema
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
    // Replace any stale row, then insert.
    await db().opportunityTranslation.deleteMany({
      where: { lang, opportunityId: { in: rows.map((r) => r.opportunityId) } },
    });
    await db().opportunityTranslation.createMany({ data: rows, skipDuplicates: true });
  }
  return rows;
}

/**
 * Returns the listings with title/description/requirements/offers in `lang`.
 * Cached translations are applied immediately; missing ones are generated (bounded
 * per request) and saved for every later reader. Falls back to the original text.
 */
export async function localizeListings<T extends Translatable>(items: T[], lang: SupportedLang): Promise<T[]> {
  if (lang === 'en' || items.length === 0) return items;

  const cached = await db().opportunityTranslation.findMany({
    where: { lang, opportunityId: { in: items.map((i) => i.id) } },
  });
  const byId = new Map(cached.map((row) => [row.opportunityId, row]));

  const fresh = new Map<string, (typeof cached)[number]>();
  const missing: T[] = [];
  for (const item of items) {
    const row = byId.get(item.id);
    if (row && row.sourceHash === hashOf(item)) fresh.set(item.id, row);
    else missing.push(item);
  }

  if (missing.length && aiAvailable()) {
    const todo = missing.slice(0, MAX_PER_REQUEST);
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < todo.length; i += CHUNK) {
      jobs.push(
        translateChunk(todo.slice(i, i + CHUNK), lang)
          .then((rows) => {
            for (const row of rows) fresh.set(row.opportunityId, row as (typeof cached)[number]);
          })
          .catch((error) => console.error('translate chunk failed', error))
      );
    }
    // Wait a bounded time. Slow chunks keep running and still save to the cache.
    await Promise.race([Promise.all(jobs), new Promise((resolve) => setTimeout(resolve, WAIT_MS))]);
  }

  return items.map((item) => {
    const row = fresh.get(item.id);
    return row
      ? { ...item, title: row.title, description: row.description, requirements: row.requirements, offers: row.offers }
      : item;
  });
}
