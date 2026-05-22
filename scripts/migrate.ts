/**
 * Executa as migrations no banco Neon.
 * Uso: npx tsx scripts/migrate.ts
 * (Requer DATABASE_URL no ambiente ou em .env.local)
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'fs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL não definida.');
    process.exit(1);
  }
  const sql = neon(url);
  const db  = drizzle(sql);
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations aplicadas com sucesso.');
}

main().catch((e) => { console.error(e); process.exit(1); });
