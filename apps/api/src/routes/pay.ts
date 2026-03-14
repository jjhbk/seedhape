import { Router } from 'express';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import multer from 'multer';
import { put } from '@vercel/blob';
import { z } from 'zod';

import { db } from '../db/index.js';
import { orders, disputes, merchants } from '../db/schema/index.js';
import { getOrderByIdPublic } from '../services/orders.js';
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

    if (order.status !== 'DISPUTED' && order.status !== 'PENDING') {
      throw new AppError(400, 'Screenshots only accepted for pending/disputed orders', 'INVALID_STATE');
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
