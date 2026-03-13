import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import Config from '../config.js';

const API_URL = Config.API_URL;
const KEYCHAIN_SERVICE = 'seedhape_api_key';

// ─── API key storage ─────────────────────────────────────────────────────────

export async function saveApiKey(apiKey: string): Promise<void> {
  await Keychain.setGenericPassword('apikey', apiKey, { service: KEYCHAIN_SERVICE });
}

export async function getApiKey(): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    return result ? result.password : null;
  } catch {
    return null;
  }
}

export async function clearApiKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  await AsyncStorage.multiRemove(['deviceId', 'merchantId']);
}

// ─── Device headers (heartbeat / notifications) ───────────────────────────────

async function getDeviceHeaders(): Promise<Record<string, string>> {
  const [deviceId, merchantId] = await Promise.all([
    AsyncStorage.getItem('deviceId'),
    AsyncStorage.getItem('merchantId'),
  ]);
  if (!deviceId || !merchantId) return {};
  return { 'X-Device-Id': deviceId, 'X-Merchant-Id': merchantId };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Verify an API key and return the merchant profile, or null if invalid. */
export async function verifyApiKey(apiKey: string) {
  const res = await fetch(`${API_URL}/v1/merchant/profile`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; businessName: string; upiId: string | null }>;
}

export async function registerDevice(params: {
  apiKey: string;
  deviceId: string;
  appVersion: string;
  deviceModel?: string;
}) {
  const res = await fetch(`${API_URL}/internal/device/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      deviceId: params.deviceId,
      appVersion: params.appVersion,
      deviceModel: params.deviceModel,
    }),
  });

  if (!res.ok) throw new Error(`Device registration failed: ${res.status}`);

  const data = await res.json() as { merchantId: string };
  await AsyncStorage.setItem('merchantId', data.merchantId);
  await AsyncStorage.setItem('deviceId', params.deviceId);
  return data;
}

export async function sendHeartbeat(params: {
  deviceId: string;
  batteryLevel?: number;
  isCharging?: boolean;
}) {
  const headers = await getDeviceHeaders();
  return fetch(`${API_URL}/internal/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(params),
  });
}

export async function sendNotifications(notifications: unknown[]) {
  if (notifications.length === 0) return;
  const headers = await getDeviceHeaders();
  return fetch(`${API_URL}/internal/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ notifications }),
  });
}

export async function getMerchantProfile(apiKey: string) {
  const res = await fetch(`${API_URL}/v1/merchant/profile`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getTransactions(apiKey: string, page = 1) {
  const res = await fetch(`${API_URL}/v1/merchant/transactions?page=${page}&limit=20`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { data: [] };
  return res.json();
}
