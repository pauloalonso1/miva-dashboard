import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { notLike } from 'drizzle-orm';
import * as schema from '../lib/schema';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  await db.delete(schema.itensVenda);
  console.log('itens_venda limpos');
  await db.delete(schema.vendas);
  console.log('vendas removidas');
  await db.delete(schema.clientes);
  console.log('clientes removidos');
  await db.delete(schema.produtos).where(notLike(schema.produtos.id, 'p_ns_%'));
  console.log('produtos demo removidos (Nuvemshop mantidos)');
  console.log('Banco limpo!');
}

main().catch(e => { console.error(e); process.exit(1); });
