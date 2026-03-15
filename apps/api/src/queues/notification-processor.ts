import { Queue, Worker } from 'bullmq';

import type { ParsedNotification } from '@seedhape/shared';

import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { matchNotification } from '../services/matching.js';

const QUEUE_NAME = 'notifications';

export const notificationQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 10_000 },
    removeOnFail: { count: 5_000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export async function enqueueNotification(
  merchantId: string,
  notification: ParsedNotification,
): Promise<void> {
  await notificationQueue.add('process', { merchantId, notification });
}

export function startNotificationWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { merchantId, notification } = job.data as {
        merchantId: string;
        notification: ParsedNotification;
      };

      const result = await matchNotification(merchantId, notification);

      if (result.matched) {
        logger.info(
          { orderId: result.orderId, method: result.method },
          'Notification matched to order',
        );
      } else {
        logger.debug({ merchantId, reason: result.reason }, 'Notification did not match any order');
      }
    },
    { connection: redis, concurrency: 20, stalledInterval: 300_000, drainDelay: 5_000 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification processing job failed');
  });

  return worker;
}
