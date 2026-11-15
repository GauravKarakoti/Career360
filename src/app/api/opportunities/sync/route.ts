import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, rateLimit, workspace } from '@/lib/session';
import { syncOpportunitiesForDna } from '@/lib/web-discovery';

export const runtime = 'nodejs';

const syncBodySchema = z
  .object({
    force: z.boolean().optional().default(false),
  })
  .optional();

export async function POST(request: Request) {
  return handle(request, async () => {
    const session = await workspace();
    await rateLimit(request, `dna-sync:${session.id}`, 12, 60_000);

    const rawBody = await jsonBody(request).catch(() => ({}));
    const parsedBody = syncBodySchema.parse(rawBody);

    const profile = await db().profile.findUnique({
      where: { workspaceId: session.id },
      include: { capabilities: true, needs: true },
    });

    if (!profile) {
      throw new ApiError(
        'Build your Opportunity DNA first so we know which opportunities to fetch for you.',
        400
      );
    }

    const result = await syncOpportunitiesForDna(
      {
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
      },
      { force: parsedBody?.force ?? false }
    );

    return {
      ok: true,
      ...result,
    };
  });
}