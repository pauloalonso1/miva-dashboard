import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'miva-secret-fallback-change-in-prod'
);

export const COOKIE_NAME = 'miva_session';

export function checkCredentials(login: string, senha: string): boolean {
  const expectedLogin = process.env.AUTH_LOGIN ?? 'miva';
  const expectedSenha = process.env.AUTH_SENHA ?? 'Miva2425';
  return login === expectedLogin && senha === expectedSenha;
}

export async function createToken(rememberMe: boolean): Promise<string> {
  return new SignJWT({ user: 'miva' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? '30d' : '24h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}
