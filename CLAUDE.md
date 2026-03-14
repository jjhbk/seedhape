# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is SeedhaPe

UPI payment middleware for Indian merchants with zero gateway fees. The core flow: customer pays via UPI → Android app captures the payment notification → backend matches it to a pending order → webhook fires to merchant server. No payment gateway intermediary.

## Monorepo Structure

Turborepo + pnpm monorepo. Three apps, three packages, shared tooling.

```
apps/api/          # Express REST API — the backend
apps/web/          # Next.js 15 merchant dashboard
apps/mobileapp/    # React Native Android app (captures UPI notifications)
packages/shared/   # @seedhape/shared — Zod schemas, types, constants
packages/sdk/      # @seedhape/sdk — JS SDK for merchant integration
packages/react/    # @seedhape/react — React components (PaymentButton, Modal)
tooling/           # Shared ESLint, TypeScript, Prettier configs
```

## Commands

```bash
# From repo root (runs via Turborepo across all workspaces)
pnpm dev              # Start all apps in watch mode
pnpm build            # Build all packages and apps
pnpm lint             # Lint all workspaces
pnpm typecheck        # TypeScript check all workspaces
pnpm test             # Run all tests
pnpm format           # Prettier format everything

# Target a specific workspace
pnpm --filter @seedhape/api dev
pnpm --filter @seedhape/web dev
pnpm --filter @seedhape/mobileapp android

# Database (API workspace)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm --filter @seedhape/api db:studio   # Drizzle Studio UI
```

## Local Infrastructure

```bash
docker-compose up -d  # Starts Postgres 16 (port 5432) + Redis 7 (port 6379)
```

Copy `.env.example` → `apps/api/.env` and `apps/web/.env.local` before starting.

## API Architecture (`apps/api`)

Entry point `src/index.ts` starts the Express app and 4 BullMQ workers:
- **webhook worker** — delivers signed webhooks with exponential backoff
- **order-expiry worker** — expires CREATED/PENDING orders past their deadline
- **notification-processor** — processes UPI notifications posted by the Android app
- **heartbeat-monitor** — marks merchants OFFLINE if no heartbeat for >90s

Routes live in `src/routes/`. Business logic in `src/services/`. Key services:
- `services/matching.ts` — payment matching engine: primary match on `tn` (transaction note, contains order ID), fallback on amount + 5-minute time window
- `services/webhooks.ts` — HMAC-signed webhook delivery
- `services/orders.ts` — order lifecycle

The `/internal/*` routes are exclusively for the Android app: posting notifications, registering device tokens, and sending heartbeats.

## Mobile App (`apps/mobileapp`)

Bare React Native (no Expo). The critical native code is in `android/` — a Kotlin `NotificationListenerService` that intercepts UPI payment notifications from apps like PhonePe and Google Pay, parses them with per-app regexes (`NotificationParser.kt`), and forwards them to the API via `NotificationListenerModule.kt` (the React Native bridge).

## Payment Matching Logic

To reduce concurrent-order collisions, order amounts are randomized by ±1-3 paise at creation. The matching engine first tries to extract an order ID from the UPI transaction note field (`tn`), and falls back to matching by amount + time window if that fails.

## Shared Types

All Zod schemas and TypeScript types are in `packages/shared`. Both the API and web app import from `@seedhape/shared`. When adding new data shapes, define them there first.

## Auth

Clerk handles auth across all three surfaces (web, mobile, API). The API validates Clerk JWT sessions on protected routes. API keys (for merchant SDK integrations) are separate — generated and stored in the `api_keys` table, validated in API middleware.

## Database

PostgreSQL 16 via Drizzle ORM. Schema files in `apps/api/src/db/schema/`. Tables: `merchants`, `orders`, `transactions`, `disputes`, `webhooks`, `api_keys`, `device_tokens`. Always use `pnpm db:generate` after schema changes, then `pnpm db:migrate`.
