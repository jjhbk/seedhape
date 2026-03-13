import { Router } from 'express';
import { eq, and } from 'drizzle-orm';

import {
  InternalNotificationPayloadSchema,
  DeviceRegistrationSchema,
  HeartbeatSchema,
} from '@seedhape/shared';

import { db } from '../db/index.js';
import { merchants, deviceTokens } from '../db/schema/index.js';
import { requireDeviceToken } from '../middleware/auth.js';
import { enqueueNotification } from '../queues/notification-processor.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

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
