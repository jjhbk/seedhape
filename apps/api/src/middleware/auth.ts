import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';

import { db } from '../db/index.js';
import { apiKeys, merchants } from '../db/schema/index.js';
import { AppError } from './error-handler.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      merchant?: typeof merchants.$inferSelect;
      merchantId?: string;
      environment?: 'live' | 'test';
      deviceMerchantId?: string;
    }
  }
}

/**
 * Middleware: authenticate via API key header (Bearer sp_live_xxx or sp_test_xxx)
 */

function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const withProto = raw.includes('://') ? raw : `https://${raw}`;

  try {
    const url = new URL(withProto);
    return url.hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function getRequestDomain(req: Request): string | null {
  const explicitDomain = req.headers['x-seedhape-domain'];
  if (typeof explicitDomain === 'string') {
    return normalizeDomain(explicitDomain);
  }

  const origin = req.headers.origin;
  if (typeof origin === 'string') {
    return normalizeDomain(origin);
  }

  const referer = req.headers.referer;
  if (typeof referer === 'string') {
    return normalizeDomain(referer);
  }

  return null;
}

export async function requireApiKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing API key', 'MISSING_API_KEY'));
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith('sp_live_') && !rawKey.startsWith('sp_test_')) {
    return next(new AppError(401, 'Invalid API key format', 'INVALID_API_KEY'));
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const [keyRecord] = await db
    .select({
      merchantId: apiKeys.merchantId,
      environment: apiKeys.environment,
      isActive: apiKeys.isActive,
      merchantSettings: merchants.settings,
    })
    .from(apiKeys)
    .innerJoin(merchants, eq(merchants.id, apiKeys.merchantId))
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!keyRecord) {
    return next(new AppError(401, 'Invalid or inactive API key', 'INVALID_API_KEY'));
  }

  // Update last used (fire and forget)
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.keyHash, keyHash));

  req.merchantId = keyRecord.merchantId;
  req.environment = keyRecord.environment;

  const configuredDomainRaw = (keyRecord.merchantSettings as { allowedDomain?: string } | null)
    ?.allowedDomain;
  const configuredDomain = configuredDomainRaw ? normalizeDomain(configuredDomainRaw) : null;

  if (configuredDomain) {
    const requestDomain = getRequestDomain(req);

    if (!requestDomain) {
      return next(
        new AppError(
          403,
          `Missing request domain. Provide Origin/Referer or X-SeedhaPe-Domain for ${configuredDomain}`,
          'DOMAIN_REQUIRED',
        ),
      );
    }

    if (requestDomain !== configuredDomain) {
      return next(
        new AppError(
          403,
          `API key locked to ${configuredDomain}. Request domain ${requestDomain} is not allowed.`,
          'DOMAIN_NOT_ALLOWED',
        ),
      );
    }
  }

  next();
}

/**
 * Middleware: authenticate internal device requests via device_id + merchant_id header
 */
export async function requireDeviceToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const deviceId = req.headers['x-device-id'] as string | undefined;
  const merchantId = req.headers['x-merchant-id'] as string | undefined;

  if (!deviceId || !merchantId) {
    return next(new AppError(401, 'Missing device credentials', 'MISSING_DEVICE_CREDENTIALS'));
  }

  // Verify device is registered for this merchant
  const { deviceTokens } = await import('../db/schema/index.js');
  const [device] = await db
    .select({ id: deviceTokens.id })
    .from(deviceTokens)
    .where(
      and(eq(deviceTokens.deviceId, deviceId), eq(deviceTokens.merchantId, merchantId)),
    )
    .limit(1);

  if (!device) {
    return next(new AppError(401, 'Device not registered', 'DEVICE_NOT_REGISTERED'));
  }

  req.deviceMerchantId = merchantId;
  next();
}
