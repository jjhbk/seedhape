import { Queue, Worker } from 'bullmq';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '../db/index.js';
import { orders } from '../db/schema/index.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { enqueueWebhook } from './webhook.js';

const QUEUE_NAME = 'order-expiry';

export const orderExpiryQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 5000 },
    removeOnFail: { count: 1000 },
  },
});

export async function enqueueOrderExpiry(orderId: string, expiresAt: Date): Promise<void> {
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  await orderExpiryQueue.add('expire', { orderId }, { delay, jobId: `expire-${orderId}` });
}

export function startOrderExpiryWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { orderId } = job.data as { orderId: string };

      const [order] = await db
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) return;

      // Only expire if still in a non-terminal state
      if (!['VERIFIED', 'RESOLVED', 'EXPIRED', 'REJECTED'].includes(order.status)) {
        await db
          .update(orders)
          .set({ status: 'EXPIRED', updatedAt: new Date() })
          .where(
            and(
              eq(orders.id, orderId),
              inArray(orders.status, ['CREATED', 'PENDING']),
            ),
          );

        void enqueueWebhook({ orderId, event: 'order.expired' });
        logger.info({ orderId }, 'Order expired');
      }
    },
    { connection: redis, stalledInterval: 300_000, drainDelay: 10_000 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Order expiry job failed');
  });

  return worker;
}
