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
} from 'drizzle-orm/pg-core';

import { merchants } from './merchants';

export const orderStatusEnum = pgEnum('order_status', [
  'CREATED',
  'PENDING',
  'VERIFIED',
  'DISPUTED',
  'RESOLVED',
  'EXPIRED',
  'REJECTED',
]);

export const verificationMethodEnum = pgEnum('verification_method', [
  'UPI_NOTIFICATION',
  'SCREENSHOT_OCR',
  'MANUAL',
]);

export const orders = pgTable(
  'orders',
  {
    id: varchar('id', { length: 50 }).primaryKey(), // sp_ord_xxx
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    externalOrderId: varchar('external_order_id', { length: 100 }),
    amount: integer('amount').notNull(), // in paise
    originalAmount: integer('original_amount').notNull(), // in paise (before randomization)
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    description: text('description'),
    customerEmail: varchar('customer_email', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 20 }),
    status: orderStatusEnum('status').notNull().default('CREATED'),
    upiUri: text('upi_uri').notNull(),
    verificationMethod: verificationMethodEnum('verification_method'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_merchant_status_expires_idx').on(
      table.merchantId,
      table.status,
      table.expiresAt,
    ),
    index('orders_merchant_amount_status_idx').on(
      table.merchantId,
      table.amount,
      table.status,
    ),
    index('orders_merchant_external_idx').on(table.merchantId, table.externalOrderId),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
