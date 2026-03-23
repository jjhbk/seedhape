import { Pool } from 'pg';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL is not set for @seedhape/web');
}

const globalForPg = globalThis as unknown as { webPgPool?: Pool };

function needsSsl(url: string): boolean {
  return !(
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('seedhape_dev_password')
  );
}

export const pgPool =
  globalForPg.webPgPool ??
  new Pool({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPg.webPgPool = pgPool;
}
