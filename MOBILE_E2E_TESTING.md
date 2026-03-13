# SeedhaPe Mobile E2E Testing (Local Wi-Fi)

This guide runs the full flow on your real Android phone:
- API backend (`apps/api`)
- Web dashboard (`apps/web`)
- Mobile app (`apps/mobileapp`)

All services run on your laptop, and the phone connects over local Wi-Fi.

## 1) Prerequisites

- Docker running (for Postgres + Redis)
- Android phone + USB debugging enabled
- Phone and laptop on the same Wi-Fi network
- Clerk test keys configured in:
  - `apps/api/.env`
  - `apps/web/.env.local`
  - `apps/mobileapp/.env`

## 2) Configure local env files

### API env
Check `apps/api/.env`:

```env
DATABASE_URL=postgresql://seedhape:seedhape_dev_password@localhost:5432/seedhape
REDIS_URL=redis://:seedhape_redis_password@localhost:6379
API_PORT=3001
JWT_SECRET=your_long_random_secret
CLERK_SECRET_KEY=sk_test_...
```

### Web env
Check `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
JWT_SECRET=same_as_api_jwt_secret
```

### Mobile env (important for phone)
Edit `apps/mobileapp/.env`:

```env
SEEDHAPE_API_TARGET=device
SEEDHAPE_API_URL_ANDROID_DEVICE=http://<YOUR_LAPTOP_LAN_IP>:3001
SEEDHAPE_API_URL_ANDROID_EMULATOR=http://10.0.2.2:3001
SEEDHAPE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Replace `<YOUR_LAPTOP_LAN_IP>` with your laptop IP on Wi-Fi (example: `192.168.1.23`).

## 3) Start infra + API + web

From repo root:

```bash
docker compose up -d
```

Run API (terminal 1):

```bash
cd apps/api
npm run dev
```

Run web (terminal 2):

```bash
cd apps/web
npm run dev
```

## 4) Ensure DB schema exists

If API logs table errors like `relation "merchants" does not exist`, run:

```bash
cd apps/api
npm run db:migrate
```

Then restart API.

## 5) Run mobile app on real Android phone

In a new terminal:

```bash
cd apps/mobileapp
npm run android
```

This automatically generates mobile config from `.env` before launch.

## 6) E2E test flow

1. Open web dashboard at `http://localhost:3000`.
2. Sign in with Clerk test user.
3. Go to **Dashboard -> Settings**.
4. Click **New Key** and copy the generated API key.
5. Open mobile app on phone.
6. Paste API key in mobile onboarding screen.
7. Confirm merchant profile loads (home/transactions/disputes/settings tabs).
8. Create a payment/order from web flow and verify it appears in mobile data.

## 7) What Step 8 Means (Create order and verify)

Step 8 is validating the core business loop:

1. You create a new order (`sp_ord_...`) for your merchant.
2. A UPI notification arrives from the device.
3. Backend matches the notification to that order.
4. Order status becomes `VERIFIED`.
5. Mobile transactions list shows the verified payment.

For local testing, you can do this without a real UPI app by sending a mock notification (next section).

## 8) Mock notification test (copy/paste)

Use this to simulate a real payment notification and verify end-to-end flow.

### 8.1 Set variables

```bash
API=http://localhost:3001
KEY=sp_live_your_generated_key
DEVICE_ID=test-device-001
```

### 8.2 Ensure merchant has UPI ID

In dashboard settings, set a valid `upiId` (example: `merchant@ybl`), then save.

### 8.3 Register a test device and capture `merchantId`

```bash
REGISTER=$(curl -s -X POST "$API/internal/device/register" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"appVersion\":\"1.0.0\",\"deviceModel\":\"Mock\"}")

echo "$REGISTER"
MERCHANT_ID=$(echo "$REGISTER" | sed -n 's/.*"merchantId":"\([^"]*\)".*/\1/p')
echo "$MERCHANT_ID"
```

### 8.4 Create an order

```bash
ORDER=$(curl -s -X POST "$API/v1/orders" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":50000,"description":"E2E test","randomizeAmount":false}')

echo "$ORDER"
ORDER_ID=$(echo "$ORDER" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "$ORDER_ID"
```

### 8.5 Send mock notification (with matching order ID in note)

```bash
curl -s -X POST "$API/internal/notifications" \
  -H "X-Device-Id: $DEVICE_ID" \
  -H "X-Merchant-Id: $MERCHANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"notifications\": [
      {
        \"packageName\": \"com.phonepe.app\",
        \"title\": \"₹500 paid to My Shop\",
        \"body\": \"UPI Ref: 123456789012 | Note: $ORDER_ID\",
        \"amount\": 50000,
        \"utr\": \"123456789012\",
        \"transactionNote\": \"$ORDER_ID\",
        \"senderName\": \"Test User\",
        \"upiApp\": \"phonepe\",
        \"receivedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"rawTitle\": \"₹500 paid to My Shop\",
        \"rawBody\": \"UPI Ref: 123456789012 | Note: $ORDER_ID\"
      }
    ]
  }"
```

### 8.6 Check order status

```bash
curl -s -H "Authorization: Bearer $KEY" "$API/v1/orders/$ORDER_ID/status"
```

Expected: `"status":"VERIFIED"` (may take a few seconds due to queue processing).

## 9) Quick connectivity checks

From phone browser, open:

`http://<YOUR_LAPTOP_LAN_IP>:3001/health`

Expected response:

```json
{"status":"ok","timestamp":"..."}
```

If this fails, mobile app will not reach backend.

## 10) Short production guide

1. Deploy API + web behind HTTPS with stable domains.
2. Use managed Postgres + Redis with backups and monitoring.
3. Switch all Clerk keys/webhook secret to production values.
4. Set strict `CORS_ORIGINS` and strong `JWT_SECRET`.
5. Keep API and worker processes running (notification/webhook queues).
6. Configure alerting/logging (Sentry + structured logs).
7. Lock firewall/security groups to required ports only.
8. Rotate secrets regularly and never commit `.env` files.

## 11) Common issues

- **New Key button does nothing**
  - Check API terminal logs.
  - Verify DB migrations were applied.

- **`DATABASE_URL is not set`**
  - Restart API after env edits.
  - Ensure `apps/api/.env` exists and has `DATABASE_URL`.

- **Phone cannot connect to API**
  - Confirm phone/laptop same Wi-Fi.
  - Confirm `SEEDHAPE_API_URL_ANDROID_DEVICE` uses laptop LAN IP, not `localhost`.
  - Allow port `3001` through firewall.

- **Metro caching stale config**
  - In `apps/mobileapp`: `npm run start -- --reset-cache`

- **Android device not detected**
  - Run `adb devices` and accept device prompt.
