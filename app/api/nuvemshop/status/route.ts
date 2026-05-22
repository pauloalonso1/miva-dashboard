import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nuvemshopTokens } from '@/lib/schema';

// GET /api/nuvemshop/status — retorna se a loja está conectada
export async function GET() {
  try {
    const rows = await db.select({
      storeId:   nuvemshopTokens.storeId,
      updatedAt: nuvemshopTokens.updatedAt,
    }).from(nuvemshopTokens).limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected:  true,
      storeId:    rows[0].storeId,
      connectedAt: rows[0].updatedAt,
      authUrl:    `/api/nuvemshop/auth`,
    });
  } catch (err) {
    console.error('[GET /api/nuvemshop/status]', err);
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 });
  }
}
