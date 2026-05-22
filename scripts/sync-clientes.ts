import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/schema';
import { listCustomers } from '../lib/nuvemshop';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql, { schema });

  const [tokenRow] = await db.select().from(schema.nuvemshopTokens).limit(1);
  if (!tokenRow) { console.error('Nuvemshop não conectada'); process.exit(1); }

  const creds = { storeId: tokenRow.storeId, accessToken: tokenRow.accessToken };
  console.log('Buscando clientes da loja', creds.storeId, '...');

  let page = 1;
  let all: Awaited<ReturnType<typeof listCustomers>> = [];
  while (true) {
    const batch = await listCustomers(creds, page);
    if (!batch.length) break;
    all = all.concat(batch);
    console.log(`Página ${page}: ${batch.length} clientes`);
    if (batch.length < 200) break;
    page++;
  }

  console.log('Total de clientes na Nuvemshop:', all.length);
  let synced = 0, skipped = 0;

  for (const c of all) {
    const nsId     = String(c.id);
    const id       = 'c_ns_' + nsId;
    const nome     = c.name ?? 'Cliente sem nome';
    const telefone = c.phone ?? '';
    const cidade   = (c as { default_address?: { city?: string } }).default_address?.city ?? '';

    try {
      const [existing] = await db.select({ id: schema.clientes.id })
        .from(schema.clientes)
        .where(eq(schema.clientes.id, id));

      if (existing) {
        await db.update(schema.clientes).set({
          nome, telefone, cidade, updatedAt: new Date(),
        }).where(eq(schema.clientes.id, id));
      } else {
        await db.insert(schema.clientes).values({
          id, nome, telefone, cidade,
          totalGasto: '0', compras: 0,
          nuvemshopCustomerId: nsId,
        });
      }
      synced++;
    } catch {
      skipped++;
    }
  }

  console.log(`Sync clientes concluído — sincronizados: ${synced} | ignorados: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
