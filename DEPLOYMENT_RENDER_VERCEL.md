# SeedhaPe Deployment Guide: API on Render + Web on Vercel

This guide deploys:
- `@seedhape/api` to Render
- `@seedhape/web` to Vercel

It is written for the current monorepo structure and billing/webhook flow.

## 1) Architecture and domains

Use two public domains:
- API: `https://api.yourdomain.com` (Render)
- Web: `https://yourdomain.com` (Vercel)

Deploy order:
1. Render Postgres + Redis
2. Render API service
3. Run DB migrations
4. Vercel web app
5. Configure Clerk webhook and merchant billing webhook

## 2) Deploy API on Render

### 2.1 Create Render resources

Create:
- PostgreSQL service
- Redis service
- Web Service for API

In API Web Service settings:
- Runtime: `Node`
- Branch: your production branch
- Root Directory: repo root (recommended for workspace builds)
- Health Check Path: `/health`

### 2.2 Build and start commands

Build Command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @seedhape/shared build && pnpm --filter @seedhape/api build
```

Start Command:

```bash
API_PORT=$PORT pnpm --filter @seedhape/api start
```

Important:
- API code reads `API_PORT`, not `PORT`, so keep `API_PORT=$PORT` in start command.
- Keep at least 1 always-on instance because this process also runs workers (webhook, expiry, notification, heartbeat monitor).

### 2.3 API environment variables (Render)

Set these in Render API service:

```env
NODE_ENV=production
API_BASE_URL=https://api.yourdomain.com

DATABASE_URL=<render_postgres_connection_url>
REDIS_URL=<render_redis_connection_url>

CLERK_SECRET_KEY=sk_live_xxx
JWT_SECRET=<long_random_shared_with_web>

CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

SEEDHAPE_WEBHOOK_SECRET=<random_secret_for_incoming_billing_webhook>
WEBHOOK_SIGNING_SECRET=<different_random_secret_for_outgoing_webhooks>

# optional
BLOB_READ_WRITE_TOKEN=<if using screenshot/blob upload features>
```

Generate secrets:

```bash
openssl rand -hex 32
```

Run twice and use different values.

### 2.4 Run database migrations

After first successful API build, run migrations once from Render Shell (or one-off job):

```bash
pnpm --filter @seedhape/api db:migrate
```

Then redeploy/restart API service.

### 2.5 API smoke checks

```bash
curl -s https://api.yourdomain.com/health
```

Expected:

```json
{"status":"ok","timestamp":"..."}
```

## 3) Deploy web app on Vercel

### 3.1 Create Vercel project

Import the same repo.

Recommended project settings:
- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Node.js: `20.x`

Build Command:

```bash
pnpm --filter @seedhape/shared build && pnpm --filter @seedhape/web build
```

Install Command:

```bash
pnpm install --frozen-lockfile
```

### 3.2 Web environment variables (Vercel)

Set these for Production environment:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
API_BASE_URL=https://api.yourdomain.com

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

JWT_SECRET=<same_value_as_api>

# Pricing checkout order creation key
SEEDHAPE_BILLING_API_KEY=sp_live_xxx
```

Notes:
- `SEEDHAPE_BILLING_API_KEY` should be a live API key generated from your SeedhaPe dashboard merchant.
- Keep `JWT_SECRET` exactly the same between API and web so `/api/webhooks/clerk` can call `/internal/sync-user`.

## 4) Clerk production wiring

In Clerk Dashboard:
1. Use production publishable/secret keys in deployed envs.
2. Add webhook endpoint:
   - `https://yourdomain.com/api/webhooks/clerk`
3. Copy webhook signing secret (`whsec_...`) into Vercel env `CLERK_WEBHOOK_SECRET`.
4. Enable `user.created` and `user.updated` events.

## 5) SeedhaPe merchant billing webhook wiring

In SeedhaPe Dashboard -> Settings (merchant profile):
1. Set `Webhook URL` to:
   - `https://api.yourdomain.com/v1/billing/webhooks/seedhape`
2. Set `Webhook Secret` equal to API env `SEEDHAPE_WEBHOOK_SECRET`.
3. Save.

This is what enables pricing plan auto-activation after `order.verified`.

## 6) Production sanity test (end-to-end)

1. Open `https://yourdomain.com/pricing`.
2. Pick a paid plan.
3. Confirm redirect to `/pay/<orderId>`.
4. Complete UPI payment.
5. Verify:
- Order becomes `VERIFIED`.
- Transaction appears in dashboard/mobile.
- Merchant plan updates to purchased tier.

## 7) Common deployment issues

- API boots but healthcheck fails:
  - missing `API_PORT=$PORT` in start command.

- CORS errors from web to API:
  - `CORS_ORIGINS` missing your Vercel domain(s).

- Clerk redirect/session loop:
  - mismatched Clerk publishable vs secret key pair.

- Billing webhook `Invalid signature`:
  - merchant webhook secret does not match `SEEDHAPE_WEBHOOK_SECRET`.

- `DATABASE_URL is not set`:
  - env not set in Render service, or restart required.

- Pricing checkout fails:
  - `SEEDHAPE_BILLING_API_KEY` missing/invalid in Vercel env.

## 8) Recommended hardening before launch

1. Enable custom domains + HTTPS on both Render and Vercel.
2. Rotate all secrets after first deployment.
3. Set Render/Vercel alerts for downtime and error spikes.
4. Restrict API keys using `Allowed Domain` in merchant settings.
5. Keep DB backups enabled and test restore once.