import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { merchants, orders } from '../db/schema/index.js';
import { AppError } from '../middleware/error-handler.js';

export const BillingPlanSchema = z.enum(['FREE', 'STARTER', 'GROWTH', 'PRO']);
export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export async function applyPlanForPaidOrder(orderId: string, planKey: BillingPlan) {
  const [order] = await db
    .select({ merchantId: orders.merchantId, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'VERIFIED' && order.status !== 'RESOLVED') {
    throw new AppError(400, 'Order is not paid', 'ORDER_NOT_PAID');
  }

  await db
    .update(merchants)
    .set({ plan: planKey, updatedAt: new Date() })
    .where(eq(merchants.id, order.merchantId));
}
