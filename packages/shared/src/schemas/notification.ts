import { z } from 'zod';

export const ParsedNotificationSchema = z.object({
  packageName: z.string(),
  title: z.string(),
  body: z.string(),
  amount: z.number().positive(),
  utr: z.string().optional(),
  transactionNote: z.string().optional(),
  senderName: z.string().optional(),
  upiApp: z.string().optional(),
  receivedAt: z.string().datetime(),
  rawTitle: z.string(),
  rawBody: z.string(),
});

export type ParsedNotification = z.infer<typeof ParsedNotificationSchema>;

export const InternalNotificationPayloadSchema = z.object({
  deviceId: z.string(),
  notifications: z.array(ParsedNotificationSchema),
});

export type InternalNotificationPayload = z.infer<typeof InternalNotificationPayloadSchema>;

export const DeviceRegistrationSchema = z.object({
  deviceId: z.string(),
  fcmToken: z.string().optional(),
  appVersion: z.string(),
  deviceModel: z.string().optional(),
  monitoredPackages: z.array(z.string()).optional(),
});

export type DeviceRegistration = z.infer<typeof DeviceRegistrationSchema>;

export const HeartbeatSchema = z.object({
  deviceId: z.string(),
  batteryLevel: z.number().min(0).max(100).optional(),
  isCharging: z.boolean().optional(),
  appVersion: z.string().optional(),
});

export type Heartbeat = z.infer<typeof HeartbeatSchema>;
