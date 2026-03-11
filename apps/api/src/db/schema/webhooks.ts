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

import { orders } from './orders';

export const webhookStatusEnum = pgEnum('webhook_status', [
  'PENDING',
  'SUCCESS',
  'FAILED',
  'RETRYING',
]);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    url: text('url').notNull(),
    payload: jsonb('payload').notNull(),
    statusCode: integer('status_code'),
    attempt: integer('attempt').notNull().default(1),
    status: webhookStatusEnum('status').notNull().default('PENDING'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('webhook_deliveries_order_idx').on(table.orderId),
    index('webhook_deliveries_status_retry_idx').on(table.status, table.nextRetryAt),
  ],
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
