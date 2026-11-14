import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';

const cookieName = 'o360_workspace';
export async function workspace(create = false) {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) {
    const record = await db().workspace.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') } });
    if (record && record.expiresAt > new Date()) return record;
  }
  if (!create) throw new ApiError('Your workspace session expired. Reload to start a private workspace.', 401);
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  const record = await db().workspace.create({ data: { tokenHash: createHash('sha256').update(raw).digest('hex'), expiresAt } });
  jar.set(cookieName, raw, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt });
  return record;
}
export async function clearSession() { (await cookies()).delete(cookieName); }
export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const buckets = new Map<string, { count: number; until: number }>();
export function guard(request: Request) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host') && new URL(origin).host !== request.headers.get('x-forwarded-host')) throw new ApiError('Cross-origin changes are not allowed.', 403);
  }
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  if (buckets.size > 10000) for (const [id, item] of buckets) if (item.until < now) buckets.delete(id);
  let bucket = buckets.get(key);
  if (!bucket || bucket.until < now) { bucket = { count: 0, until: now + 60000 }; buckets.set(key, bucket); }
  if (++bucket.count > 120) throw new ApiError('Too many requests. Please try again in a minute.', 429);
}
export async function jsonBody(request: Request) {
  const body = await request.text();
  if (body.length > 20000) throw new ApiError('Please keep your submission under 20 KB.', 413);
  try { return JSON.parse(body); } catch { throw new ApiError('Send a valid JSON request.'); }
}
export async function handle(request: Request, action: () => Promise<unknown>) {
  try { guard(request); return Response.json(await action(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
    if (error && typeof error === 'object' && 'issues' in error) return Response.json({ error: 'Check the required fields and text lengths, then try again.' }, { status: 400 });
    console.error('Workspace API error', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ error: 'We could not reach your workspace. Please try again.' }, { status: 500 });
  }
}
