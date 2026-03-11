import IORedis from 'ioredis';

import { logger } from './logger.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

// Connection used by BullMQ (maxRetriesPerRequest must be null)
export const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// BullMQ connection config (passes URL string to avoid version conflicts)
export const bullmqConnection = { connection: redis } as const;

export { REDIS_URL };

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
