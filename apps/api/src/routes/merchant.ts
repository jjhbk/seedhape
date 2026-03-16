import crypto from 'node:crypto';
import type { Request } from 'express';

import { Router } from 'express';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';

import { UpdateMerchantProfileSchema } from '@seedhape/shared';
import { generateApiKey } from '@seedhape/shared';

import { db } from '../db/index.js';
import {
  merchants,
  orders,
  transactions,
  disputes,
  apiKeys,
} from '../db/schema/index.js';
import { AppError } from '../middleware/error-handler.js';
import { signWebhook } from '../services/webhooks.js';

const router = Router();

// All dashboard routes require Clerk session
router.use(clerkMiddleware());
router.use(requireAuth());

function claimAsString(claims: Record<string, unknown>, key: string): string | undefined {
  const value = claims[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

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

async function getMerchantFromClerk(req: Request, clerkUserId: string) {
  let [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.clerkUserId, clerkUserId))
    .limit(1);

  if (merchant) return merchant;

  // Fallback provisioning when webhook sync has not run yet.
  const auth = getAuth(req) as { sessionClaims?: Record<string, unknown> };
  const claims = auth.sessionClaims ?? {};

  const email =
    claimAsString(claims, 'email') ??
    claimAsString(claims, 'email_address') ??
    claimAsString(claims, 'primary_email_address') ??
    `${clerkUserId}@clerk.local`;

  const firstName = claimAsString(claims, 'first_name');
  const lastName = claimAsString(claims, 'last_name');
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const businessName = fullName || email.split('@')[0] || 'Merchant';

  await db
    .insert(merchants)
    .values({ clerkUserId, email, businessName })
    .onConflictDoNothing({ target: merchants.clerkUserId });

  [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.clerkUserId, clerkUserId))
    .limit(1);

  if (!merchant) {
    throw new AppError(404, 'Merchant not found', 'MERCHANT_NOT_FOUND');
  }

  return merchant;
}

// GET /v1/merchant/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    res.json({
      id: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
      upiId: merchant.upiId,
      webhookUrl: merchant.webhookUrl,
      webhookSecretSet: !!merchant.webhookSecret,
      allowedDomain:
        (merchant.settings as { allowedDomain?: string | null } | null)?.allowedDomain ?? null,
      status: merchant.status,
      plan: merchant.plan,
      monthlyTxCount: merchant.monthlyTxCount,
      lastHeartbeatAt: merchant.lastHeartbeatAt?.toISOString() ?? null,
      settings: merchant.settings,
      createdAt: merchant.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /v1/merchant/profile
router.put('/profile', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);
    const input = UpdateMerchantProfileSchema.parse(req.body);
    const mergedSettings = {
      ...((merchant.settings as Record<string, unknown> | null) ?? {}),
      ...(input.settings ?? {}),
    };
    const rawAllowedDomain = input.allowedDomain ?? (mergedSettings['allowedDomain'] as string | null | undefined);
    const normalizedAllowedDomain = rawAllowedDomain ? normalizeDomain(rawAllowedDomain) : null;

    if (rawAllowedDomain && !normalizedAllowedDomain) {
      throw new AppError(400, 'Invalid allowed domain format', 'INVALID_ALLOWED_DOMAIN');
    }

    const [updated] = await db
      .update(merchants)
      .set({
        ...(input.businessName && { businessName: input.businessName }),
        ...(input.upiId !== undefined && { upiId: input.upiId }),
        ...(input.webhookUrl !== undefined && { webhookUrl: input.webhookUrl }),
        ...(input.webhookSecret && { webhookSecret: input.webhookSecret }),
        settings: {
          ...mergedSettings,
          allowedDomain: normalizedAllowedDomain,
        },
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchant.id))
      .returning();

    res.json({ ok: true, merchant: updated });
  } catch (err) {
    next(err);
  }
});

// GET /v1/merchant/transactions
router.get('/transactions', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const page = Number(req.query['page'] ?? 1);
    const limit = Math.min(Number(req.query['limit'] ?? 20), 100);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: orders.id,
        externalOrderId: orders.externalOrderId,
        amount: orders.amount,
        originalAmount: orders.originalAmount,
        currency: orders.currency,
        description: orders.description,
        status: orders.status,
        createdAt: orders.createdAt,
        verifiedAt: orders.verifiedAt,
        utr: transactions.utr,
        senderName: transactions.senderName,
        upiApp: transactions.upiApp,
        matchedVia: transactions.matchedVia,
        rawNotification: transactions.rawNotification,
      })
      .from(orders)
      .leftJoin(transactions, eq(transactions.orderId, orders.id))
      .where(eq(orders.merchantId, merchant.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /v1/merchant/disputes
router.get('/disputes', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

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
      .where(eq(orders.merchantId, merchant.id))
      .orderBy(desc(disputes.createdAt));

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /v1/merchant/disputes/:id
router.get('/disputes/:id', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, req.params['id']!))
      .limit(1);

    if (!dispute) throw new AppError(404, 'Dispute not found', 'DISPUTE_NOT_FOUND');

    // Verify ownership via order
    const [order] = await db
      .select({ merchantId: orders.merchantId })
      .from(orders)
      .where(eq(orders.id, dispute.orderId))
      .limit(1);

    if (order?.merchantId !== merchant.id) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    res.json(dispute);
  } catch (err) {
    next(err);
  }
});

// PUT /v1/merchant/disputes/:id
router.put('/disputes/:id', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);
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
      .where(eq(disputes.id, req.params['id']!))
      .limit(1);

    if (!dispute) throw new AppError(404, 'Dispute not found', 'DISPUTE_NOT_FOUND');

    // Verify ownership
    const [order] = await db
      .select({ merchantId: orders.merchantId })
      .from(orders)
      .where(eq(orders.id, dispute.orderId))
      .limit(1);

    if (order?.merchantId !== merchant.id) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const now = new Date();
    await db
      .update(disputes)
      .set({ resolution, resolutionNote, resolvedAt: now, updatedAt: now })
      .where(eq(disputes.id, dispute.id));

    // Update order status based on resolution
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
      event: resolution === 'APPROVED' ? 'order.resolved' : 'order.resolved',
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /v1/merchant/analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const [stats] = await db
      .select({
        total: count(orders.id),
        verified: count(sql`CASE WHEN ${orders.status} = 'VERIFIED' THEN 1 END`),
        disputed: count(sql`CASE WHEN ${orders.status} = 'DISPUTED' THEN 1 END`),
        totalAmount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'VERIFIED' THEN ${orders.amount} ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(eq(orders.merchantId, merchant.id));

    res.json({
      totalOrders: stats?.total ?? 0,
      verifiedOrders: stats?.verified ?? 0,
      disputedOrders: stats?.disputed ?? 0,
      totalVerifiedAmountPaise: stats?.totalAmount ?? 0,
      verificationRate:
        stats && Number(stats.total) > 0
          ? ((Number(stats.verified) / Number(stats.total)) * 100).toFixed(1)
          : '0.0',
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/merchant/api-keys
router.get('/api-keys', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const rows = await db
      .select({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.merchantId, merchant.id))
      .orderBy(desc(apiKeys.createdAt));

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /v1/merchant/api-keys
router.post('/api-keys', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);
    const { environment = 'live', name = 'Default' } = req.body as {
      environment?: 'live' | 'test';
      name?: string;
    };

    const rawKey = generateApiKey(environment);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = `sp_${environment}_`;

    await db.insert(apiKeys).values({
      merchantId: merchant.id,
      keyHash,
      keyPrefix,
      environment,
      name,
      isActive: true,
    });

    // Return plaintext key only once
    res.status(201).json({
      key: rawKey,
      prefix: keyPrefix,
      environment,
      name,
      warning: 'Store this key securely — it will not be shown again.',
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/merchant/api-keys/:id — enable or disable a key
router.patch('/api-keys/:id', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);
    const { isActive } = req.body as { isActive: boolean };

    if (typeof isActive !== 'boolean') {
      throw new AppError(400, '`isActive` (boolean) is required', 'VALIDATION_ERROR');
    }

    const [updated] = await db
      .update(apiKeys)
      .set({ isActive })
      .where(
        and(
          eq(apiKeys.id, req.params['id']!),
          eq(apiKeys.merchantId, merchant.id),
        ),
      )
      .returning({ id: apiKeys.id });

    if (!updated) throw new AppError(404, 'API key not found', 'NOT_FOUND');

    res.json({ ok: true, isActive });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/merchant/api-keys/:id — permanently delete a key
router.delete('/api-keys/:id', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const [deleted] = await db
      .delete(apiKeys)
      .where(
        and(
          eq(apiKeys.id, req.params['id']!),
          eq(apiKeys.merchantId, merchant.id),
        ),
      )
      .returning({ id: apiKeys.id });

    if (!deleted) throw new AppError(404, 'API key not found', 'NOT_FOUND');

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /v1/merchant/webhook/test
router.post('/webhook/test', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    if (!merchant.webhookUrl) {
      throw new AppError(400, 'Webhook URL not configured', 'WEBHOOK_URL_NOT_SET');
    }

    const testPayload = {
      event: 'order.verified',
      timestamp: new Date().toISOString(),
      data: {
        orderId: 'sp_ord_test_example',
        amount: 99900,
        originalAmount: 99900,
        currency: 'INR',
        status: 'VERIFIED',
        test: true,
      },
    };

    const body = JSON.stringify(testPayload);
    const signature = signWebhook(
      body,
      merchant.webhookSecret ?? process.env['WEBHOOK_SIGNING_SECRET'] ?? 'test_secret',
    );

    try {
      const response = await fetch(merchant.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SeedhaPe-Signature': `sha256=${signature}`,
          'X-SeedhaPe-Test': 'true',
          'User-Agent': 'SeedhaPe-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      res.json({
        success: response.ok,
        statusCode: response.status,
        payload: testPayload,
      });
    } catch (err) {
      res.json({ success: false, error: String(err), payload: testPayload });
    }
  } catch (err) {
    next(err);
  }
});

export { router as merchantRouter };
