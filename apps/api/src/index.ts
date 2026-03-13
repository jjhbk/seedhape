import { resolve } from 'node:path';
import dotenv from 'dotenv';

import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { startWebhookWorker } from './queues/webhook.js';
import { startOrderExpiryWorker } from './queues/order-expiry.js';
import { startNotificationWorker } from './queues/notification-processor.js';
import {
  startHeartbeatMonitorWorker,
  scheduleHeartbeatMonitor,
} from './queues/heartbeat-monitor.js';

dotenv.config({ path: resolve(__dirname, '../.env') });
const PORT = parseInt(process.env['API_PORT'] ?? '3001', 10);

async function main() {
  const app = createApp();

  // Start BullMQ workers
  startWebhookWorker();
  startOrderExpiryWorker();
  startNotificationWorker();
  startHeartbeatMonitorWorker();

  // Schedule recurring jobs
  await scheduleHeartbeatMonitor();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, `SeedhaPe API running`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
