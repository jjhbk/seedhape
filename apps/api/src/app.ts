import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { errorHandler } from './middleware/error-handler.js';
import { ordersRouter } from './routes/orders.js';
import { internalRouter } from './routes/internal.js';
import { merchantRouter } from './routes/merchant.js';
import { payRouter } from './routes/pay.js';
import { linksRouter } from './routes/links.js';
import { syncRouter } from './routes/sync.js';
import { billingWebhookRouter } from './routes/billing-webhooks.js';
import { logger } from './lib/logger.js';

export function createApp() {
  const app = express();

  // Security & parsing middleware
  app.use(helmet());

  // /v1/pay/* is called directly from merchant browsers — must allow any origin
  app.use('/v1/pay', cors({ origin: '*', methods: ['GET', 'POST'] }));

  // All other routes restricted to known origins (dashboard + internal)
  app.use(
    cors({
      origin: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
      credentials: true,
    }),
  );
  app.use(compression() as express.RequestHandler);
  app.use('/v1/billing/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.url }, 'Incoming request');
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/v1/orders', ordersRouter);
  app.use('/v1/merchant', merchantRouter);
  app.use('/v1/pay', payRouter);
  app.use('/v1/links', linksRouter);
  app.use('/v1/billing/webhooks', billingWebhookRouter);
  app.use('/internal', internalRouter);
  app.use('/internal', syncRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
