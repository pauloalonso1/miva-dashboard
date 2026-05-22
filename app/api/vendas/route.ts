import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendas, itensVenda, produtos, clientes } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/vendas — lista todas as vendas com itens
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const canal     = searchParams.get('canal');
    const pagamento = searchParams.get('pagamento');

    const rows = await db.query.vendas.findMany({
      with: { itens: true },
      orderBy: [desc(vendas.data)],
    });

    let result = rows;
    if (canal)     result = result.filter(v => v.canal     === canal);
    if (pagamento) result = result.filter(v => v.pagamento === pagamento);

    return NextResponse.json(result.map(toClient));
  } catch (err) {
    console.error('[GET /api/vendas]', err);
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 });
  }
}

// POST /api/vendas — registra venda, baixa estoque, atualiza cliente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id ?? 'v_' + nanoid();

    await db.transaction(async (tx) => {
      // 1. Insere venda
      await tx.insert(vendas).values({
        id,
        data:         body.data ? new Date(body.data) : new Date(),
        canal:        body.canal,
        pagamento:    body.pagamento,
        parcelas:     body.parcelas ?? 1,
        valorBruto:   String(body.valorBruto),
        custoTotal:   String(body.custoTotal),
        taxa:         String(body.taxa),
        valorLiquido: String(body.valorLiquido),
        lucro:        String(body.lucro),
        clienteNome:  body.clienteNome ?? null,
        nuvemshopOrderId: body.nuvemshopOrderId ?? null,
      });

      // 2. Insere itens e baixa estoque
      for (const item of body.itens as ItemInput[]) {
        await tx.insert(itensVenda).values({
          vendaId:       id,
          produtoId:     item.produtoId,
          nome:          item.nome,
          quantidade:    item.quantidade,
          precoUnitario: String(item.precoUnitario),
          custoUnitario: String(item.custoUnitario),
        });

        // Baixar estoque
        const [prod] = await tx.select({ estoque: produtos.estoque })
          .from(produtos).where(eq(produtos.id, item.produtoId));
        if (prod) {
          await tx.update(produtos)
            .set({ estoque: Math.max(0, prod.estoque - item.quantidade), updatedAt: new Date() })
            .where(eq(produtos.id, item.produtoId));
        }
      }

      // 3. Upsert cliente
      if (body.clienteNome) {
        const [existing] = await tx.select().from(clientes).where(eq(clientes.nome, body.clienteNome));
        if (existing) {
          await tx.update(clientes).set({
            totalGasto: String(Number(existing.totalGasto) + Number(body.valorBruto)),
            compras:    existing.compras + 1,
            updatedAt:  new Date(),
          }).where(eq(clientes.nome, body.clienteNome));
        } else {
          await tx.insert(clientes).values({
            id:         'c_' + nanoid(),
            nome:       body.clienteNome,
            telefone:   '',
            cidade:     '',
            totalGasto: String(body.valorBruto),
            compras:    1,
          });
        }
      }
    });

    const [created] = await db.query.vendas.findMany({
      where: eq(vendas.id, id),
      with: { itens: true },
      limit: 1,
    });

    return NextResponse.json(toClient(created), { status: 201 });
  } catch (err) {
    console.error('[POST /api/vendas]', err);
    return NextResponse.json({ error: 'Erro ao registrar venda' }, { status: 500 });
  }
}

interface ItemInput {
  produtoId:     string;
  nome:          string;
  quantidade:    number;
  precoUnitario: number;
  custoUnitario: number;
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

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
