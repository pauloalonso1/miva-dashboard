import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientes } from '@/lib/schema';
import { desc } from 'drizzle-orm';

// GET /api/clientes — lista clientes ordenados por total gasto
export async function GET() {
  try {
    const rows = await db.select().from(clientes).orderBy(desc(clientes.totalGasto));
    return NextResponse.json(rows.map(toClient));
  } catch (err) {
    console.error('[GET /api/clientes]', err);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

function toClient(row: typeof clientes.$inferSelect) {
  return {
    id:         row.id,
    nome:       row.nome,
    telefone:   row.telefone ?? '',
    cidade:     row.cidade   ?? '',
    totalGasto: Number(row.totalGasto),
    compras:    row.compras,
    nuvemshopCustomerId: row.nuvemshopCustomerId,
  };
}
