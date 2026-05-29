import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

type ProdutoImport = {
  nome: string; referencia: string; vlCompra: number;
  despesa: number; preco: number; tipoBanho: string; estoque: number;
};

type Group = { colNome: number; colRef: number; colVlCompra: number; colDespesa: number; colPreco: number };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const produtos: ProdutoImport[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

      let headerIdx = -1;
      const groups: Group[] = [];

      // Scan rows for a header that contains PRODUTO + VL COMPRA
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].map((c) => String(c).toUpperCase().replace(/\s+/g, ' ').trim());

        // Find all columns named PRODUTOS (handles side-by-side product tables)
        for (let j = 0; j < row.length; j++) {
          if (!row[j].includes('PRODUTO')) continue;

          // Search for VL COMPRA in a window starting at j (covers same group)
          const winEnd = Math.min(row.length, j + 10);
          const segment = row.slice(j, winEnd);
          const vcRel = segment.findIndex(c => c.includes('VL') && c.includes('COMPRA'));
          if (vcRel < 0) continue;

          // Valid group found
          if (headerIdx < 0) headerIdx = i;

          const despRel   = segment.findIndex(c => c.includes('DESPESA'));
          const precoRel  = segment.findIndex(c =>
            (c.includes('VL') && c.includes('PROD')) ||
            (c.includes('VL') && c.includes('VENDA')) ||
            c.includes('PRECO') || c.includes('PREÇO')
          );

          // Reference column: look one column to the left (e.g. COD PECAS before PRODUTOS)
          const refAbsolute = j > 0 &&
            (row[j - 1].includes('COD') || row[j - 1].includes('REF') || row[j - 1].includes('PECAS') || row[j - 1].includes('PEÇAS'))
              ? j - 1 : -1;

          groups.push({
            colNome:     j,
            colRef:      refAbsolute,
            colVlCompra: j + vcRel,
            colDespesa:  despRel >= 0 ? j + despRel : -1,
            colPreco:    precoRel >= 0 ? j + precoRel : -1,
          });
        }

        if (groups.length > 0) break; // stop after finding the header row
      }

      if (headerIdx < 0) continue;

      // Extract product rows for every group found in this sheet
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];

        for (const g of groups) {
          const nome = String(row[g.colNome] ?? '').trim();
          if (!nome) continue;
          const nomeUp = nome.toUpperCase();
          if (nomeUp === 'TOTAL' || nomeUp.startsWith('TOTAL') || nomeUp.includes('BRINDE') || nomeUp.includes('PRESENTE')) continue;

          const vlCompra = parseFloat(String(row[g.colVlCompra] ?? '').replace(',', '.'));
          if (isNaN(vlCompra) || vlCompra <= 0) continue;

          const despesa    = g.colDespesa >= 0 ? (parseFloat(String(row[g.colDespesa] ?? '').replace(',', '.')) || 0) : 0;
          const preco      = g.colPreco   >= 0 ? (parseFloat(String(row[g.colPreco]   ?? '').replace(',', '.')) || 0) : 0;
          const referencia = g.colRef     >= 0 ? String(row[g.colRef] ?? '').trim() : '';

          produtos.push({
            nome,
            referencia,
            vlCompra,
            despesa:   isNaN(despesa) ? 0 : despesa,
            preco:     isNaN(preco)   ? 0 : preco,
            tipoBanho: 'Ouro 18k',
            estoque:   1,
          });
        }
      }
      // Continue to next sheet (don't break — collect from all sheets)
    }

    // De-duplicate by nome (case-insensitive) keeping first occurrence
    const seen = new Set<string>();
    const unique = produtos.filter(p => {
      const key = p.nome.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ produtos: unique, total: unique.length });
  } catch (err) {
    console.error('[POST /api/import-planilha]', err);
    return NextResponse.json({ error: 'Erro ao processar planilha.' }, { status: 500 });
  }
}
