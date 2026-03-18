import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

import { merchants } from './merchants';

export const linkTypeEnum = pgEnum('link_type', ['REUSABLE', 'ONE_TIME']);

export const paymentLinks = pgTable(
  'payment_links',
  {
    id: varchar('id', { length: 50 }).primaryKey(), // sp_lnk_xxx
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    linkType: linkTypeEnum('link_type').notNull().default('REUSABLE'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    amount: integer('amount'), // in paise; null = variable amount
    minAmount: integer('min_amount'), // floor for variable amount links
    maxAmount: integer('max_amount'), // ceiling for variable amount links
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    isActive: boolean('is_active').notNull().default(true),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // null = never
    // ONE_TIME customer details (set by merchant at link creation)
    externalOrderId: varchar('external_order_id', { length: 100 }),
    customerName: varchar('customer_name', { length: 100 }),
    customerEmail: varchar('customer_email', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 20 }),
    // Stats
    usesCount: integer('uses_count').notNull().default(0),
    totalCollected: integer('total_collected').notNull().default(0), // paise, from VERIFIED orders
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payment_links_merchant_idx').on(table.merchantId),
    index('payment_links_merchant_active_idx').on(table.merchantId, table.isActive),
  ],
);

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type NewPaymentLink = typeof paymentLinks.$inferInsert;
