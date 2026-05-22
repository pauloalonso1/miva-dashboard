import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientes, nuvemshopTokens } from '@/lib/schema';
import { listCustomers } from '@/lib/nuvemshop';
import { eq, sql } from 'drizzle-orm';

export async function POST() {
  try {
    const [tokenRow] = await db.select().from(nuvemshopTokens).limit(1);
    if (!tokenRow) {
      return NextResponse.json(
        { error: 'Nuvemshop não conectada.' },
        { status: 401 },
      );
    }

    const creds = { storeId: tokenRow.storeId, accessToken: tokenRow.accessToken };

    let page = 1;
    let all: Awaited<ReturnType<typeof listCustomers>> = [];
    while (true) {
      const batch = await listCustomers(creds, page);
      if (!batch.length) break;
      all = all.concat(batch);
      if (batch.length < 200) break;
      page++;
    }

    let synced = 0, skipped = 0;

    for (const c of all) {
      const nsId     = String(c.id);
      const id       = 'c_ns_' + nsId;
      const nome     = c.name ?? 'Cliente sem nome';
      const telefone = c.phone ?? '';
      const cidade   = c.default_address?.city ?? '';

      try {
        const [existing] = await db.select({ id: clientes.id })
          .from(clientes)
          .where(eq(clientes.id, id));

        if (existing) {
          await db.update(clientes).set({
            nome,
            telefone,
            cidade,
            updatedAt: sql`now()`,
          }).where(eq(clientes.id, id));
        } else {
          await db.insert(clientes).values({
            id,
            nome,
            telefone,
            cidade,
            totalGasto:          '0',
            compras:             0,
            nuvemshopCustomerId: nsId,
          });
        }
        synced++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, total: all.length, synced, skipped });
  } catch (err) {
    console.error('[POST /api/nuvemshop/sync/clientes]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao sincronizar clientes';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
