import crypto from 'node:crypto';

import QRCode from 'qrcode';
import { eq } from 'drizzle-orm';

import {
  type CreateOrderInput,
  buildUpiUri,
  generateOrderId,
  PLAN_LIMITS,
  randomizeAmount,
} from '@seedhape/shared';

import { db } from '../db/index.js';
import { orders, merchants } from '../db/schema/index.js';
import { AppError } from '../middleware/error-handler.js';
import { enqueueOrderExpiry } from '../queues/order-expiry.js';

export async function createOrder(merchantId: string, input: CreateOrderInput) {
  // Fetch merchant
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);

  if (!merchant) {
    throw new AppError(404, 'Merchant not found', 'MERCHANT_NOT_FOUND');
  }

  if (merchant.status === 'SUSPENDED') {
    throw new AppError(403, 'Merchant account is suspended', 'MERCHANT_SUSPENDED');
  }

  if (merchant.status !== 'ONLINE') {
    throw new AppError(503, 'Merchant is offline. Bring device online to accept payments.', 'MERCHANT_OFFLINE');
  }

  if (!merchant.upiId) {
    throw new AppError(400, 'Merchant UPI ID not configured', 'UPI_ID_NOT_SET');
  }

  const monthlyLimit = PLAN_LIMITS[merchant.plan];
  if (Number.isFinite(monthlyLimit) && merchant.monthlyTxCount >= monthlyLimit) {
    throw new AppError(
      429,
      `Plan limit reached for ${merchant.plan}. Upgrade plan to accept more payments this month.`,
      'PLAN_LIMIT_EXCEEDED',
    );
  }

  // Randomize amount to help disambiguate concurrent orders
  const originalAmount = input.amount;
  const finalAmount =
    input.randomizeAmount !== false
      ? randomizeAmount(originalAmount, (merchant.settings as Record<string, number>)?.randomizeRangePaise ?? 3)
      : originalAmount;

  const orderId = generateOrderId();
  const expiresAt = new Date(Date.now() + (input.expiresInMinutes ?? 30) * 60 * 1000);

  const upiUri = buildUpiUri(
    merchant.upiId,
    merchant.businessName || merchant.email,
    finalAmount,
    orderId,
  );

  await db.insert(orders).values({
    id: orderId,
    merchantId,
    externalOrderId: input.externalOrderId,
    amount: finalAmount,
    originalAmount,
    currency: 'INR',
    description: input.description,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    status: 'PENDING',
    upiUri,
    expiresAt,
    metadata: input.metadata as Record<string, unknown> | undefined,
  });

  // Schedule expiry job
  await enqueueOrderExpiry(orderId, expiresAt);

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(upiUri, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  return { order: order!, qrCodeDataUrl };
}

export async function getOrder(orderId: string, merchantId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.merchantId !== merchantId) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  return order;
}

export async function getOrderByIdPublic(orderId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      merchantId: orders.merchantId,
      amount: orders.amount,
      originalAmount: orders.originalAmount,
      currency: orders.currency,
      description: orders.description,
      status: orders.status,
      upiUri: orders.upiUri,
      expiresAt: orders.expiresAt,
      createdAt: orders.createdAt,
      verifiedAt: orders.verifiedAt,
      metadata: orders.metadata,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return order ?? null;
}
