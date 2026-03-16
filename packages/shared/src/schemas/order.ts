import { z } from 'zod';

import { ORDER_STATUS } from '../constants/order-states.js';

export const CreateOrderSchema = z.object({
  amount: z
    .number()
    .int('Amount must be in paise (integer)')
    .positive('Amount must be positive')
    .max(10_000_000, 'Amount cannot exceed ₹1,00,000'),
  externalOrderId: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .optional(),
  expiresInMinutes: z.number().int().min(5).max(1440).default(5),
  metadata: z.record(z.unknown()).optional(),
  randomizeAmount: z.boolean().default(true),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const OrderResponseSchema = z.object({
  id: z.string(),
  externalOrderId: z.string().nullable(),
  amount: z.number(),
  originalAmount: z.number(),
  currency: z.literal('INR'),
  description: z.string().nullable(),
  status: z.enum([
    ORDER_STATUS.CREATED,
    ORDER_STATUS.PENDING,
    ORDER_STATUS.VERIFIED,
    ORDER_STATUS.DISPUTED,
    ORDER_STATUS.RESOLVED,
    ORDER_STATUS.EXPIRED,
    ORDER_STATUS.REJECTED,
  ]),
  upiUri: z.string(),
  qrCodeUrl: z.string().optional(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  verifiedAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export const OrderStatusResponseSchema = z.object({
  id: z.string(),
  status: z.enum([
    ORDER_STATUS.CREATED,
    ORDER_STATUS.PENDING,
    ORDER_STATUS.VERIFIED,
    ORDER_STATUS.DISPUTED,
    ORDER_STATUS.RESOLVED,
    ORDER_STATUS.EXPIRED,
    ORDER_STATUS.REJECTED,
  ]),
  amount: z.number(),
  verifiedAt: z.string().datetime().nullable().optional(),
});

export type OrderStatusResponse = z.infer<typeof OrderStatusResponseSchema>;
