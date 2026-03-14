import { Router } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';

import {
  InternalNotificationPayloadSchema,
  DeviceRegistrationSchema,
  HeartbeatSchema,
} from '@seedhape/shared';

import { db } from '../db/index.js';
import { merchants, deviceTokens, orders, transactions } from '../db/schema/index.js';
import { requireApiKey, requireDeviceToken } from '../middleware/auth.js';
import { enqueueNotification } from '../queues/notification-processor.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../middleware/error-handler.js';

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
      await enqueueNotification(merchantId, notification);
    }

    res.json({ received: notifications.length });
  } catch (err) {
    next(err);
  }
});

export { router as internalRouter };
