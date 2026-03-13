import { Router } from 'express';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import multer from 'multer';
import { put } from '@vercel/blob';

import { db } from '../db/index.js';
import { orders, disputes } from '../db/schema/index.js';
import { getOrderByIdPublic } from '../services/orders.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();
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
    const order = await getOrderByIdPublic(req.params['orderId']!);

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
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
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/pay/:orderId/screenshot — dispute screenshot upload to Vercel Blob
router.post('/:orderId/screenshot', upload.single('screenshot'), async (req, res, next) => {
  try {
    const orderId = req.params['orderId']!;
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
    const order = await getOrderByIdPublic(req.params['orderId']!);

    if (!order) {
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
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
