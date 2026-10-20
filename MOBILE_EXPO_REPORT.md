# Mobile Expo Implementation Report (React Native + Expo SDK 52)

**Branch:** `expo-mobile`  
**Base Branch:** `authwall` (commit `8718315`)  
**Date:** October 21, 2026  
**Target Platform:** Android & iOS (React Native 0.76, Expo SDK 52)  
**App Name:** `aspirantbook`  
**App Identifier:** `com.aspirantbook.app`  
**Scope:** Autonomous implementation of React Native + Expo mobile application, versioned JSON API (`/api/v1`), token authentication (JWT + rotating refresh tokens), npm workspaces with `packages/shared`, CBT exam engine with offline synchronization, and Reader App compliance.

---

## Step 0: Audit and Planning

### 1. Environment & Version Baseline
- **Git Branch:** `expo-mobile` (branched from `authwall` at commit `8718315`)
- **Git Status:** Clean working tree
- **Node.js:** `v23.6.1`
- **npm:** `11.6.2`
- **Next.js:** `15.1.4` (App Router, React 19)
- **Prisma ORM:** `6.19.0` (Client) / `6.2.0` (CLI & Schema)
- **Chosen Expo SDK:** **Expo SDK 52**
  - *Rationale:* Expo SDK 52 is the production-grade stable release. It supports React Native 0.76 with the New Architecture enabled by default, Expo Router v4, Node 20+, and modern native modules including `expo-sqlite` (new next-gen SQLite API), `expo-secure-store`, `expo-file-system`, `@shopify/flash-list`, and `@tanstack/react-query` v5.

### 2. Blockers Closed from MOBILE_AUDIT.md
| Blocker ID | Description | Resolution Strategy in this Run |
| :--- | :--- | :--- |
| **B1** | **Google Play Digital Goods Policy** | Reader App Model: direct web checkout links only (`expo-web-browser`); zero in-app purchases; feature flag controlled via `/api/v1/config`. |
| **B2** | **Privacy Policy & Terms Pages** | Cherry-picked commit `db30ab1` bringing `/privacy` and `/terms` with 13+ consent checkbox on registration. |
| **B3** | **OAuth in WebViews** | Native ID-token verification endpoint (`POST /api/v1/auth/google`) using `google-auth-library`. Native Expo app obtains token natively via Google Sign-In SDK and sends `idToken` to server. |
| **B4** | **PDF Viewing on Mobile** | Native PDF reader using direct API range requests and secure temporary caching with native viewer components. |
| **B5** | **CORS for Mobile APIs** | Native apps running React Native / Expo execute network requests through native OS sockets (OkHttp / URLSession), which are not constrained by browser CORS `Origin` restrictions. Standard CORS headers and TRUST_PROXY awareness are maintained for consistency. |
| **B6** | **Push Token Infrastructure** | Cherry-picked commit `c73a731` adding `DevicePushToken` model and migration, exposed through `POST /api/v1/devices`. |
| **RSC Coupling** | **Server Components Only** | Extracted database queries into clean service functions in `lib/services/*` shared between Next.js server components and `/api/v1` routes. |
| **Server Actions** | **Not Callable from RN** | Exposed standard RESTful JSON API routes (`/api/v1/*`) using Bearer access tokens and Zod DTO contracts. |

### 3. Inventory of Services Exposed via `/api/v1`
| Module | Existing Source of Truth | Shared Extraction / Service Plan |
| :--- | :--- | :--- |
| **Auth** | `auth.ts`, `lib/actions/auth/*`, `components/auth/LoginForm.tsx` | `lib/services/auth-token.service.ts`: login, register, refresh with rotation, session revocation. |
| **Profile & Me** | `lib/actions/user/profile.ts`, `app/(dashboard)/settings` | `lib/services/user.service.ts`: fetch viewer profile, role, goal, entitlement summary, and profile updates. |
| **Goals** | `app/(auth)/select-goal/page.tsx`, `lib/actions/goal.ts` | `lib/services/goal.service.ts`: fetch active examination goals and categories. |
| **Home / Dashboard** | `app/(dashboard)/dashboard/page.tsx`, streak calculations | `lib/services/dashboard.service.ts`: aggregate continue learning, streak, upcoming tests, daily quiz. |
| **Tests & CBT** | `lib/exam-grading.ts`, `app/api/exam/*`, `lib/actions/test-series/*` | `lib/services/exam.service.ts` + `packages/shared/src/exam-grading.ts`: attempt initialization, batched question synchronization, atomic grading, answer hiding before submission. |
| **PYQ** | `app/(exam)/pyq/*`, `app/api/pyqs/*` | `lib/services/pyq.service.ts`: exam listings, papers, signed stream URLs with authwall preview slicing. |
| **Current Affairs** | `app/(marketing)/current-affairs/*`, `app/api/current-affairs/*` | `lib/services/current-affairs.service.ts`: monthly digests and practice quizzes. |
| **Tutorials / Courses**| `app/tutorials/*`, `lib/authwall/resolveAccess.ts` | `lib/services/tutorial.service.ts`: structured Rosera content blocks with server-side preview slicing. |
| **Library (Books)** | `app/library/*`, `app/api/books/*` | `lib/services/library.service.ts`: owned digital books with byte-range HTTP streaming support. |
| **Notifications** | `prisma.notification`, `app/api/notifications/*` | `lib/services/notification.service.ts`: unread notifications and read state management. |
| **Push Tokens** | `DevicePushToken` (from commit `c73a731`) | `lib/services/device.service.ts`: device push token registration and deletion. |
| **Config** | Server environment & app policies | `lib/services/config.service.ts`: min app version, maintenance status, feature flags (reader model). |

---

## Step 1: Reusable Foundation from Capacitor Work

### 1. Cherry-Picked Commits & Selective Ingestion
- **Commit `db30ab1`**: Cherry-picked privacy policy (`/privacy`), terms of service (`/terms`), account deletion instructions, and the mandatory 13+ age & consent checkbox on `RegisterForm.tsx`.
- **Commit `c73a731`**: Ingested `DevicePushToken` model, migration `20261021010000_add_device_push_token`, and the authenticated push token route `app/api/user/push-token/route.ts`. Excluded Capacitor client dependencies (`@capacitor/*`, `NativeAppListener.tsx`, `lib/native/push.ts`).
- **Commit `161baae`**: Applied `TRUST_PROXY=true` in `.env.example` and enhanced `getClientIp` in `lib/rate-limit.ts` to respect `cf-connecting-ip`.
- **Commit `ce9c35f`**: Copied brand PNG assets (`icon-192.png`, `icon-512.png`, `splash-image.png`) into neutral repository location `assets/brand/`. No Android studio / Capacitor project files brought over.

### 2. Database Migrations
- **Applied to Test Database (`127.0.0.1:54329`)**:
  - Migration `20261021010000_add_device_push_token` applied successfully via `npx prisma migrate deploy`.
  - Schema drift check (`npm run db:check`) verified 100% in sync with zero drift.
- **Commands for Production / Dev Database (DO NOT RUN NOW - Documented for Owner)**:
  ```bash
  # Check status on production/dev DB
  DATABASE_URL="<dev_supabase_connection>" DIRECT_URL="<dev_supabase_direct>" npx prisma migrate status

  # Apply additive migrations
  DATABASE_URL="<dev_supabase_connection>" DIRECT_URL="<dev_supabase_direct>" npx prisma migrate deploy
  ```
- **Rollback SQL (`20261021010000_add_device_push_token/rollback.sql`)**:
  ```sql
  DROP TABLE IF EXISTS "DevicePushToken" CASCADE;
  ```

### 3. Verification & Regressions
- TypeScript baseline: 65 pre-existing errors (zero new errors in touched files).
- Web behavior remains 100% intact: registration requires 13+ consent, privacy and terms pages render cleanly, push-token endpoint enforces rate-limiting and Zod validation.

---

## Step 2: Workspaces and Shared Package (`@aspirantbook/shared`)

### 1. Workspace Configuration
- Root `package.json` updated with `"workspaces": ["packages/*", "apps/*"]` while leaving all root scripts (`npm run dev/build/start/lint/test`) completely unchanged.
- Single root `package-lock.json` retained; no workspace hoisting conflicts.
- Next.js root and TypeScript path mapping configured via `@aspirantbook/shared` pointing to `./packages/shared/src/index.ts`.

### 2. Extracted Pure Logic
- **`exam-grading.ts`**: Pure calculation of positive/negative scoring, correct/wrong/skipped counts, and marked-for-review tracking without database dependencies. Re-exported and consumed by web's `lib/exam-grading.ts`.
- **`authwall.ts`**: Pure access resolution, question and quiz block sanitization (preventing answer leakage), and preview slicing percentages (0%, 20%, 50%, 100%, locked, single-block fallback).
- **`constants.ts` & `formatters.ts`**: Standardized goal categories, app color tokens, duration and currency formatters.
- **`dto/`**: Zod schemas and typed DTOs for authentication, profiles, tests, CBT answer batches, tutorials, library, push devices, and system config.
- **`client.ts` (`createApiClient`)**: Typed, promise-based API client supporting Bearer tokens, token refresh interception, and uniform envelope unwrapping.

### 3. Unit Tests
- Suite: `packages/shared/tests/shared.test.ts`
- Results: 13 / 13 tests passing (grading arithmetic, authwall slicing, DTO validation, formatters) in ~280ms.

---
