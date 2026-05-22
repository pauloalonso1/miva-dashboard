import { NextRequest, NextResponse } from 'next/server';
import { checkCredentials, createToken, COOKIE_NAME } from '@/lib/auth';

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, { status: 429 });
  }

  const { login, senha, rememberMe } = await req.json();

  if (!checkCredentials(login, senha)) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const token = await createToken(Boolean(rememberMe));

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
  });

  return res;
}
