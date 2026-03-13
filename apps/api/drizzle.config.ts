import { resolve } from 'node:path';
import dotenv from 'dotenv';

import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: resolve(process.cwd(), 'apps/api/.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/seedhape',
  },
  verbose: true,
  strict: true,
});
