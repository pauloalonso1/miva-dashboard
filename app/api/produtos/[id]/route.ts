import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { produtos } from '@/lib/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET /api/produtos/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [row] = await db.select().from(produtos).where(eq(produtos.id, id));
  if (!row) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json(toClient(row));
}

// PUT /api/produtos/:id — atualiza campos (inclusive ajuste de estoque)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const update: Partial<typeof produtos.$inferInsert> = {};
  if (body.nome        !== undefined) update.nome        = body.nome;
  if (body.referencia  !== undefined) update.referencia  = body.referencia;
  if (body.tipoBanho   !== undefined) update.tipoBanho   = body.tipoBanho;
  if (body.custo       !== undefined) update.custo       = String(body.custo);
  if (body.preco       !== undefined) update.preco       = String(body.preco);
  if (body.estoque     !== undefined) update.estoque     = body.estoque;
  if (body.fornecedor  !== undefined) update.fornecedor  = body.fornecedor;

  // Ajuste relativo de estoque (delta): { estoqueDelta: +1 | -1 }
  if (body.estoqueDelta !== undefined) {
    const [atual] = await db.select({ estoque: produtos.estoque }).from(produtos).where(eq(produtos.id, id));
    if (!atual) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    update.estoque = Math.max(0, atual.estoque + body.estoqueDelta);
  }

  update.updatedAt = new Date();

  const [updated] = await db.update(produtos).set(update).where(eq(produtos.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json(toClient(updated));
}

// DELETE /api/produtos/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [deleted] = await db.delete(produtos).where(eq(produtos.id, id)).returning({ id: produtos.id });
  if (!deleted) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

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
