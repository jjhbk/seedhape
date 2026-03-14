import { Router } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  InternalNotificationPayloadSchema,
  DeviceRegistrationSchema,
  HeartbeatSchema,
} from '@seedhape/shared';

import { db } from '../db/index.js';
import { merchants, deviceTokens, orders, transactions, disputes } from '../db/schema/index.js';
import { requireApiKey, requireDeviceToken } from '../middleware/auth.js';
import { enqueueNotification } from '../queues/notification-processor.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../middleware/error-handler.js';
import { applyPlanForPaidOrder, BillingPlanSchema } from '../services/billing.js';

const router = Router();

// GET /internal/device/verify — validate API key and fetch merchant summary
router.get('/device/verify', requireApiKey, async (req, res, next) => {
  try {
    const [merchant] = await db
      .select({
        id: merchants.id,
        businessName: merchants.businessName,
        upiId: merchants.upiId,
      })
      .from(merchants)
      .where(eq(merchants.id, req.merchantId!))
      .limit(1);

    if (!merchant) {
      throw new AppError(404, 'Merchant not found', 'MERCHANT_NOT_FOUND');
    }

    res.json(merchant);
  } catch (err) {
    next(err);
  }
});

// GET /internal/device/profile — mobile app profile fetch via API key
router.get('/device/profile', requireApiKey, async (req, res, next) => {
  try {
    const [merchant] = await db
      .select({
        id: merchants.id,
        email: merchants.email,
        businessName: merchants.businessName,
        upiId: merchants.upiId,
        status: merchants.status,
        plan: merchants.plan,
        monthlyTxCount: merchants.monthlyTxCount,
      })
      .from(merchants)
      .where(eq(merchants.id, req.merchantId!))
      .limit(1);

    if (!merchant) {
      throw new AppError(404, 'Merchant not found', 'MERCHANT_NOT_FOUND');
    }

    res.json(merchant);
  } catch (err) {
    next(err);
  }
});

// GET /internal/device/transactions — mobile app transactions via API key
router.get('/device/transactions', requireApiKey, async (req, res, next) => {
  try {
    const page = Number(req.query['page'] ?? 1);
    const limit = Math.min(Number(req.query['limit'] ?? 20), 100);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: orders.id,
        amount: orders.amount,
        originalAmount: orders.originalAmount,
        status: orders.status,
        description: orders.description,
        createdAt: orders.createdAt,
        verifiedAt: orders.verifiedAt,
        utr: transactions.utr,
        upiApp: transactions.upiApp,
        senderName: transactions.senderName,
      })
      .from(orders)
      .leftJoin(transactions, eq(transactions.orderId, orders.id))
      .where(eq(orders.merchantId, req.merchantId!))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /internal/device/disputes — mobile app disputes via API key
router.get('/device/disputes', requireApiKey, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: disputes.id,
        orderId: disputes.orderId,
        amount: orders.amount,
        resolution: disputes.resolution,
        screenshotUrl: disputes.screenshotUrl,
        resolutionNote: disputes.resolutionNote,
        createdAt: disputes.createdAt,
        resolvedAt: disputes.resolvedAt,
      })
      .from(disputes)
      .innerJoin(orders, eq(orders.id, disputes.orderId))
      .where(eq(orders.merchantId, req.merchantId!))
      .orderBy(desc(disputes.createdAt));

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /internal/device/disputes/:id — mobile app dispute resolution via API key
router.put('/device/disputes/:id', requireApiKey, async (req, res, next) => {
  try {
    const disputeId = String(req.params['id'] ?? '');
    const { resolution, resolutionNote } = req.body as {
      resolution: 'APPROVED' | 'REJECTED';
      resolutionNote?: string;
    };

    if (!['APPROVED', 'REJECTED'].includes(resolution)) {
      throw new AppError(400, 'Invalid resolution', 'INVALID_RESOLUTION');
    }

    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, disputeId))
      .limit(1);

    if (!dispute) throw new AppError(404, 'Dispute not found', 'DISPUTE_NOT_FOUND');

    const [order] = await db
      .select({ merchantId: orders.merchantId })
      .from(orders)
      .where(eq(orders.id, dispute.orderId))
      .limit(1);

    if (order?.merchantId !== req.merchantId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const now = new Date();
    await db
      .update(disputes)
      .set({ resolution, resolutionNote, resolvedAt: now, updatedAt: now })
      .where(eq(disputes.id, dispute.id));

    await db
      .update(orders)
      .set({
        status: resolution === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
        updatedAt: now,
      })
      .where(eq(orders.id, dispute.orderId));

    const { enqueueWebhook } = await import('../queues/webhook.js');
    void enqueueWebhook({
      orderId: dispute.orderId,
      event: 'order.resolved',
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /internal/device/register — first-time device registration (API key auth)
router.post('/device/register', async (req, res, next) => {
  try {
    const rawKey = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!rawKey || (!rawKey.startsWith('sp_live_') && !rawKey.startsWith('sp_test_'))) {
      throw new AppError(401, 'Valid API key required', 'MISSING_AUTH');
    }

    const crypto = await import('node:crypto');
    const { apiKeys } = await import('../db/schema/index.js');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const [keyRecord] = await db
      .select({ merchantId: apiKeys.merchantId })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
      .limit(1);

    if (!keyRecord) {
      throw new AppError(401, 'Invalid or inactive API key', 'INVALID_API_KEY');
    }

    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, keyRecord.merchantId))
      .limit(1);

    if (!merchant) {
      throw new AppError(404, 'Merchant not found', 'MERCHANT_NOT_FOUND');
    }

    const input = DeviceRegistrationSchema.parse(req.body);

    // Upsert device token
    await db
      .insert(deviceTokens)
      .values({
        merchantId: merchant.id,
        deviceId: input.deviceId,
        fcmToken: input.fcmToken,
        appVersion: input.appVersion,
        deviceModel: input.deviceModel,
      })
      .onConflictDoUpdate({
        target: [deviceTokens.deviceId, deviceTokens.merchantId],
        set: {
          fcmToken: input.fcmToken,
          appVersion: input.appVersion,
          deviceModel: input.deviceModel,
          updatedAt: new Date(),
        },
      });

    res.json({ merchantId: merchant.id, registered: true });
  } catch (err) {
    next(err);
  }
});

// GET /internal/device/alerts — lightweight counters for background notification updates
router.get('/device/alerts', requireDeviceToken, async (req, res, next) => {
  try {
    const merchantId = req.deviceMerchantId!;

    const [tx] = await db
      .select({ totalTransactions: count(transactions.id) })
      .from(transactions)
      .where(eq(transactions.merchantId, merchantId));

    const [disputed] = await db
      .select({ totalDisputedOrders: count(orders.id) })
      .from(orders)
      .where(and(eq(orders.merchantId, merchantId), eq(orders.status, 'DISPUTED')));

    res.json({
      totalTransactions: Number(tx?.totalTransactions ?? 0),
      totalDisputedOrders: Number(disputed?.totalDisputedOrders ?? 0),
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /internal/heartbeat
router.post('/heartbeat', requireDeviceToken, async (req, res, next) => {
  try {
    const input = HeartbeatSchema.parse(req.body);
    const merchantId = req.deviceMerchantId!;

    await db
      .update(merchants)
      .set({
        status: 'ONLINE',
        lastHeartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchantId));

    logger.debug({ merchantId, batteryLevel: input.batteryLevel }, 'Heartbeat received');

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /internal/notifications
router.post('/notifications', requireDeviceToken, async (req, res, next) => {
  try {
    const { notifications } = InternalNotificationPayloadSchema.parse({
      deviceId: req.headers['x-device-id'],
      ...req.body,
    });
    const merchantId = req.deviceMerchantId!;

    for (const notification of notifications) {
      logger.info(
        {
          merchantId,
          amount: notification.amount,
          senderName: notification.senderName,
          upiApp: notification.upiApp,
          transactionNote: notification.transactionNote,
        },
        'UPI notification received',
      );
      await enqueueNotification(merchantId, notification);
    }

    res.json({ received: notifications.length });
  } catch (err) {
    next(err);
  }
});

const ApplyPlanSchema = z.object({
  orderId: z.string().min(1),
  planKey: BillingPlanSchema,
});

// POST /internal/billing/apply-plan — called by the web app's webhook handler after a subscription payment
router.post('/billing/apply-plan', async (req, res, next) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== process.env['JWT_SECRET']) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { orderId, planKey } = ApplyPlanSchema.parse(req.body);
    await applyPlanForPaidOrder(orderId, planKey);

    logger.info({ orderId, planKey }, 'Plan applied via billing webhook');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as internalRouter };
