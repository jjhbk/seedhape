export const ORDER_STATUS = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  DISPUTED: 'DISPUTED',
  RESOLVED: 'RESOLVED',
  EXPIRED: 'EXPIRED',
  REJECTED: 'REJECTED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  ORDER_STATUS.VERIFIED,
  ORDER_STATUS.RESOLVED,
  ORDER_STATUS.EXPIRED,
  ORDER_STATUS.REJECTED,
];

export const MERCHANT_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type MerchantStatus = (typeof MERCHANT_STATUS)[keyof typeof MERCHANT_STATUS];

export const PLAN = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  PRO: 'PRO',
} as const;

export type Plan = (typeof PLAN)[keyof typeof PLAN];

export const PLAN_LIMITS: Record<Plan, number> = {
  FREE: 100,
  STARTER: 1000,
  GROWTH: 10000,
  PRO: Infinity,
};

export const DISPUTE_RESOLUTION = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type DisputeResolution = (typeof DISPUTE_RESOLUTION)[keyof typeof DISPUTE_RESOLUTION];

export const WEBHOOK_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const;

export type WebhookStatus = (typeof WEBHOOK_STATUS)[keyof typeof WEBHOOK_STATUS];

export const ENVIRONMENT = {
  LIVE: 'live',
  TEST: 'test',
} as const;

export type Environment = (typeof ENVIRONMENT)[keyof typeof ENVIRONMENT];

export const VERIFICATION_METHOD = {
  UPI_NOTIFICATION: 'UPI_NOTIFICATION',
  SCREENSHOT_OCR: 'SCREENSHOT_OCR',
  MANUAL: 'MANUAL',
} as const;

export type VerificationMethod =
  (typeof VERIFICATION_METHOD)[keyof typeof VERIFICATION_METHOD];
