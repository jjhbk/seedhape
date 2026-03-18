# SeedhaPe Security Audit Report

Date: 2026-03-18
Auditor: Codex (GPT-5)
Repository: `/home/jjhbk/seedhape`

## Executive Summary

This project has multiple **high-impact security issues** that should be treated as urgent:

- **Critical:** live/semi-live secrets are committed in tracked `.env` files.
- **Critical:** internal privileged endpoints rely on a shared static `JWT_SECRET` header model.
- **High:** SDK checkout rendering uses unsanitized `innerHTML` with API-provided fields, enabling DOM XSS in merchant sites.
- **High:** device auth for internal ingestion relies only on `x-device-id` + `x-merchant-id` and can be spoofed if identifiers leak.
- **High/Moderate:** known dependency vulnerabilities in `next`, `undici`, and `fast-xml-parser`.

Current overall risk posture: **High**.

## Scope and Methodology

Reviewed:

- API (`apps/api`): middleware, auth, routing, webhook handling, queues, data schema
- Web app (`apps/web`): API routes, middleware, billing/webhook integration
- Mobile app (`apps/mobileapp`): auth/storage/network flows, Android notification/SMS ingestion
- SDK packages (`packages/sdk`, `packages/react`, `packages/shared`)
- Environment/config handling and lockfile dependency audit

Techniques:

- Manual code review with data-flow and trust-boundary analysis
- Secret pattern scanning (`rg`) and config inspection
- Dependency audit (`pnpm audit --prod`, `npm audit --omit=dev --json`)

## Findings

### 1) Committed Secrets in Repository
Severity: **Critical**

Evidence:

- `apps/api/.env` contains DB credentials, Redis credentials, Clerk secret keys, webhook secrets, blob token, and JWT secret (`apps/api/.env:3-14`)
- `apps/web/.env.local` contains DB URL, Clerk secrets, JWT secret, webhook secret (`apps/web/.env.local:2-21`)

Impact:

- Anyone with repository access can directly access infrastructure/services.
- Enables API impersonation, database compromise, webhook forgery, and lateral movement.

Recommendations:

- Rotate all exposed credentials immediately (DB, Redis, Clerk, blob, webhook secrets, JWT/internal secret).
- Remove tracked secret files from git history (`git rm --cached ...` + history rewrite if needed).
- Enforce secret scanning in CI (e.g., gitleaks/trufflehog).
- Keep only sanitized `.env.example` templates.

---

### 2) Internal Privileged Endpoints Protected by Shared Static Secret
Severity: **Critical**

Evidence:

- `/internal/sync-user` and `/internal/billing/apply-plan` trust `x-internal-secret === process.env.JWT_SECRET` (`apps/api/src/routes/sync.ts:18-21`, `:50-53`)
- Duplicate privileged plan endpoint uses same pattern (`apps/api/src/routes/internal.ts:330-335`)
- Webhooks forward this same shared secret (`apps/web/src/app/api/webhooks/clerk/route.ts:50-55`, `apps/web/src/app/api/webhooks/seedhape/route.ts:53-58`)

Impact:

- Single secret compromise grants broad internal privilege (user sync and billing plan mutation).
- No audience scoping, no expiry, no nonce/replay protection, no per-service identity.

Recommendations:

- Replace shared static secret with signed short-lived service-to-service tokens (JWT with aud/iss/exp/jti) or mTLS.
- Split internal privileges by endpoint and service identity.
- Add replay protection (nonce/jti cache) and rate limiting.
- Remove duplicate billing-apply endpoint to reduce attack surface.

---

### 3) DOM XSS Risk in Browser SDK (`packages/sdk`)
Severity: **High**

Evidence:

- API-returned values are interpolated directly into `innerHTML` template strings:
  - `order.description` in header (`packages/sdk/src/client.ts:203`)
  - `order.expectedSenderName` in input value (`packages/sdk/src/client.ts:271`)

Impact:

- If attacker-controlled content reaches these fields, arbitrary script can execute in payer browsers on merchant sites using the SDK modal.
- Could steal session data, alter payment UX, or execute phishing overlays.

Recommendations:

- Eliminate unsafe `innerHTML` for dynamic data; use DOM text setters (`textContent`, `setAttribute`) with explicit escaping.
- Centralize HTML escaping utility and apply to all interpolated fields.
- Add XSS tests with payloads (`<img onerror=...>`, quote-breaking attribute payloads).

---

### 4) Weak Device Authentication for Internal Mobile Ingestion
Severity: **High**

Evidence:

- Device trust is based only on `X-Device-Id` + `X-Merchant-Id` lookup (`apps/api/src/middleware/auth.ts:126-153`)
- Sensitive endpoints use this model (`apps/api/src/routes/internal.ts:248-319`)

Impact:

- If identifiers are leaked/extracted/intercepted, attacker can spoof heartbeats or submit forged notifications.
- Could manipulate merchant status and payment matching pipeline.

Recommendations:

- Issue per-device cryptographic tokens (signed JWT or HMAC key) at registration.
- Require request signing (timestamp + nonce + body hash) to prevent replay.
- Bind device credentials to app attestation where possible (Play Integrity / SafetyNet).
- Expire and rotate device credentials; provide revoke flow.

---

### 5) Webhook Signature Verification Uses `timingSafeEqual` Without Length Guard
Severity: **Medium**

Evidence:

- `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))` used directly:
  - `apps/api/src/routes/billing-webhooks.ts:34`
  - `apps/web/src/app/api/webhooks/seedhape/route.ts:30`

Impact:

- Mismatched-length input can throw and trigger 500 responses, allowing low-cost error flooding/noise.

Recommendations:

- Validate exact expected signature length before `timingSafeEqual`.
- Return clean 401 on malformed signatures, never 500.

---

### 6) Sensitive Payment Data Logged
Severity: **Medium**

Evidence:

- Notification ingestion logs include `senderName` and `transactionNote` (`apps/api/src/routes/internal.ts:305-313`)
- Mobile client logs payment details to console (`apps/mobileapp/src/services/notification-bridge.ts:39`)

Impact:

- PII/financial metadata can leak via logs, support exports, and observability backends.

Recommendations:

- Redact or hash sensitive fields in logs.
- Disable verbose client logging in production builds.
- Add structured log policy (PII allowlist/denylist).

---

### 7) Public Screenshot Uploads Stored With Public Access
Severity: **Medium**

Evidence:

- Upload uses `access: 'public'` (`apps/api/src/routes/pay.ts:249-252`)

Impact:

- Uploaded payment screenshots may contain sensitive payer details and become publicly accessible if URL leaks.

Recommendations:

- Store private by default and return signed short-lived URLs.
- Add malware/content validation and strict MIME+magic-byte checks.
- Consider encryption at rest + retention policy for dispute evidence.

---

### 8) No Rate Limiting on Public and Internal Endpoints
Severity: **Medium**

Evidence:

- No rate limiter middleware configured in app bootstrap (`apps/api/src/app.ts:16-58`)
- Public endpoints include unauthenticated `/v1/pay/*` POSTs and file upload.

Impact:

- Increased susceptibility to brute force, abuse, and DoS (especially screenshot upload and polling endpoints).

Recommendations:

- Add IP + token aware rate limits and burst controls.
- Add stricter limits for file upload routes and webhook endpoints.

---

### 9) Dependency Vulnerabilities (as of 2026-03-18)
Severity: **High/Moderate**

Evidence from `pnpm audit --prod` and `npm audit --omit=dev`:

- `undici <6.24.0` via `@vercel/blob@0.27.3` (multiple advisories, including high)
- `next <15.5.13` (`apps/web` currently on `15.5.12`) advisory `GHSA-ggv3-7p47-pfv8`
- `fast-xml-parser <=5.5.5` via React Native CLI chain advisory `GHSA-8gc5-j5rx-235r`

Recommendations:

- Upgrade `next` to `>=15.5.13` (or latest patched stable).
- Upgrade `@vercel/blob` path to consume patched `undici`.
- Bump React Native CLI packages to versions pulling patched `fast-xml-parser` (audit suggested `20.1.2`).
- Re-run audits in CI on each PR.

## Positive Controls Observed

- API keys are hashed at rest (`sha256`) and plaintext is not stored in DB.
- Widespread Zod schema validation is present across critical input surfaces.
- Clerk webhook signature verification exists (Svix verification).
- Helmet enabled and webhook route uses raw body parser where needed.

## Prioritized Remediation Plan

### Immediate (0-24 hours)

- Rotate all exposed secrets.
- Remove tracked `.env` files from git and block future secret commits.
- Disable/rotate `JWT_SECRET` and any secret reused across services.

### Short Term (1-7 days)

- Replace internal static-secret auth with scoped signed service auth.
- Patch `next`, `undici` path, and React Native CLI dependency chain.
- Add strict webhook signature length checks.
- Add API rate limiting.

### Medium Term (1-3 weeks)

- Refactor SDK rendering to eliminate unsafe `innerHTML` for dynamic fields.
- Implement device request signing and credential rotation.
- Reduce log sensitivity and enforce log-redaction policies.
- Move dispute assets to private object storage access pattern.

## Suggested Verification After Fixes

- Secret scan + git history scan passes with zero active secrets.
- Pen-test checklist for:
  - internal endpoint auth bypass attempts
  - XSS payload injection through order metadata/description/name
  - webhook malformed signature fuzzing
  - replay/spoof tests on device endpoints
- Dependency audit returns no High/Critical findings.

