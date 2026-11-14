import { db } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET() {
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', database: 'up', time: new Date().toISOString() });
  } catch {
    return Response.json({ status: 'degraded', database: 'down', time: new Date().toISOString() }, { status: 503 });
  }
}
