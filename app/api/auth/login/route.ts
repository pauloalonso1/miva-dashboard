import { NextRequest, NextResponse } from 'next/server';
import { checkCredentials, createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
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
