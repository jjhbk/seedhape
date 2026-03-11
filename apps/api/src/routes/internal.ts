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

// POST /internal/device/register — first-time device registration (no auth needed)
router.post('/device/register', async (req, res, next) => {
  try {
    const clerkToken = req.headers.authorization?.replace('Bearer ', '');
    if (!clerkToken) {
      throw new AppError(401, 'Clerk token required', 'MISSING_AUTH');
    }

    // Verify Clerk token and get user
    const { verifyToken } = await import('@clerk/express');
    const payload = await verifyToken(clerkToken, {
      secretKey: process.env['CLERK_SECRET_KEY']!,
    });

    const clerkUserId = payload.sub;

    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.clerkUserId, clerkUserId))
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
