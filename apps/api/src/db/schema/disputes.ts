import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

import { orders } from './orders';

export const disputeResolutionEnum = pgEnum('dispute_resolution', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const disputes = pgTable(
  'disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: varchar('order_id', { length: 50 })
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    screenshotUrl: text('screenshot_url'),
    ocrResult: jsonb('ocr_result'),
    resolution: disputeResolutionEnum('resolution').notNull().default('PENDING'),
    resolutionNote: text('resolution_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('disputes_order_idx').on(table.orderId)],
);

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
