import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/schema';
import { listProducts } from '../lib/nuvemshop';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql, { schema });

  const [tokenRow] = await db.select().from(schema.nuvemshopTokens).limit(1);
  if (!tokenRow) { console.error('Nuvemshop não conectada'); process.exit(1); }

  const creds = { storeId: tokenRow.storeId, accessToken: tokenRow.accessToken };
  console.log('Buscando produtos da loja', creds.storeId, '...');

  const produtosNS = await listProducts(creds);
  console.log('Produtos encontrados na Nuvemshop:', produtosNS.length);

  let created = 0, updated = 0;

  for (const p of produtosNS) {
    const variant = p.variants[0];
    if (!variant) continue;

    const nsId  = String(p.id);
    const nome  = (p.name as Record<string, string>).pt ?? Object.values(p.name as Record<string, string>)[0] ?? 'Sem nome';
    const preco = Number(variant.price ?? 0);
    const custo = Number(variant.cost_price ?? 0);
    const sku   = variant.sku ?? nsId;

    const [existing] = await db.select({ id: schema.produtos.id })
      .from(schema.produtos)
      .where(eq(schema.produtos.nuvemshopProductId, nsId));

    if (existing) {
      await db.update(schema.produtos).set({
        nome, referencia: sku,
        preco: String(preco), custo: String(custo),
        updatedAt: new Date(),
      }).where(eq(schema.produtos.id, existing.id));
      updated++;
    } else {
      await db.insert(schema.produtos).values({
        id:                 'p_ns_' + nsId,
        nome,
        referencia:         sku,
        tipoBanho:          '',
        custo:              String(custo),
        preco:              String(preco),
        estoque:            variant.stock ?? 0,
        nuvemshopProductId: nsId,
      });
      created++;
    }
  }

  console.log(`Sync concluído — criados: ${created} | atualizados: ${updated}`);
}

main().catch(e => { console.error(e); process.exit(1); });
