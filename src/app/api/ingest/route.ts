import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { chatJson, schemaOf } from '@/lib/ai';
export const runtime = 'nodejs';

const input = z.object({ url: z.string().url().max(2000).refine(value => new URL(value).protocol === 'https:', 'Use an HTTPS source URL.') });

type Extraction = {
  title: string; organization: string; category: string; location: string; industry: string;
  description: string; requirements: string[]; offers: string[];
  evidence: { field: string; quote: string }[]; confidence: 'high' | 'medium' | 'low';
};
const extractionSchema = schemaOf({
  title: { type: 'string' },
  organization: { type: 'string' },
  category: { type: 'string', enum: ['Partnerships', 'Funding', 'Jobs & internships', 'Events', 'Collaborations', 'Learning'] },
  location: { type: 'string' },
  industry: { type: 'string' },
  description: { type: 'string' },
  requirements: { type: 'array', items: { type: 'string' } },
  offers: { type: 'array', items: { type: 'string' } },
  evidence: {
    type: 'array',
    items: schemaOf({ field: { type: 'string' }, quote: { type: 'string' } }, ['field', 'quote'])
  },
  confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
}, ['title', 'organization', 'category', 'location', 'industry', 'description', 'requirements', 'offers', 'evidence', 'confidence']);

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    const { url } = input.parse(await jsonBody(request));

    const page = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Career360Bot/1.0)' },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow'
    });
    if (!page.ok) throw new ApiError(`The source could not be fetched (HTTP ${page.status}). Check the URL.`, 400);
    const limit = 200000;
    let html = (await page.text()).slice(0, limit);
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
    if (html.length < 200) throw new ApiError('The page has too little text to extract a listing from.', 400);

    const extraction = await chatJson<Extraction>([
      { role: 'system', content: 'Extract an opportunity listing from the page text. Every "evidence" entry must be a VERBATIM quote from the page supporting one field. If the page is not about an opportunity listing, set confidence "low" and leave fields empty strings. Do not invent facts.' },
      { role: 'user', content: `Source URL: ${url}\n\nPage text:\n${html}` }
    ], 'opportunity_extraction', extractionSchema);

    if (extraction.confidence === 'low' || !extraction.title) throw new ApiError('This page does not look like an opportunity listing. Nothing was extracted.', 422);
    const categories = ['Partnerships', 'Funding', 'Jobs & internships', 'Events', 'Collaborations', 'Learning'] as const;
    if (!categories.includes(extraction.category as (typeof categories)[number])) throw new ApiError('The extracted listing has an unclear category. Review it manually.', 422);

    // Draft only: the user reviews and confirms before anything is published.
    return {
      draft: {
        title: extraction.title.slice(0, 160),
        organization: extraction.organization.slice(0, 160),
        category: extraction.category,
        location: extraction.location.slice(0, 160),
        industry: extraction.industry.slice(0, 160),
        description: extraction.description.slice(0, 2000),
        requirements: extraction.requirements.slice(0, 20),
        offers: extraction.offers.slice(0, 20),
        sourceUrl: url,
        evidence: extraction.evidence.slice(0, 10),
        confidence: extraction.confidence
      }
    };
  });
}
