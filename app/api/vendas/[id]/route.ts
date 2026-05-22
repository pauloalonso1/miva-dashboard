import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendas, itensVenda, produtos, clientes } from '@/lib/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET /api/vendas/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = await db.query.vendas.findMany({
    where: eq(vendas.id, id),
    with: { itens: true },
    limit: 1,
  });
  if (!rows[0]) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
  return NextResponse.json(toClient(rows[0]));
}

// DELETE /api/vendas/:id — exclui venda e estorna estoque
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    // 1. Carrega venda + itens
    const [venda] = await db.select().from(vendas).where(eq(vendas.id, id));
    if (!venda) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    const itens = await db.select().from(itensVenda).where(eq(itensVenda.vendaId, id));

    // 2. Estorna estoque
    for (const item of itens) {
      const [prod] = await db.select({ estoque: produtos.estoque })
        .from(produtos).where(eq(produtos.id, item.produtoId));
      if (prod) {
        await db.update(produtos)
          .set({ estoque: prod.estoque + item.quantidade, updatedAt: new Date() })
          .where(eq(produtos.id, item.produtoId));
      }
    }

    // 3. Ajusta cliente
    if (venda.clienteNome) {
      const [cliente] = await db.select().from(clientes).where(eq(clientes.nome, venda.clienteNome));
      if (cliente) {
        await db.update(clientes).set({
          totalGasto: String(Math.max(0, Number(cliente.totalGasto) - Number(venda.valorBruto))),
          compras:    Math.max(0, cliente.compras - 1),
          updatedAt:  new Date(),
        }).where(eq(clientes.nome, venda.clienteNome));
      }
    }

    // 4. Deleta venda (itens em cascade)
    await db.delete(vendas).where(eq(vendas.id, id));

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao excluir venda';
    console.error('[DELETE /api/vendas/:id]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type VendaWithItens = typeof vendas.$inferSelect & {
  itens: typeof itensVenda.$inferSelect[];
};

function toClient(v: VendaWithItens) {
  return {
    id:           v.id,
    data:         v.data.toISOString(),
    canal:        v.canal,
    pagamento:    v.pagamento,
    parcelas:     v.parcelas,
    valorBruto:   Number(v.valorBruto),
    custoTotal:   Number(v.custoTotal),
    taxa:         Number(v.taxa),
    valorLiquido: Number(v.valorLiquido),
    lucro:        Number(v.lucro),
    clienteNome:  v.clienteNome,
    nuvemshopOrderId: v.nuvemshopOrderId,
    itens: v.itens.map(i => ({
      produtoId:     i.produtoId,
      nome:          i.nome,
      quantidade:    i.quantidade,
      precoUnitario: Number(i.precoUnitario),
      custoUnitario: Number(i.custoUnitario),
    })),
  };
}
