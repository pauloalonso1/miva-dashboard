import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { produtos, vendas, itensVenda, clientes } from '@/lib/schema';
import { notLike } from 'drizzle-orm';

/**
 * POST /api/reset
 * Remove todos os dados de demonstração, mantendo apenas produtos
 * sincronizados da Nuvemshop (id começando com p_ns_).
 */
export async function POST() {
  await db.delete(itensVenda);
  await db.delete(vendas);
  await db.delete(clientes);
  await db.delete(produtos).where(notLike(produtos.id, 'p_ns_%'));

  return NextResponse.json({ ok: true, message: 'Dados de demonstração removidos.' });
}
