import { z } from 'zod';

export const UpdateMerchantProfileSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  upiId: z
    .string()
    .regex(/^[\w.-]+@[\w]+$/, 'Invalid UPI ID format')
    .optional(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookSecret: z.string().min(16).max(128).optional(),
  settings: z
    .object({
      randomizeAmount: z.boolean().optional(),
      randomizeRangePaise: z.number().int().min(1).max(5).optional(),
      orderExpiryMinutes: z.number().int().min(5).max(1440).optional(),
      notificationApps: z.array(z.string()).optional(),
    })
    .optional(),
});

export type UpdateMerchantProfileInput = z.infer<typeof UpdateMerchantProfileSchema>;

export const MerchantProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  businessName: z.string(),
  upiId: z.string().nullable(),
  webhookUrl: z.string().nullable(),
  status: z.enum(['ONLINE', 'OFFLINE', 'SUSPENDED']),
  plan: z.enum(['FREE', 'STARTER', 'GROWTH', 'PRO']),
  monthlyTxCount: z.number(),
  lastHeartbeatAt: z.string().datetime().nullable(),
  settings: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export type MerchantProfile = z.infer<typeof MerchantProfileSchema>;
