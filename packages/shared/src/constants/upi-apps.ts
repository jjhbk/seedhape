export const UPI_APP_PACKAGES = {
  PHONEPE: 'com.phonepe.app',
  GPAY: 'com.google.android.apps.nbu.paisa.user',
  PAYTM: 'net.one97.paytm',
  BHIM: 'in.org.npci.upiapp',
  AMAZON_PAY: 'in.amazon.mShop.android.shopping',
  WHATSAPP: 'com.whatsapp',
  AXIS_PAY: 'com.axis.mobile',
  ICICI_IMOBILE: 'com.csam.icici.bank.imobile',
  SBI_PAY: 'com.sbi.upi',
  HDFC_PAYZAPP: 'com.enstage.wibmo.hdfc',
  CRED: 'com.dreamplug.androidapp',
  SLICE: 'com.myslice.app',
} as const;

export type UpiAppPackage = (typeof UPI_APP_PACKAGES)[keyof typeof UPI_APP_PACKAGES];

export const UPI_APP_NAMES: Record<string, string> = {
  [UPI_APP_PACKAGES.PHONEPE]: 'PhonePe',
  [UPI_APP_PACKAGES.GPAY]: 'Google Pay',
  [UPI_APP_PACKAGES.PAYTM]: 'Paytm',
  [UPI_APP_PACKAGES.BHIM]: 'BHIM UPI',
  [UPI_APP_PACKAGES.AMAZON_PAY]: 'Amazon Pay',
  [UPI_APP_PACKAGES.WHATSAPP]: 'WhatsApp Pay',
  [UPI_APP_PACKAGES.AXIS_PAY]: 'Axis Pay',
  [UPI_APP_PACKAGES.ICICI_IMOBILE]: 'iMobile Pay',
  [UPI_APP_PACKAGES.SBI_PAY]: 'SBI Pay',
  [UPI_APP_PACKAGES.HDFC_PAYZAPP]: 'PayZapp',
  [UPI_APP_PACKAGES.CRED]: 'CRED',
  [UPI_APP_PACKAGES.SLICE]: 'Slice',
};
