import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { produtos } from '@/lib/schema';

// GET /api/produtos — lista todos os produtos
export async function GET() {
  try {
    const rows = await db.select().from(produtos).orderBy(produtos.nome);
    return NextResponse.json(rows.map(toClient));
  } catch (err) {
    console.error('[GET /api/produtos]', err);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

// POST /api/produtos — cria produto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db.insert(produtos).values({
      id:        body.id        ?? 'p_' + nanoid(),
      nome:      body.nome,
      referencia: body.referencia,
      tipoBanho: body.tipoBanho,
      custo:     String(body.custo),
      preco:     String(body.preco),
      estoque:   body.estoque ?? 0,
      fornecedor: body.fornecedor ?? null,
    }).returning();
    return NextResponse.json(toClient(created), { status: 201 });
  } catch (err) {
    console.error('[POST /api/produtos]', err);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}

// Mapeia db row → formato esperado pelo front (números como number, não string)
function toClient(row: typeof produtos.$inferSelect) {
  return {
    id:         row.id,
    nome:       row.nome,
    referencia: row.referencia,
    tipoBanho:  row.tipoBanho,
    custo:      Number(row.custo),
    preco:      Number(row.preco),
    estoque:    row.estoque,
    fornecedor: row.fornecedor ?? '',
    nuvemshopProductId: row.nuvemshopProductId,
  };
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
