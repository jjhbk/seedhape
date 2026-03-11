import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://10.0.2.2:3001';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const [deviceId, merchantId] = await Promise.all([
    AsyncStorage.getItem('deviceId'),
    AsyncStorage.getItem('merchantId'),
  ]);

  if (!deviceId || !merchantId) return {};

  return {
    'X-Device-Id': deviceId,
    'X-Merchant-Id': merchantId,
  };
}

export async function registerDevice(params: {
  clerkToken: string;
  deviceId: string;
  appVersion: string;
  deviceModel?: string;
}) {
  const res = await fetch(`${API_URL}/internal/device/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.clerkToken}`,
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
  const headers = await getAuthHeaders();
  return fetch(`${API_URL}/internal/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(params),
  });
}

export async function sendNotifications(notifications: unknown[]) {
  if (notifications.length === 0) return;

  const headers = await getAuthHeaders();
  return fetch(`${API_URL}/internal/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ notifications }),
  });
}

export async function getMerchantProfile(clerkToken: string) {
  const res = await fetch(`${API_URL}/v1/merchant/profile`, {
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getTransactions(clerkToken: string, page = 1) {
  const res = await fetch(`${API_URL}/v1/merchant/transactions?page=${page}&limit=20`, {
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
  if (!res.ok) return { data: [] };
  return res.json();
}
