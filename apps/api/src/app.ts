import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { errorHandler } from './middleware/error-handler.js';
import { ordersRouter } from './routes/orders.js';
import { internalRouter } from './routes/internal.js';
import { merchantRouter } from './routes/merchant.js';
import { payRouter } from './routes/pay.js';
import { logger } from './lib/logger.js';

export function createApp() {
  const app = express();

  // Security & parsing middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
      credentials: true,
    }),
  );
  app.use(compression() as express.RequestHandler);
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
  app.use('/internal', internalRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
