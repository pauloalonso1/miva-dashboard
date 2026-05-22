import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/nuvemshop';
import { db } from '@/lib/db';
import { nuvemshopTokens } from '@/lib/schema';

// GET /api/nuvemshop/callback?code=XXX
// A Nuvemshop redireciona aqui após o lojista autorizar o app.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Código de autorização ausente' }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken(code);
    const storeId = String(token.user_id);

    // Upsert token na base
    await db
      .insert(nuvemshopTokens)
      .values({
        storeId,
        accessToken: token.access_token,
        updatedAt:   new Date(),
      })
      .onConflictDoUpdate({
        target: nuvemshopTokens.storeId,
        set: {
          accessToken: token.access_token,
          updatedAt:   new Date(),
        },
      });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return NextResponse.redirect(`${appUrl}/index.html?nuvemshop=conectado`);
  } catch (err) {
    console.error('[GET /api/nuvemshop/callback]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao conectar Nuvemshop';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
