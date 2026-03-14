import { NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  planKey: z.enum(['FREE', 'STARTER', 'GROWTH', 'PRO']),
});

const PLAN_AMOUNT_PAISE: Record<'STARTER' | 'GROWTH' | 'PRO', number> = {
  STARTER: 49_900,
  GROWTH: 149_900,
  PRO: 399_900,
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', code: 'INVALID_INPUT' }, { status: 400 });
  }

  const { planKey } = parsed.data;
  if (planKey === 'FREE') {
    return NextResponse.json({ checkoutUrl: '/sign-up' });
  }

  const apiKey = process.env['SEEDHAPE_BILLING_API_KEY'];
  const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3001';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Billing integration is not configured', code: 'MISSING_BILLING_KEY' },
      { status: 500 },
    );
  }

  const amount = PLAN_AMOUNT_PAISE[planKey];
  const externalOrderId = `seedhape_plan_${planKey.toLowerCase()}_${Date.now()}`;

  const orderRes = await fetch(`${apiBase}/v1/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      description: `seedhape ${planKey} plan subscription`,
      externalOrderId,
      randomizeAmount: false,
      metadata: {
        source: 'pricing_page',
        planKey,
      },
    }),
    cache: 'no-store',
  });

  const orderBody = await orderRes.json().catch(() => ({}));
  if (!orderRes.ok || !orderBody?.id) {
    return NextResponse.json(
      {
        error: orderBody?.error ?? 'Failed to create checkout order',
        code: orderBody?.code ?? 'CHECKOUT_CREATE_FAILED',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    orderId: orderBody.id as string,
    checkoutUrl: `/pay/${orderBody.id as string}`,
  });
}
