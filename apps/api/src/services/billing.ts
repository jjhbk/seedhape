import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { merchants, orders } from '../db/schema/index.js';
import { AppError } from '../middleware/error-handler.js';

export const BillingPlanSchema = z.enum(['FREE', 'STARTER', 'GROWTH', 'PRO']);
export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export async function applyPlanForPaidOrder(orderId: string, planKey: BillingPlan) {
  const [order] = await db
    .select({ merchantId: orders.merchantId, status: orders.status, metadata: orders.metadata })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'VERIFIED' && order.status !== 'RESOLVED') {
    throw new AppError(400, 'Order is not paid', 'ORDER_NOT_PAID');
  }

  // The subscription order is created under the platform billing merchant.
  // The actual subscriber is identified by subscriberClerkId stored in metadata.
  const subscriberClerkId = (order.metadata as { subscriberClerkId?: string } | null)?.subscriberClerkId;

  let targetMerchantId: string;

  if (subscriberClerkId) {
    const [subscriber] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(eq(merchants.clerkUserId, subscriberClerkId))
      .limit(1);

    if (!subscriber) {
      throw new AppError(404, 'Subscriber merchant not found', 'SUBSCRIBER_NOT_FOUND');
    }
    targetMerchantId = subscriber.id;
  } else {
    // Fallback: order was created by the merchant themselves
    targetMerchantId = order.merchantId;
  }

  await db
    .update(merchants)
    .set({ plan: planKey, monthlyTxCount: 0, updatedAt: new Date() })
    .where(eq(merchants.id, targetMerchantId));
}
