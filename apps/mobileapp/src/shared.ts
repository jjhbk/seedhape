/** Inline copy of the utilities needed from @seedhape/shared */

export const UPI_APP_PACKAGES = {
  PHONEPE: 'com.phonepe.app',
  GPAY: 'com.google.android.apps.nbu.paisa.user',
  PAYTM: 'net.one97.paytm',
  BHIM: 'in.org.npci.upiapp',
  AMAZON_PAY: 'in.amazon.mShop.android.shopping',
  WHATSAPP: 'com.whatsapp',
  CRED: 'com.dreamplug.androidapp',
} as const;

export const UPI_APP_NAMES: Record<string, string> = {
  'com.phonepe.app': 'PhonePe',
  'com.google.android.apps.nbu.paisa.user': 'Google Pay',
  'net.one97.paytm': 'Paytm',
  'in.org.npci.upiapp': 'BHIM',
  'in.amazon.mShop.android.shopping': 'Amazon Pay',
  'com.whatsapp': 'WhatsApp Pay',
  'com.dreamplug.androidapp': 'CRED',
};

/** Convert paise (integer) to formatted rupee string e.g. 49900 → "499.00" */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}
