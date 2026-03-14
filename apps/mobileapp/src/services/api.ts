import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { NativeModules } from 'react-native';

import Config from '../config';

const API_URL = Config.API_URL;
const KEYCHAIN_SERVICE = 'seedhape_api_key';
const backgroundSync = (NativeModules as { BackgroundSync?: {
  configureAndStart?: (apiUrl: string, deviceId: string, merchantId: string) => Promise<boolean>;
  startIfConfigured?: () => Promise<boolean>;
  stop?: () => Promise<boolean>;
  isForegroundNotificationEnabled?: () => Promise<boolean>;
  openAppNotificationSettings?: () => void;
} }).BackgroundSync;

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

export async function isForegroundNotificationEnabled(): Promise<boolean> {
  if (!backgroundSync?.isForegroundNotificationEnabled) return true;
  return backgroundSync.isForegroundNotificationEnabled().catch(() => true);
}

export function openAppNotificationSettings(): void {
  backgroundSync?.openAppNotificationSettings?.();
}

export async function ensureBackgroundSyncRunning(): Promise<void> {
  await backgroundSync?.startIfConfigured?.().catch(() => {});
}

export async function clearApiKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  await AsyncStorage.multiRemove(['deviceId', 'merchantId']);
  await backgroundSync?.stop?.().catch(() => {});
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
  const res = await fetch(`${API_URL}/internal/device/verify`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => {
    throw new Error('NETWORK_ERROR');
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
  await backgroundSync?.configureAndStart?.(API_URL, params.deviceId, data.merchantId).catch(() => {});
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
  const res = await fetch(`${API_URL}/internal/device/profile`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getTransactions(apiKey: string, page = 1) {
  const res = await fetch(`${API_URL}/internal/device/transactions?page=${page}&limit=20`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { data: [] };
  return res.json();
}

export async function getDisputes(apiKey: string) {
  const res = await fetch(`${API_URL}/internal/device/disputes`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { data: [] };
  return res.json();
}

export async function resolveDispute(
  apiKey: string,
  disputeId: string,
  resolution: 'APPROVED' | 'REJECTED',
  resolutionNote?: string,
) {
  const res = await fetch(`${API_URL}/internal/device/disputes/${disputeId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resolution, resolutionNote }),
  });
  if (!res.ok) {
    throw new Error(`Dispute resolution failed: ${res.status}`);
  }
  return res.json();
}
