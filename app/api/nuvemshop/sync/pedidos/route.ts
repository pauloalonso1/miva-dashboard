import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendas, itensVenda, clientes, produtos, nuvemshopTokens } from '@/lib/schema';
import { listOrders } from '@/lib/nuvemshop';
import { eq, inArray } from 'drizzle-orm';

const TAXAS_GATEWAY: Record<string, number> = {
  mercadopago:  0.035,
  pagseguro:    0.035,
  pagbank:      0.035,
  paypal:       0.040,
  pix:          0.000,
  boleto:       0.000,
};

function guessTaxa(gateway: string): number {
  const key = gateway.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(TAXAS_GATEWAY)) {
    if (key.includes(k)) return v;
  }
  return 0.035;
}

function nanoid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
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

    // Busca pedidos com qualquer status de pagamento válido:
    // 'paid' = capturado, 'authorized' = aprovado aguardando captura (MercadoPago BR)
    // Pedidos pendentes/cancelados são filtrados abaixo
    const VALID_PAYMENT_STATUSES = new Set(['paid', 'authorized', 'partially_paid']);

    for (let page = 1; page <= totalPages; page++) {
      const orders = await listOrders(creds, { page, per_page: 200 });
      if (!orders.length) break;
      // Filtra localmente para não depender de qual status a Nuvemshop usa
      const pagos = orders.filter(o =>
        VALID_PAYMENT_STATUSES.has((o.payment_status ?? '').toLowerCase()) ||
        VALID_PAYMENT_STATUSES.has((o as any).financial_status?.toLowerCase() ?? '')
      );
      if (!pagos.length) continue;

      // Batch: collect all NS order IDs and product IDs from valid orders
      const nsOrderIds   = pagos.map(o => String(o.id));
      const nsProductIds = [...new Set(pagos.flatMap(o => o.products.map(p => String(p.product_id))))];

      // Single query to find already-imported orders
      const existingOrders = await db
        .select({ nuvemshopOrderId: vendas.nuvemshopOrderId })
        .from(vendas)
        .where(inArray(vendas.nuvemshopOrderId, nsOrderIds));
      const importedSet = new Set(existingOrders.map(r => r.nuvemshopOrderId));

      // Single query for all products referenced in this page
      const prodMap = new Map<string, { id: string; custo: string }>();
      if (nsProductIds.length > 0) {
        const prods = await db
          .select({ id: produtos.id, custo: produtos.custo, nuvemshopProductId: produtos.nuvemshopProductId })
          .from(produtos)
          .where(inArray(produtos.nuvemshopProductId, nsProductIds));
        prods.forEach(p => { if (p.nuvemshopProductId) prodMap.set(p.nuvemshopProductId, { id: p.id, custo: p.custo ?? '0' }); });
      }

      for (const order of pagos) {
        const nsOrderId = String(order.id);
        if (importedSet.has(nsOrderId)) { skipped++; continue; }

        const taxa         = guessTaxa(order.gateway ?? '');
        const valorBruto   = Number(order.total ?? 0);
        const valorLiquido = valorBruto * (1 - taxa);

        let custoTotal = 0;
        const itens: Array<{
          produtoId: string; nome: string; quantidade: number;
          precoUnitario: number; custoUnitario: number;
        }> = [];

        for (const item of order.products) {
          const nsProductId   = String(item.product_id);
          const prod          = prodMap.get(nsProductId);
          const custoUnitario = prod ? Number(prod.custo) : 0;
          custoTotal += custoUnitario * item.quantity;
          itens.push({
            produtoId:     prod?.id ?? ('p_ns_' + nsProductId),
            nome:          item.name ?? 'Produto',
            quantidade:    item.quantity ?? 1,
            precoUnitario: Number(item.price ?? 0),
            custoUnitario,
          });
        }

        const lucro       = valorLiquido - custoTotal;
        const vendaId     = 'v_ns_' + nanoid();
        const clienteNome = order.customer?.name?.trim() || null;

        try {
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

            if (itens.length > 0) {
              await tx.insert(itensVenda).values(
                itens.map(item => ({
                  vendaId,
                  produtoId:     item.produtoId,
                  nome:          item.nome,
                  quantidade:    item.quantidade,
                  precoUnitario: String(item.precoUnitario),
                  custoUnitario: String(item.custoUnitario),
                }))
              );
            }

            if (clienteNome) {
              const [existing] = await tx.select({ id: clientes.id, totalGasto: clientes.totalGasto, compras: clientes.compras })
                .from(clientes).where(eq(clientes.nome, clienteNome));
              if (existing) {
                await tx.update(clientes).set({
                  totalGasto: String(Number(existing.totalGasto) + valorBruto),
                  compras:    existing.compras + 1,
                  updatedAt:  new Date(),
                }).where(eq(clientes.id, existing.id));
              } else {
                await tx.insert(clientes).values({
                  id: 'c_ns_' + nanoid(), nome: clienteNome,
                  totalGasto: String(valorBruto), compras: 1,
                });
              }
            }
          });
          created++;
        } catch (txErr) {
          console.error('[sync/pedidos] falhou pedido', nsOrderId, txErr);
          skipped++;
        }
      }
    }

    return NextResponse.json({ ok: true, summary: { created, skipped } });
  } catch (err) {
    console.error('[POST /api/nuvemshop/sync/pedidos]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao sincronizar pedidos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
