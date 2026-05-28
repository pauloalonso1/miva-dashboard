import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const produtos: {
      nome: string; referencia: string; vlCompra: number;
      despesa: number; preco: number; tipoBanho: string; estoque: number;
    }[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

      let headerIdx = -1;
      let colNome = -1, colRef = -1, colVlCompra = -1, colDespesa = -1, colPreco = -1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].map((c) => String(c).toUpperCase().replace(/\s+/g, ' ').trim());
        const nomIdx = row.findIndex(c => c.includes('PRODUTO'));
        const vcIdx  = row.findIndex(c => c.includes('VL COMPRA') || (c.includes('VL') && c.includes('COMPRA')));

        if (nomIdx >= 0 && vcIdx >= 0) {
          headerIdx   = i;
          colNome     = nomIdx;
          colVlCompra = vcIdx;
          colRef      = row.findIndex(c => c.includes('COD') || c.includes('REFERENCIA') || c.includes('REFERÊNCIA') || c.includes('PECAS') || c.includes('PEÇAS'));
          colDespesa  = row.findIndex(c => c.includes('DESPESA'));
          colPreco    = row.findIndex(c => c.includes('VL VENDA') || c.includes('VENDA') || c.includes('VL PROD') || c.includes('PRECO') || c.includes('PREÇO'));
          break;
        }
      }

      if (headerIdx < 0) continue;

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const nome = String(row[colNome] ?? '').trim();
        if (!nome) continue;
        const nomeUp = nome.toUpperCase();
        if (nomeUp === 'TOTAL' || nomeUp.startsWith('TOTAL') || nomeUp.includes('BRINDE') || nomeUp.includes('PRESENTE')) continue;

        const vlCompra = parseFloat(String(row[colVlCompra] ?? '').replace(',', '.'));
        if (isNaN(vlCompra) || vlCompra <= 0) continue;

        const despesa  = colDespesa >= 0 ? (parseFloat(String(row[colDespesa] ?? '').replace(',', '.')) || 0) : 0;
        const preco    = colPreco   >= 0 ? (parseFloat(String(row[colPreco]   ?? '').replace(',', '.')) || 0) : 0;
        const referencia = colRef   >= 0 ? String(row[colRef] ?? '').trim() : '';

        produtos.push({ nome, referencia, vlCompra, despesa: isNaN(despesa) ? 0 : despesa, preco: isNaN(preco) ? 0 : preco, tipoBanho: 'Ouro 18k', estoque: 1 });
      }

      if (produtos.length > 0) break;
    }

    return NextResponse.json({ produtos, total: produtos.length });
  } catch (err) {
    console.error('[POST /api/import-planilha]', err);
    return NextResponse.json({ error: 'Erro ao processar planilha.' }, { status: 500 });
  }
}
