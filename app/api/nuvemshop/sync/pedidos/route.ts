import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendas, itensVenda, clientes, produtos, nuvemshopTokens } from '@/lib/schema';
import { listOrders } from '@/lib/nuvemshop';
import { eq } from 'drizzle-orm';

const TAXAS_GATEWAY: Record<string, number> = {
  mercadopago:  0.035,
  pagseguro:    0.035,
  pagbank:      0.035,
  paypal:       0.040,
  pix:          0.000,
};

function guessTaxa(gateway: string): number {
  const key = gateway.toLowerCase().replace(/[^a-z]/g, '');
  return TAXAS_GATEWAY[key] ?? 0.035;
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * POST /api/nuvemshop/sync/pedidos
 * Importa pedidos pagos da Nuvemshop como vendas do canal "online".
 * Pedidos já importados (mesmo nuvemshop_order_id) são ignorados.
 */
export async function POST(req: NextRequest) {
  try {
    const [tokenRow] = await db.select().from(nuvemshopTokens).limit(1);
    if (!tokenRow) {
      return NextResponse.json(
        { error: 'Nuvemshop não conectada. Acesse /api/nuvemshop/auth primeiro.' },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({})) as { paginas?: number };
    const totalPages = body.paginas ?? 1;
    const creds = { storeId: tokenRow.storeId, accessToken: tokenRow.accessToken };

    let created = 0;
    let skipped = 0;

    for (let page = 1; page <= totalPages; page++) {
      const orders = await listOrders(creds, { page, per_page: 200, status: 'paid' });

      for (const order of orders) {
        const nsOrderId = String(order.id);

        // Verifica se já importado
        const [existing] = await db.select({ id: vendas.id })
          .from(vendas).where(eq(vendas.nuvemshopOrderId, nsOrderId));
        if (existing) { skipped++; continue; }

        const taxa        = guessTaxa(order.gateway ?? '');
        const valorBruto  = Number(order.total);
        const valorLiquido = valorBruto * (1 - taxa);

        // Calcula custo a partir dos produtos locais
        let custoTotal = 0;
        const itens: Array<{
          produtoId: string; nome: string; quantidade: number;
          precoUnitario: number; custoUnitario: number;
        }> = [];

        for (const item of order.products) {
          const nsProductId = String(item.product_id);
          const [prod] = await db.select({ id: produtos.id, custo: produtos.custo })
            .from(produtos).where(eq(produtos.nuvemshopProductId, nsProductId));

          const custoUnitario = prod ? Number(prod.custo) : 0;
          custoTotal += custoUnitario * item.quantity;

          itens.push({
            produtoId:     prod?.id ?? nsProductId,
            nome:          item.name,
            quantidade:    item.quantity,
            precoUnitario: Number(item.price),
            custoUnitario,
          });
        }

        const lucro = valorLiquido - custoTotal;
        const vendaId = 'v_ns_' + nanoid();
        const clienteNome = order.customer?.name ?? null;

        await db.transaction(async (tx) => {
          await tx.insert(vendas).values({
            id:               vendaId,
            data:             new Date(order.created_at),
            canal:            'online',
            pagamento:        order.gateway ?? 'online',
            parcelas:         1,
            valorBruto:       String(valorBruto),
            custoTotal:       String(custoTotal),
            taxa:             String(taxa),
            valorLiquido:     String(valorLiquido),
            lucro:            String(lucro),
            clienteNome,
            nuvemshopOrderId: nsOrderId,
          });

          for (const item of itens) {
            await tx.insert(itensVenda).values({
              vendaId,
              produtoId:     item.produtoId,
              nome:          item.nome,
              quantidade:    item.quantidade,
              precoUnitario: String(item.precoUnitario),
              custoUnitario: String(item.custoUnitario),
            });
          }

          // Upsert cliente
          if (clienteNome) {
            const [existingCliente] = await tx.select().from(clientes).where(eq(clientes.nome, clienteNome));
            if (existingCliente) {
              await tx.update(clientes).set({
                totalGasto: String(Number(existingCliente.totalGasto) + valorBruto),
                compras:    existingCliente.compras + 1,
                updatedAt:  new Date(),
              }).where(eq(clientes.nome, clienteNome));
            } else {
              await tx.insert(clientes).values({
                id:         'c_ns_' + nanoid(),
                nome:       clienteNome,
                totalGasto: String(valorBruto),
                compras:    1,
              });
            }
          }
        });

        created++;
      }
    }

    return NextResponse.json({ ok: true, summary: { created, skipped } });
  } catch (err) {
    console.error('[POST /api/nuvemshop/sync/pedidos]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao sincronizar pedidos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
