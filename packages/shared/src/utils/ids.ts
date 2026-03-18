import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);
const nanoidShort = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

export function generateOrderId(): string {
  return `sp_ord_${nanoid()}`;
}

export function generateApiKey(env: 'live' | 'test'): string {
  return `sp_${env}_${nanoid()}${nanoid()}`;
}

export function generateWebhookSecret(): string {
  return `whsec_${nanoid()}${nanoid()}`;
}

export function generateShortId(): string {
  return nanoidShort();
}

export function generatePaymentLinkId(): string {
  return `sp_lnk_${nanoid()}`;
}
