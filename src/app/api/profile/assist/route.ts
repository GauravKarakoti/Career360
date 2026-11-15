import { z } from 'zod';
import { ApiError, handle, jsonBody, workspace, rateLimit } from '@/lib/session';
import { aiAvailable, chatJson } from '@/lib/ai';

export const runtime = 'nodejs';

const assistInput = z.object({
  text: z.string().trim().min(20).max(2000),
  language: z.enum(['en', 'hi', 'mr']).default('en'),
});

const stringOrJoinedArray = (maxLen: number) =>
  z
    .union([
      z.string(),
      z.array(z.string()).transform((items) => items.join(', ')),
    ])
    .transform((val) => val.trim().slice(0, maxLen));

const draftSchema = z.object({
  name: z.string().trim().max(160).optional().default(''),
  role: z.enum([
    'Startup',
    'Candidate',
    'Recruiter',
    'Creator',
    'Business',
    'Event organiser',
    'Sponsor / Brand',
  ]),
  industry: z.string().trim().max(120),
  location: z.string().trim().max(120),
  capabilities: z.array(z.string().trim().max(80)).max(8),
  needs: z.array(z.string().trim().max(80)).max(8),
  description: z.string().trim().max(500),
  stage: stringOrJoinedArray(500).optional().default(''),
  interests: stringOrJoinedArray(500).optional().default(''),
  constraints: stringOrJoinedArray(500).optional().default(''),
  goals: stringOrJoinedArray(500).optional().default(''),
});

const languageGuides = {
  en: 'Reply in simple English.',
  hi: 'शुद्ध हिंदी में उत्तर दें ("role" को छोड़कर अन्य सभी स्ट्रिंग फ़ील्ड हिंदी में लिखें)।',
  mr: 'स्पष्ट मराठीत उत्तर द्या ("role" वगळता इतर सर्व स्ट्रिंग फील्ड मराठीत लिहा).',
} as const;

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    await rateLimit(request, `ai-assist:${session.id}`, 10, 60_000);
    if (!aiAvailable()) {
      throw new ApiError(
        'AI assist is not configured on this deployment (set GROQ_API_KEY). You can still fill the form manually.',
        503
      );
    }

    const { text, language } = assistInput.parse(await jsonBody(request));

    const raw = await chatJson<unknown>(
      [
        {
          role: 'system',
          content: [
            `You extract a structured Opportunity DNA profile from the user's free-text self-description.`,
            languageGuides[language],
            `Rules:`,
            `- "role" MUST be one of the exact English enum values.`,
            `- "name": extract the user's or organization's name ONLY if explicitly stated in the text; otherwise return "".`,
            `- "capabilities" and "needs": short noun phrases (max 4 words each, max 8 items).`,
            `- "description": 1-2 sentences summarizing their profile in the target language.`,
            `- "stage": current career, academic, or company stage (e.g. "Final-year student", "Pre-seed", "Series A") or "" if not mentioned.`,
            `- "interests": comma-separated domains or topics they care about (e.g. "FinTech, AI agents, Open source") or "" if not mentioned.`,
            `- "constraints": comma-separated constraints (e.g. "Remote only, 20 hrs/week, Bootstrapped") or "" if not mentioned.`,
            `- "goals": concrete next outcome they want to achieve (e.g. "Land a summer internship, raise seed round") or "" if not mentioned.`,
          ].join('\n'),
        },
        { role: 'user', content: text },
      ],
      'dna-draft',
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: {
            type: 'string',
            enum: [
              'Startup',
              'Candidate',
              'Recruiter',
              'Creator',
              'Business',
              'Event organiser',
              'Sponsor / Brand',
            ],
          },
          industry: { type: 'string' },
          location: { type: 'string' },
          capabilities: { type: 'array', items: { type: 'string' } },
          needs: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          stage: { type: 'string' },
          interests: { type: 'string' },
          constraints: { type: 'string' },
          goals: { type: 'string' },
        },
        required: [
          'name',
          'role',
          'industry',
          'location',
          'capabilities',
          'needs',
          'description',
          'stage',
          'interests',
          'constraints',
          'goals',
        ],
        additionalProperties: false,
      }
    );

    const parsed = draftSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError('The AI draft did not match the expected shape. Try again.', 502);
    }

    const draft = parsed.data;
    return {
      draft: {
        ...draft,
        capabilities: draft.capabilities.slice(0, 8),
        needs: draft.needs.slice(0, 8),
      },
    };
  });
}