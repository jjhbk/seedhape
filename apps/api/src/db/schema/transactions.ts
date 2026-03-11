import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { merchants } from './merchants';
import { orders } from './orders';

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'restrict' }),
    utr: varchar('utr', { length: 50 }), // UPI Transaction Reference
    amount: integer('amount').notNull(), // in paise
    senderName: varchar('sender_name', { length: 255 }),
    upiApp: varchar('upi_app', { length: 100 }),
    rawNotification: jsonb('raw_notification'),
    matchedVia: varchar('matched_via', { length: 50 }), // 'tn_field' | 'amount_window'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('transactions_utr_merchant_idx').on(table.utr, table.merchantId),
    index('transactions_order_idx').on(table.orderId),
    index('transactions_merchant_idx').on(table.merchantId),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
