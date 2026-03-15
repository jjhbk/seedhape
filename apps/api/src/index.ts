import { resolve } from 'node:path';
import dotenv from 'dotenv';

import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { startWebhookWorker } from './queues/webhook.js';
import { startNotificationWorker } from './queues/notification-processor.js';
import { startOrderExpiryMonitor } from './queues/order-expiry.js';
import { startHeartbeatMonitor } from './queues/heartbeat-monitor.js';

dotenv.config({ path: resolve(__dirname, '../.env') });
const PORT = parseInt(process.env['API_PORT'] ?? '3001', 10);

async function main() {
  const app = createApp();

  // BullMQ workers (Redis) — only where retry/queue semantics are needed
  startWebhookWorker();
  startNotificationWorker();

  // setInterval-based monitors — no Redis cost
  startOrderExpiryMonitor();
  startHeartbeatMonitor();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, `SeedhaPe API running`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
