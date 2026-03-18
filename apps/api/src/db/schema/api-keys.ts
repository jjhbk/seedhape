import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { environmentEnum } from './merchants';
import { merchants } from './merchants';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    keyHash: varchar('key_hash', { length: 64 }).notNull(), // SHA-256 hex
    keyPrefix: varchar('key_prefix', { length: 20 }).notNull(), // sp_live_ or sp_test_
    keySuffix: varchar('key_suffix', { length: 8 }).notNull().default(''), // last 4 chars of raw key
    environment: environmentEnum('environment').notNull(),
    name: varchar('name', { length: 100 }).default('Default'),
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('api_keys_hash_idx').on(table.keyHash),
    index('api_keys_merchant_idx').on(table.merchantId),
  ],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
