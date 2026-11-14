import { z } from 'zod';
import { ApiError, handle, jsonBody, workspace, rateLimit } from '@/lib/session';
import { aiAvailable, chatJson } from '@/lib/ai';

export const runtime = 'nodejs';

const assistInput = z.object({
  text: z.string().trim().min(20).max(2000),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
});

const draftSchema = z.object({
  role: z.enum(['Startup', 'Candidate', 'Recruiter', 'Creator', 'Business', 'Event organiser', 'Sponsor / Brand']),
  industry: z.string().max(120),
  location: z.string().max(120),
  capabilities: z.array(z.string().max(80)).max(8),
  needs: z.array(z.string().max(80)).max(8),
  description: z.string().max(500),
});

const languageGuides = {
  en: 'Reply in simple English.',
  hi: 'शुद्ध हिंदी में उत्तर दें (सभी स्ट्रिंग फ़ील्ड हिंदी में)।',
  hinglish: 'Reply in natural Hinglish (Roman-script Hindi mixed with English, the way young Indians actually text, e.g. "Mujhe React aata hai, funding chahiye").',
} as const;

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    await rateLimit(request, `ai-assist:${session.id}`, 10, 60_000);
    if (!aiAvailable()) throw new ApiError('AI assist is not configured on this deployment (set LLM_API_KEY). You can still fill the form manually.', 503);
    const { text, language } = assistInput.parse(await jsonBody(request));
    const raw = await chatJson<unknown>([
      { role: 'system', content: `You extract a structured Opportunity DNA profile from the user's free-text self-description. ${languageGuides[language]} Keep capabilities and needs to short noun phrases (max 4 words each, max 8 items). description is 1-2 sentences in the same language.` },
      { role: 'user', content: text },
    ], 'dna-draft', {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['Startup', 'Candidate', 'Recruiter', 'Creator', 'Business', 'Event organiser', 'Sponsor / Brand'] },
        industry: { type: 'string' }, location: { type: 'string' },
        capabilities: { type: 'array', items: { type: 'string' } },
        needs: { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
      },
      required: ['role', 'industry', 'location', 'capabilities', 'needs', 'description'],
      additionalProperties: false,
    });
    const parsed = draftSchema.safeParse(raw);
    if (!parsed.success) throw new ApiError('The AI draft did not match the expected shape. Try again.', 502);
    const draft = parsed.data;
    return { draft: { ...draft, capabilities: draft.capabilities.slice(0, 8), needs: draft.needs.slice(0, 8) } };
  });
}
