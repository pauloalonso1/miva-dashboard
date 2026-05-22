import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { produtos, nuvemshopTokens } from '@/lib/schema';
import { listProducts } from '@/lib/nuvemshop';
import { eq } from 'drizzle-orm';

/**
 * POST /api/nuvemshop/sync/produtos
 * Importa produtos do catálogo Nuvemshop para a base local.
 * Produtos já existentes (mesmo nuvemshop_product_id) são atualizados.
 * Produtos novos são criados com estoque zerado (gerenciar localmente).
 */
export async function POST() {
  try {
    const [tokenRow] = await db.select().from(nuvemshopTokens).limit(1);
    if (!tokenRow) {
      return NextResponse.json(
        { error: 'Nuvemshop não conectada. Acesse /api/nuvemshop/auth primeiro.' },
        { status: 401 },
      );
    }

    const creds = { storeId: tokenRow.storeId, accessToken: tokenRow.accessToken };
    const produtosNS = await listProducts(creds);

    let created = 0;
    let updated = 0;

    for (const p of produtosNS) {
      const variant   = p.variants[0];
      if (!variant) continue;

      const nsId = String(p.id);
      const nome = p.name.pt ?? p.name[Object.keys(p.name)[0] as 'pt'] ?? 'Sem nome';
      const preco = Number(variant.price ?? 0);
      const custo = Number(variant.cost_price ?? 0);
      const sku   = variant.sku ?? nsId;

      const [existing] = await db.select({ id: produtos.id })
        .from(produtos)
        .where(eq(produtos.nuvemshopProductId, nsId));

      const imagemUrl = p.images?.[0]?.src ?? null;

      if (existing) {
        await db.update(produtos).set({
          nome,
          referencia: sku,
          preco:      String(preco),
          custo:      String(custo),
          imagemUrl,
          updatedAt:  new Date(),
        }).where(eq(produtos.id, existing.id));
        updated++;
      } else {
        await db.insert(produtos).values({
          id:                 'p_ns_' + nsId,
          nome,
          referencia:         sku,
          tipoBanho:          '',
          custo:              String(custo),
          preco:              String(preco),
          estoque:            variant.stock ?? 0,
          imagemUrl,
          nuvemshopProductId: nsId,
        });
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      summary: { total: produtosNS.length, created, updated },
    });
  } catch (err) {
    console.error('[POST /api/nuvemshop/sync/produtos]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao sincronizar produtos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
