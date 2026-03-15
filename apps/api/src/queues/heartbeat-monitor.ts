import { and, eq, lt } from 'drizzle-orm';

import { db } from '../db/index.js';
import { merchants } from '../db/schema/index.js';
import { logger } from '../lib/logger.js';

const CHECK_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 120_000; // Offline if no heartbeat for >2 minutes

export function startHeartbeatMonitor(): NodeJS.Timeout {
  const run = async () => {
    try {
      const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
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
    } catch (err) {
      logger.error({ err }, 'Heartbeat monitor error');
    }
  };

  logger.info('Heartbeat monitor started (every 60s, no Redis)');
  return setInterval(() => { void run(); }, CHECK_INTERVAL_MS);
}
