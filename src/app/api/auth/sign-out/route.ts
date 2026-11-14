import { clearSession, handle } from '@/lib/session';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return handle(request, async () => {
    clearSession();
    return { signedOut: true };
  });
}
