import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { generateRecoveryCode, hashSecret, recoveryCodeHash } from '@/lib/auth';
import { signUpInput } from '@/lib/validation';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return handle(request, async () => {
    const rawBody = await jsonBody(request);
    console.log('[sign-up] incoming body:', rawBody);

    const parsed = signUpInput.safeParse(rawBody);
    if (!parsed.success) {
      console.error('[sign-up] Zod validation failed:', parsed.error.flatten());
      throw parsed.error;
    }
    const input = parsed.data;
    const existing = await db().account.findUnique({ where: { email: input.email } });
    if (existing) throw new ApiError('An account with this email already exists. Sign in instead.', 409);
    const current = await workspace(true);
    if (current.accountId) throw new ApiError('This workspace is already signed in. Sign out first to create a new account.', 409);
    const recoveryCode = generateRecoveryCode();
    await db().account.create({
      data: {
        email: input.email,
        passwordHash: await hashSecret(input.password),
        recoveryCodeHash: recoveryCodeHash(recoveryCode),
        primaryRole: input.role,
        workspaces: { connect: { id: current.id } }
      }
    });
    return { email: input.email, recoveryCode };
  });
}
