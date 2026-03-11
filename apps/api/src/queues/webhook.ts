import { Queue, Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

import type { WebhookEventType } from '@seedhape/shared';

import { db } from '../db/index.js';
import { orders, transactions } from '../db/schema/index.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { deliverWebhook, attemptDelivery } from '../services/webhooks.js';

const QUEUE_NAME = 'webhooks';

export const webhookQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export async function enqueueWebhook(params: {
  orderId: string;
  event: WebhookEventType;
}): Promise<void> {
  await webhookQueue.add('deliver', params, { delay: 0 });
}

export async function enqueueWebhookRetry(
  deliveryId: string,
  url: string,
  body: string,
  signature: string,
  attempt: number,
  delayMs: number,
): Promise<void> {
  await webhookQueue.add('retry', { deliveryId, url, body, signature, attempt }, { delay: delayMs });
}

export function startWebhookWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'deliver') {
        const { orderId, event } = job.data as { orderId: string; event: WebhookEventType };

        // Build payload
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        if (!order) {
          logger.warn({ orderId }, 'Webhook: order not found');
          return;
        }

        const [txRecord] = await db
          .select()
          .from(transactions)
          .where(eq(transactions.orderId, orderId))
          .limit(1);

        await deliverWebhook(orderId, {
          event,
          timestamp: new Date().toISOString(),
          data: {
            orderId: order.id,
            externalOrderId: order.externalOrderId,
            amount: order.amount,
            originalAmount: order.originalAmount,
            currency: 'INR',
            status: order.status,
            utr: txRecord?.utr ?? null,
            senderName: txRecord?.senderName ?? null,
            upiApp: txRecord?.upiApp ?? null,
            verifiedAt: order.verifiedAt?.toISOString() ?? null,
            metadata: order.metadata as Record<string, unknown> | null,
          },
        });
      } else if (job.name === 'retry') {
        const { deliveryId, url, body, signature, attempt } = job.data as {
          deliveryId: string;
          url: string;
          body: string;
          signature: string;
          attempt: number;
        };

        await attemptDelivery(deliveryId, url, body, signature, attempt);
      }
    },
    { connection: redis, concurrency: 10 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Webhook job failed');
  });

  return worker;
}
