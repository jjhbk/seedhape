import crypto from 'node:crypto';

const API_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001';
const INTERNAL_SECRET = process.env['JWT_SECRET'] ?? '';
const SEEDHAPE_WEBHOOK_SECRET = process.env['SEEDHAPE_WEBHOOK_SECRET'] ?? '';

type PlanKey = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO';

type SeedhapeWebhookPayload = {
  event: 'order.verified' | 'order.expired' | 'order.disputed' | 'order.resolved';
  timestamp: string;
  data: {
    orderId: string;
    status: string;
    metadata?: {
      source?: string;
      planKey?: PlanKey;
      [k: string]: unknown;
    } | null;
  };
};

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  if (!SEEDHAPE_WEBHOOK_SECRET) return false;
  if (!signatureHeader.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto
    .createHmac('sha256', SEEDHAPE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-seedhape-signature') ?? '';
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody) as SeedhapeWebhookPayload;

  // Activate subscription plan only for pricing-page verified orders.
  if (payload.event === 'order.verified') {
    const metadata = payload.data.metadata ?? {};
    const planKey = metadata.planKey;
    const source = metadata.source;

    if (
      source === 'pricing_page' &&
      ['FREE', 'STARTER', 'GROWTH', 'PRO'].includes(String(planKey))
    ) {
      await fetch(`${API_URL}/internal/billing/apply-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body: JSON.stringify({
          orderId: payload.data.orderId,
          planKey,
        }),
      }).catch(() => null);
    }
  }

  return new Response('OK', { status: 200 });
}
