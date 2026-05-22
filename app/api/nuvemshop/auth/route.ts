import { NextResponse } from 'next/server';
import { buildAuthorizationUrl } from '@/lib/nuvemshop';

// GET /api/nuvemshop/auth — redireciona para a tela de autorização da Nuvemshop
export async function GET() {
  try {
    const url = buildAuthorizationUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro de configuração';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
