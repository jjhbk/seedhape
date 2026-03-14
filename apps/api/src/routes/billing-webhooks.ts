import crypto from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../middleware/error-handler.js';
import { applyPlanForPaidOrder, BillingPlanSchema } from '../services/billing.js';

const router = Router();

const SeedhapeWebhookSchema = z.object({
  event: z.enum(['order.verified', 'order.expired', 'order.disputed', 'order.resolved']),
  timestamp: z.string(),
  data: z.object({
    orderId: z.string().min(1),
    status: z.string(),
    metadata: z
      .object({
        source: z.string().optional(),
        planKey: BillingPlanSchema.optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  }),
});

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env['SEEDHAPE_WEBHOOK_SECRET'] ?? '';
  if (!secret) return false;
  if (!signatureHeader.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}

router.post('/seedhape', async (req, res, next) => {
  try {
    const signature = String(req.headers['x-seedhape-signature'] ?? '');
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

    if (!rawBody) {
      throw new AppError(400, 'Invalid webhook payload', 'INVALID_WEBHOOK_PAYLOAD');
    }

    if (!verifySignature(rawBody, signature)) {
      throw new AppError(401, 'Invalid signature', 'INVALID_SIGNATURE');
    }

    const payload = SeedhapeWebhookSchema.parse(JSON.parse(rawBody));

    if (payload.event === 'order.verified') {
      const source = payload.data.metadata?.source;
      const planKey = payload.data.metadata?.planKey;

      if (source === 'pricing_page' && planKey) {
        await applyPlanForPaidOrder(payload.data.orderId, planKey);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as billingWebhookRouter };
