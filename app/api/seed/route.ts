import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { produtos, vendas, itensVenda, clientes } from '@/lib/schema';

/**
 * POST /api/seed
 * Popula o banco com dados de demonstração (apenas se estiver vazio).
 * Chame uma vez após configurar DATABASE_URL.
 */
export async function POST() {
  const [existing] = await db.select({ id: produtos.id }).from(produtos).limit(1);
  if (existing) {
    return NextResponse.json({ ok: false, message: 'Banco já possui dados. Seed ignorado.' });
  }

  const PRODUTOS_SEED = [
    { id: 'p_arg01', nome: 'Argola Texturizada Pequena', referencia: 'AR-001', tipoBanho: 'Ouro 18k',  custo: 18,  preco: 65,  estoque: 14, fornecedor: 'Atelier Belle' },
    { id: 'p_col02', nome: 'Colar Ponto de Luz',         referencia: 'CL-014', tipoBanho: 'Ouro 18k',  custo: 32,  preco: 119, estoque: 9,  fornecedor: 'Atelier Belle' },
    { id: 'p_ane03', nome: 'Anel Solitário Cravejado',   referencia: 'AN-022', tipoBanho: 'Ouro 18k',  custo: 28,  preco: 95,  estoque: 17, fornecedor: 'Casa Aurora'   },
    { id: 'p_pul04', nome: 'Pulseira Veneziana',         referencia: 'PL-009', tipoBanho: 'Ouro 18k',  custo: 24,  preco: 89,  estoque: 4,  fornecedor: 'Casa Aurora'   },
    { id: 'p_tor05', nome: 'Tornozeleira Lasinha',       referencia: 'TZ-003', tipoBanho: 'Ródio',     custo: 14,  preco: 49,  estoque: 22, fornecedor: 'Linha Prata'   },
    { id: 'p_bri06', nome: 'Brinco Gota Cristal',        referencia: 'BR-031', tipoBanho: 'Ouro 18k',  custo: 22,  preco: 79,  estoque: 11, fornecedor: 'Atelier Belle' },
    { id: 'p_col07', nome: 'Choker Elos Quadrados',      referencia: 'CL-040', tipoBanho: 'Ouro 18k',  custo: 38,  preco: 139, estoque: 6,  fornecedor: 'Casa Aurora'   },
    { id: 'p_ane08', nome: 'Aliança Trabalhada Larga',   referencia: 'AN-055', tipoBanho: 'Ouro 18k',  custo: 31,  preco: 109, estoque: 8,  fornecedor: 'Atelier Belle' },
  ];

  await db.insert(produtos).values(
    PRODUTOS_SEED.map(p => ({ ...p, custo: String(p.custo), preco: String(p.preco) }))
  );

  // Vendas de exemplo (últimos 18 dias)
  const now = new Date();
  const diasAtras = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(10 + (n % 8), 15 + (n % 30));
    return d;
  };

  const TAXAS: Record<string, number> = {
    pix: 0, dinheiro: 0, debito: 0.015, credito_vista: 0.035, credito_parcelado: 0.065,
  };

  const VENDAS_SEED = [
    { id: 'v_s01', canal: 'cidade', pagamento: 'pix',               parcelas: 1, clienteNome: 'Marina S.',  daysAgo: 0,  itens: [['p_arg01',1],['p_bri06',1]] },
    { id: 'v_s02', canal: 'online', pagamento: 'credito_parcelado', parcelas: 3, clienteNome: 'Beatriz L.', daysAgo: 1,  itens: [['p_col02',1],['p_ane03',1]] },
    { id: 'v_s03', canal: 'cidade', pagamento: 'debito',            parcelas: 1, clienteNome: 'Camila R.',  daysAgo: 2,  itens: [['p_tor05',1]] },
    { id: 'v_s04', canal: 'online', pagamento: 'pix',               parcelas: 1, clienteNome: 'Ana P.',     daysAgo: 3,  itens: [['p_col07',1]] },
    { id: 'v_s05', canal: 'cidade', pagamento: 'credito_vista',     parcelas: 1, clienteNome: 'Marina S.',  daysAgo: 5,  itens: [['p_ane08',1],['p_arg01',1]] },
    { id: 'v_s06', canal: 'online', pagamento: 'credito_parcelado', parcelas: 2, clienteNome: 'Júlia M.',   daysAgo: 7,  itens: [['p_pul04',1],['p_bri06',2]] },
    { id: 'v_s07', canal: 'cidade', pagamento: 'dinheiro',          parcelas: 1, clienteNome: null,         daysAgo: 9,  itens: [['p_tor05',2]] },
    { id: 'v_s08', canal: 'online', pagamento: 'pix',               parcelas: 1, clienteNome: 'Beatriz L.', daysAgo: 12, itens: [['p_col02',1]] },
    { id: 'v_s09', canal: 'cidade', pagamento: 'debito',            parcelas: 1, clienteNome: 'Camila R.',  daysAgo: 14, itens: [['p_ane03',2]] },
    { id: 'v_s10', canal: 'online', pagamento: 'credito_vista',     parcelas: 1, clienteNome: 'Sofia A.',   daysAgo: 18, itens: [['p_arg01',1],['p_col02',1]] },
  ];

  const prodMap = Object.fromEntries(PRODUTOS_SEED.map(p => [p.id, p]));
  const clienteMap = new Map<string, { totalGasto: number; compras: number }>();

  for (const v of VENDAS_SEED) {
    const taxa = TAXAS[v.pagamento] ?? 0;
    const itensCalc = v.itens.map(([pid, qty]) => {
      const p = prodMap[pid as string];
      return { produtoId: pid as string, nome: p.nome, quantidade: qty as number, precoUnitario: p.preco, custoUnitario: p.custo };
    });
    const valorBruto  = itensCalc.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
    const custoTotal  = itensCalc.reduce((s, i) => s + i.custoUnitario * i.quantidade, 0);
    const valorLiquido = valorBruto * (1 - taxa);
    const lucro       = valorLiquido - custoTotal;

    await db.insert(vendas).values({
      id:           v.id,
      data:         diasAtras(v.daysAgo),
      canal:        v.canal,
      pagamento:    v.pagamento,
      parcelas:     v.parcelas,
      valorBruto:   String(valorBruto),
      custoTotal:   String(custoTotal),
      taxa:         String(taxa),
      valorLiquido: String(valorLiquido),
      lucro:        String(lucro),
      clienteNome:  v.clienteNome,
    });

    for (const item of itensCalc) {
      await db.insert(itensVenda).values({
        vendaId:       v.id,
        produtoId:     item.produtoId,
        nome:          item.nome,
        quantidade:    item.quantidade,
        precoUnitario: String(item.precoUnitario),
        custoUnitario: String(item.custoUnitario),
      });
    }

    if (v.clienteNome) {
      const cur = clienteMap.get(v.clienteNome) ?? { totalGasto: 0, compras: 0 };
      clienteMap.set(v.clienteNome, { totalGasto: cur.totalGasto + valorBruto, compras: cur.compras + 1 });
    }
  }

  for (const [nome, stats] of Array.from(clienteMap)) {
    await db.insert(clientes).values({
      id:         'c_' + nome.replace(/\s/g, '').toLowerCase(),
      nome,
      totalGasto: String(stats.totalGasto),
      compras:    stats.compras,
    });
  }

  return NextResponse.json({ ok: true, message: 'Dados de demonstração criados com sucesso.' });
}
