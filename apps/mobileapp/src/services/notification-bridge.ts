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
let isProcessing = false;
let retryCount = 0;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Start listening for UPI notifications from the native layer.
 * Notifications are batched for 500ms before being sent to the API.
 * Concurrent flush calls are guarded by `isProcessing` so concurrent
 * payment notifications don't race each other.
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
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  isProcessing = false;
  retryCount = 0;
}

function scheduleFlush(delayMs = 500) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushBuffer, delayMs);
}

async function flushBuffer() {
  flushTimer = null;

  // Guard against concurrent flushes — a previous flush may still be in-flight
  // (e.g. two notifications arrive within the 500ms window and the timer fires
  // while the first network call hasn't returned yet).
  if (isProcessing) {
    scheduleFlush(200);
    return;
  }

  if (buffer.length === 0) return;

  // Drain the buffer atomically — all notifications currently queued go in
  // one batch so the server sees them in order.
  const toSend = buffer.splice(0, buffer.length);
  isProcessing = true;

  try {
    await sendNotifications(toSend);
    retryCount = 0; // reset backoff on success
  } catch (err) {
    console.warn('[SeedhaPe] Failed to send notifications, will retry:', err);
    // Put notifications back at the front of the buffer (preserve order)
    buffer.unshift(...toSend);
    // Exponential backoff: 1s, 2s, 4s … capped at 30s
    retryCount += 1;
    const delay = Math.min(1_000 * 2 ** (retryCount - 1), MAX_RETRY_DELAY_MS);
    scheduleFlush(delay);
  } finally {
    isProcessing = false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  return NotificationListener.isNotificationAccessGranted();
}

export function requestNotificationPermission() {
  NotificationListener.requestNotificationAccess();
}
