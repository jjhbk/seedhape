import { NativeModules, NativeEventEmitter } from 'react-native';

import { sendNotifications } from './api';

const { NotificationListener } = NativeModules;
const emitter = new NativeEventEmitter(NotificationListener);

type ParsedNotification = {
  packageName: string;
  title: string;
  body: string;
  amount: number;
  utr?: string;
  transactionNote?: string;
  senderName?: string;
  upiApp?: string;
  receivedAt: string;
  rawTitle: string;
  rawBody: string;
};

let subscription: ReturnType<typeof emitter.addListener> | null = null;
const buffer: ParsedNotification[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start listening for UPI notifications from the native layer.
 * Notifications are batched for 500ms before being sent to the API.
 */
export function startNotificationListener(onNotification?: (n: ParsedNotification) => void) {
  if (subscription) return;

  subscription = emitter.addListener('UPINotification', (data: ParsedNotification) => {
    console.log('[SeedhaPe] UPI notification received:', data.upiApp, '₹', data.amount / 100);
    buffer.push(data);
    onNotification?.(data);
    scheduleFlush();
  });
}

export function stopNotificationListener() {
  subscription?.remove();
  subscription = null;
  if (flushTimer) clearTimeout(flushTimer);
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushBuffer, 500);
}

async function flushBuffer() {
  if (buffer.length === 0) return;
  const toSend = buffer.splice(0, buffer.length);
  try {
    await sendNotifications(toSend);
  } catch (err) {
    console.warn('[SeedhaPe] Failed to send notifications:', err);
    // Re-add to buffer for retry
    buffer.unshift(...toSend);
    scheduleFlush();
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  return NotificationListener.isNotificationAccessGranted();
}

export function requestNotificationPermission() {
  NotificationListener.requestNotificationAccess();
}
