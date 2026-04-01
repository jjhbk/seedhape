import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const merchantStatusEnum = pgEnum('merchant_status', ['ONLINE', 'OFFLINE', 'SUSPENDED']);
export const planEnum = pgEnum('plan', ['FREE', 'STARTER', 'GROWTH', 'PRO']);
export const environmentEnum = pgEnum('environment', ['live', 'test']);

export const merchants = pgTable(
  'merchants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    businessName: varchar('business_name', { length: 255 }).notNull().default(''),
    upiId: varchar('upi_id', { length: 100 }),
    webhookUrl: text('webhook_url'),
    webhookSecret: varchar('webhook_secret', { length: 255 }),
    status: merchantStatusEnum('status').notNull().default('OFFLINE'),
    plan: planEnum('plan').notNull().default('FREE'),
    monthlyTxCount: integer('monthly_tx_count').notNull().default(0),
    settings: jsonb('settings').default({}),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('merchants_clerk_user_id_idx').on(table.clerkUserId),
    uniqueIndex('merchants_email_idx').on(table.email),
    index('merchants_status_heartbeat_idx').on(table.status, table.lastHeartbeatAt),
  ],
);

export type Merchant = typeof merchants.$inferSelect;
export type NewMerchant = typeof merchants.$inferInsert;
