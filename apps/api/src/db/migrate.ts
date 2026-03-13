import { resolve } from 'node:path';
import dotenv from 'dotenv';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
  });

  const db = drizzle(pool);

  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations complete.');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
