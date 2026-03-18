import { and, eq, gte, inArray, ne, sql } from 'drizzle-orm';

import type { ParsedNotification } from '@seedhape/shared';

import { db } from '../db/index.js';
import { orders, transactions, merchants, paymentLinks } from '../db/schema/index.js';
import { logger } from '../lib/logger.js';
import { enqueueWebhook } from '../queues/webhook.js';

export type MatchResult =
  | { matched: true; orderId: string; method: 'order_id_direct' | 'tn_field' | 'amount_window' }
  | { matched: false; reason: string };

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function namesPartiallyMatch(expected: string, actual: string): boolean {
  const a = normalizeName(expected);
  const b = normalizeName(actual);
  if (!a || !b) return false;
  if (a === b) return true;

  // Direct partial match for cases like "rahul" vs "rahulkumar".
  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;

  // Token overlap match for cases like "rahul sharma" vs "sharma rahul".
  const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(actual);
  if (expectedTokens.length === 0 || actualTokens.length === 0) return false;

  return expectedTokens.some((t) => actualTokens.includes(t));
}

/**
 * Core matching engine.
 *
 * Strategy 1 (primary): Extract order ID from `tn` field, verify amount + expiry.
 * Strategy 2 (secondary): amount + merchantId within 15min window → single match = VERIFIED,
 *   collision = DISPUTED.
 */
export async function matchNotification(
  merchantId: string,
  notification: ParsedNotification,
): Promise<MatchResult> {
  const { amount, utr, transactionNote, senderName, upiApp } = notification;

  // Guard: deduplicate by UTR
  if (utr) {
    const [existing] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.utr, utr), eq(transactions.merchantId, merchantId)))
      .limit(1);

    if (existing) {
      return { matched: false, reason: 'duplicate_utr' };
    }
  }

  // Strategy 0: direct order ID scan from raw notification body/title.
  // Catches order IDs that UPI apps embed in the notification text without a standard
  // "Note:" prefix — GPay in particular includes the UPI tn field in plain text.
  const rawText = `${notification.rawTitle ?? ''} ${notification.rawBody ?? ''}`;
  const rawOrderIdMatch = rawText.match(/sp_ord_[a-z0-9]+/i);
  if (rawOrderIdMatch) {
    const orderId = rawOrderIdMatch[0]!.toLowerCase();
    const result = await verifyAndSettle(orderId, merchantId, amount, notification, 'order_id_direct');
    if (result.matched) return result;
  }

  // Strategy 1: parser-extracted tn field contains order ID
  if (transactionNote) {
    const orderIdMatch = transactionNote.match(/sp_ord_[a-z0-9]+/i);
    if (orderIdMatch) {
      const orderId = orderIdMatch[0]!.toLowerCase();
      const result = await verifyAndSettle(orderId, merchantId, amount, notification, 'tn_field');
      if (result.matched) return result;
    }
  }

  // Strategy 2: amount + merchant + 15-minute window.
  // This supports UPI notifications that only include payer name + amount.
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);

  const candidates = await db
    .select({ id: orders.id, metadata: orders.metadata, createdAt: orders.createdAt })
    .from(orders)
    .where(
      and(
        eq(orders.merchantId, merchantId),
        eq(orders.amount, amount),
        inArray(orders.status, ['CREATED', 'PENDING']),
        gte(orders.expiresAt, new Date()),
        gte(orders.createdAt, windowStart),
      ),
    );

  // Strategy 2a: amount + expected sender name (if merchant captured payer name in checkout)
  const normalizedSenderName = senderName ? normalizeName(senderName) : null;
  const namedCandidates =
    normalizedSenderName
      ? candidates.filter((candidate) => {
          const expected = (candidate.metadata as { expectedSenderName?: string } | null)
            ?.expectedSenderName;
          return typeof expected === 'string' && namesPartiallyMatch(expected, senderName!);
        })
      : [];

  if (namedCandidates.length === 1 && namedCandidates[0]) {
    return verifyAndSettle(namedCandidates[0].id, merchantId, amount, notification, 'amount_window');
  }

  if (candidates.length === 0) {
    return { matched: false, reason: 'no_matching_orders' };
  }

  if (candidates.length === 1 && candidates[0]) {
    const orderId = candidates[0].id;
    return verifyAndSettle(orderId, merchantId, amount, notification, 'amount_window');
  }

  // Strategy 2b: if only one candidate is very recent, prefer it.
  // This helps avoid false disputes in low-amount test plans (₹1/₹2/₹3) where older pending
  // orders may share the same amount.
  const recentCutoff = new Date(Date.now() - 90 * 1000);
  const recentCandidates = candidates.filter((c) => c.createdAt >= recentCutoff);
  if (recentCandidates.length === 1 && recentCandidates[0]) {
    return verifyAndSettle(recentCandidates[0].id, merchantId, amount, notification, 'amount_window');
  }

  // Multiple candidates — mark all as DISPUTED
  logger.warn(
    { merchantId, amount, candidateCount: candidates.length },
    'Ambiguous match — flagging as DISPUTED',
  );

  for (const candidate of candidates) {
    await db
      .update(orders)
      .set({ status: 'DISPUTED', updatedAt: new Date() })
      .where(eq(orders.id, candidate.id));

    void enqueueWebhook({ orderId: candidate.id, event: 'order.disputed' });
  }

  return { matched: false, reason: 'ambiguous_amount_collision' };
}

async function verifyAndSettle(
  orderId: string,
  merchantId: string,
  amount: number,
  notification: ParsedNotification,
  method: 'order_id_direct' | 'tn_field' | 'amount_window',
): Promise<MatchResult> {
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.merchantId, merchantId),
        ne(orders.status, 'EXPIRED'),
        ne(orders.status, 'REJECTED'),
        ne(orders.status, 'VERIFIED'),
      ),
    )
    .limit(1);

  if (!order) {
    return { matched: false, reason: 'order_not_found_or_terminal' };
  }

  if (new Date() > order.expiresAt) {
    return { matched: false, reason: 'order_expired' };
  }

  if (order.amount !== amount) {
    logger.warn(
      { orderId, expected: order.amount, received: amount },
      'Amount mismatch — flagging as DISPUTED',
    );

    await db
      .update(orders)
      .set({ status: 'DISPUTED', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    void enqueueWebhook({ orderId, event: 'order.disputed' });
    return { matched: false, reason: 'amount_mismatch' };
  }

  const expectedSenderName = (order.metadata as { expectedSenderName?: string } | null)
    ?.expectedSenderName;
  if (expectedSenderName && notification.senderName) {
    if (!namesPartiallyMatch(expectedSenderName, notification.senderName)) {
      logger.warn(
        { orderId, expectedSenderName, receivedSenderName: notification.senderName },
        'Sender name mismatch — flagging as DISPUTED',
      );

      await db
        .update(orders)
        .set({ status: 'DISPUTED', updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      void enqueueWebhook({ orderId, event: 'order.disputed' });
      return { matched: false, reason: 'sender_name_mismatch' };
    }
  }

  const now = new Date();

  // Create transaction record
  await db.insert(transactions).values({
    orderId,
    merchantId,
    utr: notification.utr,
    amount,
    senderName: notification.senderName,
    upiApp: notification.upiApp ?? notification.packageName,
    rawNotification: notification as Record<string, unknown>,
    matchedVia: method,
  });

  // Update order to VERIFIED
  await db
    .update(orders)
    .set({
      status: 'VERIFIED',
      verificationMethod: 'UPI_NOTIFICATION',
      verifiedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  // Increment monthly tx count
  await db
    .update(merchants)
    .set({ monthlyTxCount: sql`monthly_tx_count + 1` })
    .where(eq(merchants.id, merchantId));

  // If order came from a payment link, increment its totalCollected
  const linkId = (order.metadata as { linkId?: string } | null)?.linkId;
  if (linkId) {
    await db
      .update(paymentLinks)
      .set({ totalCollected: sql`${paymentLinks.totalCollected} + ${order.originalAmount}` })
      .where(eq(paymentLinks.id, linkId));
  }

  void enqueueWebhook({ orderId, event: 'order.verified' });

  logger.info({ orderId, method, amount }, 'Order verified');
  return { matched: true, orderId, method };
}
