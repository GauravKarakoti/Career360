import { NextResponse } from 'next/server';
import { guard } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  guard(request);
  const response = NextResponse.json({ signedOut: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('o360_workspace', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: new Date(0) });
  return response;
}
