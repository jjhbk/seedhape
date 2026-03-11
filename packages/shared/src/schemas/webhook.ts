import { z } from 'zod';

export const WebhookEventType = {
  ORDER_VERIFIED: 'order.verified',
  ORDER_EXPIRED: 'order.expired',
  ORDER_DISPUTED: 'order.disputed',
  ORDER_RESOLVED: 'order.resolved',
} as const;

export type WebhookEventType = (typeof WebhookEventType)[keyof typeof WebhookEventType];

export const WebhookPayloadSchema = z.object({
  event: z.enum([
    WebhookEventType.ORDER_VERIFIED,
    WebhookEventType.ORDER_EXPIRED,
    WebhookEventType.ORDER_DISPUTED,
    WebhookEventType.ORDER_RESOLVED,
  ]),
  timestamp: z.string().datetime(),
  data: z.object({
    orderId: z.string(),
    externalOrderId: z.string().nullable().optional(),
    amount: z.number(),
    originalAmount: z.number(),
    currency: z.literal('INR'),
    status: z.string(),
    utr: z.string().nullable().optional(),
    senderName: z.string().nullable().optional(),
    upiApp: z.string().nullable().optional(),
    verifiedAt: z.string().datetime().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  }),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
