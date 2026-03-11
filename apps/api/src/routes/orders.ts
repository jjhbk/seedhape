import { Router } from 'express';

import { CreateOrderSchema } from '@seedhape/shared';

import { requireApiKey } from '../middleware/auth.js';
import { createOrder, getOrder } from '../services/orders.js';

const router = Router();

// POST /v1/orders
router.post('/', requireApiKey, async (req, res, next) => {
  try {
    const input = CreateOrderSchema.parse(req.body);
    const merchantId = req.merchantId!;

    const { order, qrCodeDataUrl } = await createOrder(merchantId, input);

    res.status(201).json({
      id: order.id,
      externalOrderId: order.externalOrderId,
      amount: order.amount,
      originalAmount: order.originalAmount,
      currency: order.currency,
      description: order.description,
      status: order.status,
      upiUri: order.upiUri,
      qrCode: qrCodeDataUrl,
      expiresAt: order.expiresAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/orders/:id
router.get('/:id', requireApiKey, async (req, res, next) => {
  try {
    const order = await getOrder(String(req.params['id']), req.merchantId!);

    res.json({
      id: order.id,
      externalOrderId: order.externalOrderId,
      amount: order.amount,
      originalAmount: order.originalAmount,
      currency: order.currency,
      description: order.description,
      status: order.status,
      upiUri: order.upiUri,
      expiresAt: order.expiresAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      verifiedAt: order.verifiedAt?.toISOString() ?? null,
      metadata: order.metadata,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/orders/:id/status
router.get('/:id/status', requireApiKey, async (req, res, next) => {
  try {
    const order = await getOrder(String(req.params['id']), req.merchantId!);

    res.json({
      id: order.id,
      status: order.status,
      amount: order.amount,
      verifiedAt: order.verifiedAt?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export { router as ordersRouter };
