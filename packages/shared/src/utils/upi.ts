/**
 * Build a UPI payment URI.
 * @param upiId - Merchant's VPA (e.g., merchant@ybl)
 * @param name - Merchant display name
 * @param amountPaise - Amount in paise
 * @param orderId - Order ID to embed in `tn` field
 */
export function buildUpiUri(
  upiId: string,
  name: string,
  amountPaise: number,
  orderId: string,
): string {
  const amountRupees = (amountPaise / 100).toFixed(2);
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amountRupees,
    tn: orderId,
    cu: 'INR',
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Convert paise to rupees string with 2 decimal places.
 */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Convert rupees to paise (integer).
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Randomize amount by ±1-3 paise to disambiguate concurrent orders.
 */
export function randomizeAmount(amountPaise: number, maxDeltaPaise = 3): number {
  const delta = Math.floor(Math.random() * (maxDeltaPaise * 2 + 1)) - maxDeltaPaise;
  return Math.max(1, amountPaise + delta);
}
