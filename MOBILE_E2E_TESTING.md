# SeedhaPe Live E2E Guide (Concise)

This is the shortest path to test the full real flow in production-like mode:
1. Pricing checkout creates order.
2. Customer pays via UPI.
3. Merchant phone receives notification.
4. Order verifies.
5. Billing webhook updates merchant plan.

## 1) Preconditions

- API and Web are running on public HTTPS domains.
- Android merchant phone has internet, notification listener enabled, battery unrestricted.
- You have one merchant account in SeedhaPe dashboard.

## 2) Required env values

## API (`apps/api/.env`)

```env
NODE_ENV=production
API_BASE_URL=https://api.yourdomain.com

DATABASE_URL=...
REDIS_URL=...
JWT_SECRET=...
CLERK_SECRET_KEY=sk_live_...

# Incoming billing webhook verify secret
SEEDHAPE_WEBHOOK_SECRET=<random secret>

# Outgoing merchant webhook signature secret fallback
WEBHOOK_SIGNING_SECRET=<different random secret>
```

## Web (`apps/web/.env.local` or prod env)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# API key used by pricing page checkout route
SEEDHAPE_BILLING_API_KEY=sp_live_xxx
```

Generate secrets:

```bash
openssl rand -hex 32
```

## 3) Merchant setup (one-time)

In `Dashboard -> Settings`:

1. Set `UPI ID`.
2. Set `Webhook URL`:
   - `https://api.yourdomain.com/v1/billing/webhooks/seedhape`
3. Set `Webhook Secret` exactly equal to `SEEDHAPE_WEBHOOK_SECRET` from API env.
4. Save.
5. Generate a live API key (`sp_live_...`).
6. Put that key into web env as `SEEDHAPE_BILLING_API_KEY` and restart web.
7. Paste same key into mobile app onboarding.

## 4) Mobile readiness check

On phone:

1. Open SeedhaPe app.
2. Confirm merchant profile loads.
3. Move app to background.
4. Confirm persistent service notification is visible.

On dashboard overview:

- Merchant status should become `ONLINE` within about a minute.

## 5) Live E2E payment test

1. Open `https://yourwebdomain.com/pricing`.
2. Select a paid plan (`STARTER/GROWTH/PRO`).
3. You should reach `/pay/<orderId>`.
4. Complete a real UPI payment.
5. Wait 5-20 seconds.

Expected result:

- Pay page status: `VERIFIED`.
- Dashboard `Transactions`: new verified order appears.
- Mobile app `Transactions`: same payment appears.
- Dashboard plan/usage updates to purchased plan.

## 6) Pass/Fail checklist

Pass if all are true:

- Order moved `PENDING -> VERIFIED`.
- Merchant stayed `ONLINE` during test.
- Billing webhook reached API endpoint successfully.
- Plan updated for merchant after verified order.

## 7) If it fails, check these first

- `Merchant offline`: heartbeat not reaching API.
- `Invalid signature`: dashboard webhook secret != `SEEDHAPE_WEBHOOK_SECRET`.
- `Invalid API key`: wrong/disabled `SEEDHAPE_BILLING_API_KEY`.
- Plan not updated: order metadata missing `source=pricing_page` and `planKey`.
- Domain lock blocked key: clear `Allowed Domain` or send matching origin/domain.
