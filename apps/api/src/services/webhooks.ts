import crypto from 'node:crypto';

import { eq } from 'drizzle-orm';

import type { WebhookPayload } from '@seedhape/shared';

import { db } from '../db/index.js';
import { merchants, orders, webhookDeliveries } from '../db/schema/index.js';
import { logger } from '../lib/logger.js';

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 5_000; // 5s, 25s, 125s, 625s, 3125s

export async function deliverWebhook(
  orderId: string,
  payload: WebhookPayload,
  merchantId?: string,
): Promise<void> {
  let resolvedMerchantId = merchantId;
  if (!resolvedMerchantId) {
    const [order] = await db
      .select({ merchantId: orders.merchantId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return;
    resolvedMerchantId = order.merchantId;
  }

  const [merchant] = await db
    .select({ webhookUrl: merchants.webhookUrl, webhookSecret: merchants.webhookSecret })
    .from(merchants)
    .where(eq(merchants.id, resolvedMerchantId))
    .limit(1);

  if (!merchant?.webhookUrl) return;

  const body = JSON.stringify(payload);
  const webhookSecret = merchant.webhookSecret ?? process.env['WEBHOOK_SIGNING_SECRET'] ?? '';
  if (!webhookSecret) {
    logger.warn({ orderId }, 'Skipping webhook delivery because webhook secret is not configured');
    return;
  }
  const signature = signWebhook(body, webhookSecret);

  // Record the delivery attempt
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      orderId,
      url: merchant.webhookUrl,
      payload: payload as Record<string, unknown>,
      status: 'PENDING',
      attempt: 1,
    })
    .returning();

  await attemptDelivery(delivery!.id, merchant.webhookUrl, body, signature, 1);
}

export async function attemptDelivery(
  deliveryId: string,
  url: string,
  body: string,
  signature: string,
  attempt: number,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SeedhaPe-Signature': `sha256=${signature}`,
        'X-SeedhaPe-Attempt': String(attempt),
        'User-Agent': 'SeedhaPe-Webhooks/1.0',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    const responseBody = await res.text().catch(() => '');

    if (res.ok) {
      await db
        .update(webhookDeliveries)
        .set({ status: 'SUCCESS', statusCode: res.status, responseBody, updatedAt: new Date() })
        .where(eq(webhookDeliveries.id, deliveryId));
      logger.info({ deliveryId, statusCode: res.status }, 'Webhook delivered successfully');
    } else {
      await handleFailure(deliveryId, url, body, signature, attempt, res.status, responseBody);
    }
  } catch (err) {
    logger.warn({ deliveryId, attempt, err }, 'Webhook delivery error');
    await handleFailure(deliveryId, url, body, signature, attempt, 0, String(err));
  }
}

async function handleFailure(
  deliveryId: string,
  url: string,
  body: string,
  signature: string,
  attempt: number,
  statusCode: number,
  responseBody: string,
): Promise<void> {
  if (attempt >= MAX_ATTEMPTS) {
    await db
      .update(webhookDeliveries)
      .set({ status: 'FAILED', statusCode, responseBody, updatedAt: new Date() })
      .where(eq(webhookDeliveries.id, deliveryId));
    logger.error({ deliveryId }, 'Webhook delivery permanently failed after max retries');
    return;
  }

  const delayMs = BACKOFF_BASE_MS * Math.pow(5, attempt - 1);
  const nextRetryAt = new Date(Date.now() + delayMs);

  await db
    .update(webhookDeliveries)
    .set({
      status: 'RETRYING',
      statusCode,
      responseBody,
      attempt: attempt + 1,
      nextRetryAt,
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  // Schedule retry via BullMQ (imported lazily to avoid circular dep)
  const { enqueueWebhookRetry } = await import('../queues/webhook.js');
  await enqueueWebhookRetry(deliveryId, url, body, signature, attempt + 1, delayMs);
}

export function signWebhook(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${signWebhook(body, secret)}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
