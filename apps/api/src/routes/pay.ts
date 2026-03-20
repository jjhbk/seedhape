import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import multer from 'multer';
import { put } from '@vercel/blob';
import { z } from 'zod';

import { InitiateLinkSchema } from '@seedhape/shared';

import { db } from '../db/index.js';
import { orders, disputes, merchants, paymentLinks } from '../db/schema/index.js';
import { getOrderByIdPublic, createOrder } from '../services/orders.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();
const ExpectedPayerSchema = z.object({
  expectedSenderName: z.string().trim().min(2).max(100),
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// ── Link routes (must come before /:orderId wildcard) ──────────────────────

// GET /v1/pay/link/:linkId — public link info (no auth required)
router.get('/link/:linkId', async (req, res, next) => {
  try {
    const linkId = String(req.params['linkId']);
    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.id, linkId))
      .limit(1);

    if (!link) {
      throw new AppError(404, 'Payment link not found', 'LINK_NOT_FOUND');
    }

    res.json({
      id: link.id,
      title: link.title,
      description: link.description,
      linkType: link.linkType,
      amount: link.amount,
      minAmount: link.minAmount,
      maxAmount: link.maxAmount,
      currency: link.currency,
      isActive: link.isActive,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      // Pre-set customer details (for ONE_TIME links)
      customerName: link.customerName,
      customerEmail: link.customerEmail,
      customerPhone: link.customerPhone,
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/pay/link/:linkId/initiate — create an order from a payment link
router.post('/link/:linkId/initiate', async (req, res, next) => {
  try {
    const linkId = String(req.params['linkId']);
    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.id, linkId))
      .limit(1);

    if (!link) {
      throw new AppError(404, 'Payment link not found', 'LINK_NOT_FOUND');
    }

    if (!link.isActive) {
      throw new AppError(410, 'This payment link is no longer active', 'LINK_INACTIVE');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new AppError(410, 'This payment link has expired', 'LINK_EXPIRED');
    }

    const input = InitiateLinkSchema.parse(req.body);

    // Resolve customer name: link's pre-set name takes priority for ONE_TIME links
    const resolvedCustomerName = link.customerName ?? input.customerName;
    if (!resolvedCustomerName) {
      throw new AppError(400, 'Customer name is required', 'CUSTOMER_NAME_REQUIRED');
    }

    // Determine the final amount
    let finalAmount: number;
    if (link.amount !== null) {
      finalAmount = link.amount;
    } else {
      if (!input.amount) {
        throw new AppError(400, 'This payment link requires you to enter an amount', 'AMOUNT_REQUIRED');
      }
      if (link.minAmount !== null && input.amount < link.minAmount) {
        throw new AppError(400, `Amount must be at least ₹${(link.minAmount / 100).toFixed(2)}`, 'AMOUNT_TOO_LOW');
      }
      if (link.maxAmount !== null && input.amount > link.maxAmount) {
        throw new AppError(400, `Amount cannot exceed ₹${(link.maxAmount / 100).toFixed(2)}`, 'AMOUNT_TOO_HIGH');
      }
      finalAmount = input.amount;
    }

    const { order, qrCodeDataUrl } = await createOrder(link.merchantId, {
      amount: finalAmount,
      description: link.title,
      externalOrderId: link.externalOrderId ?? undefined,
      customerEmail: link.customerEmail ?? undefined,
      customerPhone: link.customerPhone ?? undefined,
      metadata: {
        linkId: link.id,
        linkType: link.linkType,
        customerName: resolvedCustomerName,
        expectedSenderName: resolvedCustomerName,
      },
      expiresInMinutes: 30,
      randomizeAmount: true,
    });

    // Increment usesCount on every initiate
    await db
      .update(paymentLinks)
      .set({
        usesCount: sql`${paymentLinks.usesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(paymentLinks.id, link.id));

    res.status(201).json({
      orderId: order.id,
      qrCode: qrCodeDataUrl,
      upiUri: order.upiUri,
      expiresAt: order.expiresAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── Order routes ───────────────────────────────────────────────────────────

// GET /v1/pay/:orderId — public payment page data
router.get('/:orderId', async (req, res, next) => {
  try {
    const orderId = String(req.params['orderId']);
    const order = await getOrderByIdPublic(orderId);

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    const [merchant] = await db
      .select({ status: merchants.status })
      .from(merchants)
      .where(eq(merchants.id, order.merchantId))
      .limit(1);

    if (!merchant || merchant.status !== 'ONLINE') {
      throw new AppError(503, 'Merchant is offline. Payments are temporarily unavailable.', 'MERCHANT_OFFLINE');
    }

    const qrCodeDataUrl = await QRCode.toDataURL(order.upiUri, {
      width: 300,
      margin: 2,
    });

    res.json({
      id: order.id,
      amount: order.amount,
      originalAmount: order.originalAmount,
      currency: order.currency,
      description: order.description,
      status: order.status,
      upiUri: order.upiUri,
      qrCode: qrCodeDataUrl,
      expiresAt: order.expiresAt.toISOString(),
      expectedSenderName:
        (order.metadata as { expectedSenderName?: string } | null)?.expectedSenderName ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/pay/:orderId/expectation — set expected sender name for amount+name matching
router.post('/:orderId/expectation', async (req, res, next) => {
  try {
    const orderId = String(req.params['orderId']);
    const input = ExpectedPayerSchema.parse(req.body);
    const order = await getOrderByIdPublic(orderId);

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (!['CREATED', 'PENDING', 'DISPUTED'].includes(order.status)) {
      throw new AppError(400, 'Cannot update payer name for terminal orders', 'INVALID_STATE');
    }

    const nextMetadata = {
      ...((order.metadata as Record<string, unknown> | null) ?? {}),
      expectedSenderName: input.expectedSenderName,
    };

    await db
      .update(orders)
      .set({ metadata: nextMetadata, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    res.json({ ok: true, expectedSenderName: input.expectedSenderName });
  } catch (err) {
    next(err);
  }
});

// POST /v1/pay/:orderId/screenshot — dispute screenshot upload to Vercel Blob
router.post('/:orderId/screenshot', upload.single('screenshot'), async (req, res, next) => {
  try {
    const orderId = String(req.params['orderId']);
    const order = await getOrderByIdPublic(orderId);

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (!['PENDING', 'DISPUTED', 'EXPIRED'].includes(order.status)) {
      throw new AppError(400, 'Screenshots only accepted for pending, disputed, or expired orders', 'INVALID_STATE');
    }

    if (!req.file) {
      throw new AppError(400, 'Screenshot image file is required', 'MISSING_SCREENSHOT');
    }

    // Upload to Vercel Blob
    const ext = req.file.mimetype.split('/')[1] ?? 'jpg';
    const filename = `screenshots/${orderId}-${Date.now()}.${ext}`;
    const { url } = await put(filename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    // Mark order as disputed and create dispute record
    await db
      .update(orders)
      .set({ status: 'DISPUTED', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await db.insert(disputes).values({
      orderId,
      screenshotUrl: url,
    });

    res.json({ ok: true, message: 'Screenshot submitted for review', screenshotUrl: url });
  } catch (err) {
    next(err);
  }
});

// GET /qr/:orderId — return QR image (PNG)
router.get('/qr/:orderId', async (req, res, next) => {
  try {
    const orderId = String(req.params['orderId']);
    const order = await getOrderByIdPublic(orderId);

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    const [merchant] = await db
      .select({ status: merchants.status })
      .from(merchants)
      .where(eq(merchants.id, order.merchantId))
      .limit(1);

    if (!merchant || merchant.status !== 'ONLINE') {
      throw new AppError(503, 'Merchant is offline. Payments are temporarily unavailable.', 'MERCHANT_OFFLINE');
    }

    const qrBuffer = await QRCode.toBuffer(order.upiUri, {
      width: 300,
      margin: 2,
      type: 'png',
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(qrBuffer);
  } catch (err) {
    next(err);
  }
});

export { router as payRouter };
