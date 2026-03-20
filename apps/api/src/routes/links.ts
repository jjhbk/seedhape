import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { clerkMiddleware, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';

import { CreatePaymentLinkSchema, UpdatePaymentLinkSchema, generatePaymentLinkId, generateShortId } from '@seedhape/shared';

import { db } from '../db/index.js';
import { merchants, paymentLinks } from '../db/schema/index.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

router.use(clerkMiddleware());

// Manual auth guard — always returns 401 JSON, never redirects
function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}

router.use(requireClerkAuth);

const WEB_URL = process.env['WEB_URL'] ?? 'http://localhost:3000';

async function getMerchantFromClerk(req: Request, clerkUserId: string) {
  let [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.clerkUserId, clerkUserId))
    .limit(1);

  if (merchant) return merchant;

  // Auto-provision merchant if Clerk webhook hasn't synced yet
  const { getAuth: _getAuth } = await import('@clerk/express');
  const auth = _getAuth(req) as { sessionClaims?: Record<string, unknown> };
  const claims = auth.sessionClaims ?? {};

  const getValue = (key: string) => {
    const v = claims[key];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
  };

  const email =
    getValue('email') ??
    getValue('email_address') ??
    getValue('primary_email_address') ??
    `${clerkUserId}@clerk.local`;

  const fullName = [getValue('first_name'), getValue('last_name')].filter(Boolean).join(' ').trim();
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

function formatLink(link: typeof paymentLinks.$inferSelect) {
  return {
    id: link.id,
    linkType: link.linkType,
    title: link.title,
    description: link.description,
    amount: link.amount,
    minAmount: link.minAmount,
    maxAmount: link.maxAmount,
    currency: link.currency,
    isActive: link.isActive,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    externalOrderId: link.externalOrderId,
    customerName: link.customerName,
    customerEmail: link.customerEmail,
    customerPhone: link.customerPhone,
    usesCount: link.usesCount,
    totalCollected: link.totalCollected,
    shareUrl: `${WEB_URL}/pay/link/${link.id}`,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

// POST /v1/links
router.post('/', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);
    const input = CreatePaymentLinkSchema.parse(req.body);

    const id = generatePaymentLinkId();

    // Auto-generate an external order reference for ONE_TIME links
    const externalOrderId =
      input.linkType === 'ONE_TIME' ? `ORD-${generateShortId().toUpperCase()}` : undefined;

    await db.insert(paymentLinks).values({
      id,
      merchantId: merchant.id,
      linkType: input.linkType,
      title: input.title,
      description: input.description,
      amount: input.amount,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      externalOrderId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
    });

    const [link] = await db.select().from(paymentLinks).where(eq(paymentLinks.id, id)).limit(1);

    res.status(201).json(formatLink(link!));
  } catch (err) {
    next(err);
  }
});

// GET /v1/links
router.get('/', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const page = Number(req.query['page'] ?? 1);
    const limit = Math.min(Number(req.query['limit'] ?? 20), 100);
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.merchantId, merchant.id))
      .orderBy(desc(paymentLinks.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows.map(formatLink), page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /v1/links/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.id, req.params['id']!),
          eq(paymentLinks.merchantId, merchant.id),
        ),
      )
      .limit(1);

    if (!link) throw new AppError(404, 'Payment link not found', 'LINK_NOT_FOUND');

    res.json(formatLink(link));
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/links/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);
    const input = UpdatePaymentLinkSchema.parse(req.body);
    const linkId = String(req.params['id'] ?? '');

    const [existing] = await db
      .select({ id: paymentLinks.id, linkType: paymentLinks.linkType })
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.id, linkId),
          eq(paymentLinks.merchantId, merchant.id),
        ),
      )
      .limit(1);

    if (!existing) throw new AppError(404, 'Payment link not found', 'LINK_NOT_FOUND');

    if (input.isActive !== undefined && existing.linkType === 'ONE_TIME') {
      throw new AppError(
        400,
        'One-time links are auto-managed and cannot be activated/deactivated manually',
        'LINK_TYPE_LOCKED',
      );
    }

    const [updated] = await db
      .update(paymentLinks)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.expiresAt !== undefined && {
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentLinks.id, linkId),
          eq(paymentLinks.merchantId, merchant.id),
        ),
      )
      .returning();

    if (!updated) throw new AppError(404, 'Payment link not found', 'LINK_NOT_FOUND');

    res.json(formatLink(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/links/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const merchant = await getMerchantFromClerk(req, userId!);

    const [deleted] = await db
      .delete(paymentLinks)
      .where(
        and(
          eq(paymentLinks.id, req.params['id']!),
          eq(paymentLinks.merchantId, merchant.id),
        ),
      )
      .returning({ id: paymentLinks.id });

    if (!deleted) throw new AppError(404, 'Payment link not found', 'LINK_NOT_FOUND');

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as linksRouter };
