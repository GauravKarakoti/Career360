import { db } from '@/lib/db';
import { ApiError, handle, jsonBody, workspace } from '@/lib/session';
import { rateLimit } from '@/lib/session';
import { adoptWorkspace, verifySecret } from '@/lib/auth';
import { signInInput } from '@/lib/validation';
export const runtime = 'nodejs';
export async function POST(request: Request) {

  return handle(request, async () => {
    rateLimit(request, 'auth', 10);
    const input = await signInInput.parseAsync(await jsonBody(request)).catch(() => { throw new ApiError('Enter your email and password.'); });
    const account = await db().account.findUnique({ where: { email: input.email } });
    if (!account || !(await verifySecret(input.password, account.passwordHash))) throw new ApiError('Email or password is incorrect.', 401);
    const current = await workspace(true);
    await adoptWorkspace(account.id, current.id);
    return { email: account.email };
  });
}
