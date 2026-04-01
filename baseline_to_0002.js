const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: '/home/jjhbk/seedhape/apps/api/.env' });

(async () => {
  const migrationPath = '/home/jjhbk/seedhape/apps/api/src/db/migrations/0002_lumpy_wraith.sql';
  const sqlFile = fs.readFileSync(migrationPath, 'utf8');
  const hash = crypto.createHash('sha256').update(sqlFile).digest('hex');
  const createdAt = '1774280890364';

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  await client.query(
    'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
    [hash, createdAt],
  );

  const rows = await client.query('SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at');
  console.log(JSON.stringify(rows.rows, null, 2));

  await client.end();
})();
