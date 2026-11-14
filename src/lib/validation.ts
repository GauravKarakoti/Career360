import { z } from 'zod';
export const roles = ['Startup', 'Candidate', 'Recruiter', 'Creator', 'Business', 'Event organiser', 'Sponsor / Brand'] as const;
export const categories = ['Partnerships', 'Funding', 'Jobs & internships', 'Events', 'Collaborations', 'Learning'] as const;
const text = z.string().trim().min(1).max(160);
const terms = z.array(z.string().trim().min(1).max(80)).min(1).max(20).transform(items => [...new Map(items.map(item => [item.toLocaleLowerCase(), item])).values()]);
const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(10).max(200);
export const signUpInput = z.object({ email, password, role: z.enum(roles) });
export const signInInput = z.object({ email, password });
export const recoverInput = z.object({ email, recoveryCode: z.string().trim().min(10).max(20), password });
export const profileInput = z.object({
  name: text, roles: z.array(z.enum(roles)).min(1).max(3), role: z.enum(roles).optional(),
  industry: text, location: text,
  description: z.string().trim().max(2000), stage: z.string().trim().max(160).default(''),
  interests: z.string().trim().max(500).default(''), constraints: z.string().trim().max(500).default(''), goals: z.string().trim().max(500).default(''),
  visibility: z.enum(['private', 'discoverable']).default('private'),
  capabilities: terms, needs: terms
});
export const opportunityInput = z.object({
  title: text, organization: text, category: z.enum(categories), location: text, industry: text,
  description: z.string().trim().min(20).max(2000), requirements: terms, offers: terms,
  sourceUrl: z.string().url().max(2000).refine(value => new URL(value).protocol === 'https:', 'Use an HTTPS source URL.').nullable(),
  evidence: z.array(z.object({ field: z.string().max(80), quote: z.string().max(1000) })).max(10).nullable(),
  deadline: z.string().datetime().nullable(),
});
