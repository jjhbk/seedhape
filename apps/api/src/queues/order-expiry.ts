import { and, inArray, lt } from 'drizzle-orm';

import { db } from '../db/index.js';
import { orders } from '../db/schema/index.js';
import { logger } from '../lib/logger.js';
import { enqueueWebhook } from './webhook.js';

const SCAN_INTERVAL_MS = 30_000;

/**
 * No-op kept for call-site compatibility. Order expiry is now handled by
 * the periodic DB scan in startOrderExpiryMonitor() — no Redis job needed.
 */
export function enqueueOrderExpiry(_orderId: string, _expiresAt: Date): void {
  // intentionally empty
}

export function startOrderExpiryMonitor(): NodeJS.Timeout {
  const run = async () => {
    try {
      const expired = await db
        .update(orders)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(
          and(
            inArray(orders.status, ['CREATED', 'PENDING']),
            lt(orders.expiresAt, new Date()),
          ),
        )
        .returning({ id: orders.id });

      for (const order of expired) {
        void enqueueWebhook({ orderId: order.id, event: 'order.expired' });
        logger.info({ orderId: order.id }, 'Order expired');
      }
    } catch (err) {
      logger.error({ err }, 'Order expiry scan error');
    }
  };

  logger.info('Order expiry monitor started (every 30s, no Redis)');
  return setInterval(() => { void run(); }, SCAN_INTERVAL_MS);
}
