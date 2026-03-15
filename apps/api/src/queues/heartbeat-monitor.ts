import { Queue, Worker } from 'bullmq';
import { lt, and, eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { merchants } from '../db/schema/index.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

const QUEUE_NAME = 'heartbeat-monitor';
const STALE_THRESHOLD_MS = 120_000; // Offline if no heartbeat for >2 minutes

export const heartbeatMonitorQueue = new Queue(QUEUE_NAME, {
  connection: redis,
});

/**
 * Schedule a recurring heartbeat check every 30 seconds.
 * Uses a repeatable job.
 */
export async function scheduleHeartbeatMonitor(): Promise<void> {
  await heartbeatMonitorQueue.add(
    'check',
    {},
    {
      repeat: { every: 60_000 },
      jobId: 'heartbeat-monitor-recurring',
    },
  );
  logger.info('Heartbeat monitor scheduled (every 30s)');
}

export function startHeartbeatMonitorWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

      // Mark merchants as OFFLINE if their last heartbeat is stale
      const result = await db
        .update(merchants)
        .set({ status: 'OFFLINE', updatedAt: new Date() })
        .where(
          and(
            eq(merchants.status, 'ONLINE'),
            lt(merchants.lastHeartbeatAt, staleThreshold),
          ),
        )
        .returning({ id: merchants.id });

      if (result.length > 0) {
        logger.info({ count: result.length }, 'Marked merchants as OFFLINE due to stale heartbeat');
      }
    },
    { connection: redis, stalledInterval: 300_000, drainDelay: 10_000 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Heartbeat monitor job failed');
  });

  return worker;
}
