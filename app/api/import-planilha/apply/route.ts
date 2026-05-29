import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { produtos } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

type ProdutoIn = {
  nome: string; referencia: string; vlCompra: number;
  despesa: number; preco: number; tipoBanho: string; estoque: number;
};

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: ProdutoIn[] } = await req.json();
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'Nenhum produto para importar.' }, { status: 400 });

    // Load existing products to match by referencia or nome
    const existing = await db.select({ id: produtos.id, referencia: produtos.referencia, nome: produtos.nome }).from(produtos);

    let created = 0, updated = 0;

    for (const item of items) {
      const custo = item.vlCompra + item.despesa;
      const vlCompraStr = String(item.vlCompra);
      const despesaStr  = String(item.despesa);
      const custoStr    = String(custo);
      const precoStr    = String(item.preco);

      // Match by referencia (if non-empty) or by nome
      const match = item.referencia
        ? existing.find(e => e.referencia === item.referencia)
        : existing.find(e => e.nome.toLowerCase() === item.nome.toLowerCase());

      if (match) {
        await db.update(produtos).set({
          nome:      item.nome,
          tipoBanho: item.tipoBanho,
          vlCompra:  vlCompraStr,
          despesa:   despesaStr,
          custo:     custoStr,
          preco:     precoStr,
          updatedAt: new Date(),
        }).where(eq(produtos.id, match.id));
        updated++;
      } else {
        await db.insert(produtos).values({
          id:         'p_' + nanoid(),
          nome:       item.nome,
          referencia: item.referencia || '',
          tipoBanho:  item.tipoBanho,
          vlCompra:   vlCompraStr,
          despesa:    despesaStr,
          custo:      custoStr,
          preco:      precoStr,
          estoque:    item.estoque ?? 1,
        });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (err) {
    console.error('[POST /api/import-planilha/apply]', err);
    return NextResponse.json({ error: 'Erro ao aplicar importação.' }, { status: 500 });
  }
}
