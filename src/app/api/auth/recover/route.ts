import { db } from '@/lib/db';
import { ApiError, handle, jsonBody } from '@/lib/session';
import { generateRecoveryCode, hashSecret, recoveryCodeHash, verifySecret } from '@/lib/auth';
import { recoverInput } from '@/lib/validation';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return handle(request, async () => {
    const input = recoverInput.parse(await jsonBody(request));
    const account = await db().account.findUnique({ where: { email: input.email } });
    if (!account || recoveryCodeHash(input.recoveryCode) !== account.recoveryCodeHash) throw new ApiError('Email or recovery code is incorrect.', 401);
    const nextCode = generateRecoveryCode();
    await db().account.update({
      where: { id: account.id },
      data: { passwordHash: await hashSecret(input.password), recoveryCodeHash: recoveryCodeHash(nextCode) }
    });
    return { ok: true, recoveryCode: nextCode };
  });
}
