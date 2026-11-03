# Real mobile OTP login (Message Central Verify Now) — Report

Worktree: `/Users/praveenkumar/TS-otp`
Branch: `otp-message-central` (base `feat/launch-blockers`)
Run date: 2026-11-03
Test server: `http://127.0.0.1:3047` only
Test database: Docker Postgres `127.0.0.1:54329`, database `otp_test` only

Every raw log quoted below is stored under `docs/otp/evidence/`.

---

## 1. The bug this replaces

On the base branch, "mobile OTP login" was not OTP at all:

- `auth.ts` (mobile Credentials provider) accepted a bare `phoneNumber`. Any caller
  who knew a phone number could sign in as that user. This was the critical finding.
- `app/api/auth/mobile-login/route.ts` read `{ phoneNumber, courseId, otp }` and never
  checked `otp`. It created/found the user and returned success for any 10-digit number.
- `components/auth/MobileAuthContext.tsx` contained the comment
  "Auto-verify without clicking: Accepts ANY 6-digit number as valid OTP", and
  `MobileAuthModal.tsx` told the user "Any 6 digits are accepted for instant student access."

There was no SMS provider call anywhere in the path, and `SMS_API_KEY` was only used to
decide whether the fake flow was enabled.

## 2. What it does now

Real provider (Message Central Verify Now V3) behind an adapter, plus server-side proof
so that a phone number alone can never create a session.

### Web (NextAuth Credentials `mobile`)

1. `POST /api/auth/mobile-login { phoneNumber }` → sends a real OTP through the provider,
   returns `{ success, step: "otp", verificationId, expiresIn, resendAfter, devBypass }`.
   This step never reads the `User` table, so it cannot reveal whether an account exists.
2. `POST /api/auth/mobile-login { phoneNumber, code, verificationId }` → verifies with the
   provider, then finds/creates the user, auto-enrolls free courses, and returns a
   server-signed proof.
3. `signIn("mobile", { phoneNumber, proof })` → `authorizeMobileCredentials()` requires a
   valid, unexpired, single-use, phone-bound proof. A bare phone number or a forged proof
   returns `null`.

### Mobile app (`apps/mobile`)

- `POST /api/v1/auth/otp/request` returns the provider `verificationId` (additive field).
- `POST /api/v1/auth/otp/verify` requires `verificationId` (`OtpVerifySchema`) and returns
  the unchanged `{ tokens, user }` shape.
- The login screen keeps its existing design; it now shows the resend countdown and uses
  `oneTimeCode` autofill. The false "any 6 digits" copy is gone.

### Security controls added

| Control | Where | Detail |
|---|---|---|
| Proof required to sign in | `auth.ts`, `lib/services/sms-otp/proof.ts` | HMAC-SHA256 (`AUTH_SECRET`, fallback `NEXTAUTH_SECRET`); production hard-fails if neither is set |
| Proof is single-use | `proof.ts` + `ReauthTokenUse` | `otp-proof:<jti>` consumed atomically in Postgres |
| Proof is phone-bound | `proof.ts` | payload carries the E.164 number; mismatch rejected |
| Proof expires | `proof.ts` | 2-minute TTL |
| OTP is bound to the requesting phone | `service.ts` | `otp-bind:sha256(verificationId + ":" + e164)` with TTL, no raw phone stored |
| Verified id cannot be reused | `service.ts` | `otp-used:sha256(verificationId)` |
| Our own rate limits | `service.ts` | 3 sends/10 min/phone, 10 sends/hour/IP, 30 s cooldown, 5 verify attempts/10 min/id — all fail-closed |
| Dev bypass cannot exist in production | `provider.ts`, `config.service.ts`, route | requires `NODE_ENV !== "production"` **and** the existing `isDevBypassAllowed()` policy |
| Boot guard | `lib/boot-guard.ts` | half-configured Message Central credentials refuse to boot in production |
| No PII/OTP in logs | `service.ts` | logs use `maskPhone()` only |

Provider swap point: implement `OtpProvider` (`lib/services/sms-otp/types.ts`) and change the
single factory in `lib/services/sms-otp/provider.ts`. Routes, service, and both clients are
provider-agnostic.

## 3. Files

### New

- `lib/services/sms-otp/types.ts` — provider interface, error type
- `lib/services/sms-otp/phone.ts` — Indian mobile normalisation + masking
- `lib/services/sms-otp/message-central.adapter.ts` — real provider (token, send, validate)
- `lib/services/sms-otp/dev.adapter.ts` — explicit dev-only adapter
- `lib/services/sms-otp/provider.ts` — provider factory + production bypass guard
- `lib/services/sms-otp/service.ts` — orchestration, limits, binding, replay block
- `lib/services/sms-otp/proof.ts` — signed single-use proof
- `tests/otp/{mock-provider,otp-core.test,otp-routes.test,otp-security.test,playwright.otp.config}.ts`
- `tests/e2e/otp-mobile-login.spec.ts` — one Playwright check for the changed web page
- `docs/otp/{REPORT,DECISIONS}.md`, `docs/otp/evidence/**`

### Modified

| File | Change |
|---|---|
| `auth.ts` | mobile provider now calls `authorizeMobileCredentials()`; proof required |
| `app/api/auth/mobile-login/route.ts` | two-step send/verify, proof issuance, status mapping, account-existence parity |
| `app/api/v1/auth/otp/request/route.ts` | real provider send, returns `verificationId`/`expiresIn`/`resendAfter` |
| `app/api/v1/auth/otp/verify/route.ts` | requires `verificationId`, real verification |
| `components/auth/MobileAuthContext.tsx` | real two-step flow, real error/success states, stale comment fixed |
| `components/auth/MobileAuthModal.tsx` | removed the false "any 6 digits" line; states only |
| `apps/mobile/src/app/(auth)/login.tsx` | carries `verificationId`, resend countdown, `oneTimeCode` autofill |
| `apps/mobile/tests/auth-otp.mounted.test.tsx` | +2 tests (`missing-verification-id`, verify body carries `verificationId`) |
| `packages/shared/src/client.ts`, `dto/auth.dto.ts` | `verificationId` in request/verify types |
| `lib/services/config.service.ts` | `otpAuthEnabled` follows real provider credentials |
| `lib/boot-guard.ts` | Message Central completeness guard |
| `.env.example` | names only, no values |
| `tests/api-v1-sec1.test.ts` | legacy expectations updated to the real-OTP contract |

No Prisma schema change. No new npm dependency. No layout or style change.
The only copy change is the removal of the false "Any 6 digits are accepted…" promise.

## 4. Configuration (names only)

```
MESSAGE_CENTRAL_CUSTOMER_ID
MESSAGE_CENTRAL_AUTH_KEY
MESSAGE_CENTRAL_BASE_URL   # optional, defaults to https://cpaas.messagecentral.com
```

Existing `ALLOW_DEV_MOBILE_LOGIN` keeps its current dev-only meaning. Leave both Message
Central values empty and OTP stays disabled (`otpAuthEnabled=false`, routes return 501/503).

## 5. Verification evidence

### 5.1 Red → green history (real provider mocked at the adapter boundary)

| Run | Evidence file | Result |
|---|---|---|
| First OTP suite run (before fixes) | `evidence/otp-tests-first.txt` | 37 tests, 32 pass, **5 fail** |
| Second run | `evidence/otp-tests-second.txt` | 37 tests, 33 pass, **4 fail** |
| Third run | `evidence/otp-tests-third.txt` | 36 tests, **36 pass** |
| Legacy security suite, before expectations were updated | `evidence/regression-unit.txt` | 14 tests, 10 pass, **4 fail** (SEC1.2, SEC1.3, SEC1.6, boot-guard wiring) |
| Final combined run (OTP + legacy security + boot guard) | `evidence/otp-and-regression-final.txt` | **51 tests, 51 pass, 0 fail** |

Final run raw summary:

```
# tests 51
# pass 51
# fail 0
```

Command:

```
U="postgresql://postgres:testpassword123@127.0.0.1:54329/otp_test"
DATABASE_URL="$U" DIRECT_URL="$U" TEST_DATABASE_URL="$U" APP_ENV=test NODE_ENV=test \
AUTH_SECRET="otp_test_secret" npx tsx --test --test-concurrency=1 \
tests/otp/*.test.ts tests/api-v1-sec1.test.ts tests/unit/boot-guard-wiring.test.ts
```

### 5.2 Web page check (Playwright, mobile viewport, port 3047)

`evidence/playwright-otp-after.txt`:

```
✓  1 [mobile] › tests/e2e/otp-mobile-login.spec.ts:19:5 › web mobile OTP modal requests a code, then verifies with the returned verificationId (8.1s)
1 passed (46.5s)
```

It proves, on the real page: the modal opens, step 1 sends only `{ phoneNumber }`,
step 2 sends `{ phoneNumber, code, verificationId }`, the OTP step renders 6 inputs, no
error banner appears, and the removed "Any 6 digits" copy is absent.

Command: `npx playwright test --config tests/otp/playwright.otp.config.ts`
(that config pins port 3047, `otp_test`, and `webServer.cwd` to the repo root).

### 5.3 Mobile app tests (Jest, mounted component)

`evidence/mobile-jest-auth-after.txt`:

```
Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
```

### 5.4 Type check, lint, build

| Gate | Baseline | Final | Evidence |
|---|---|---|---|
| `npx tsc --noEmit` | 0 errors (`evidence/tsc-before.txt`) | 0 errors, exit 0 (`evidence/tsc-final.txt`) | no new errors |
| `npm run lint` | exit 0, 2 warnings (`evidence/lint-before.txt`) | exit 0, same 2 warnings (`evidence/lint-final.txt`) | no new findings |
| `next build` | — | exit 0 (`evidence/build-after.txt`) | production-shaped env only |

The two lint warnings are pre-existing `<img>` warnings in
`components/books/EBookReaderModal.tsx:231` and `components/editor/RoseraRenderer.tsx:1824`.
`lint-final.txt` is byte-identical to the after-fix baseline apart from the Next.js
workspace-root banner.

`next build` was run with a production-shaped remote DB URL (`sslmode=require&pgbouncer=true`,
`PERSIST_BACKEND=db`) because the boot guard correctly refuses production + local test DB.
No application source changed after that build; only test files and docs changed afterwards.

### 5.5 Mutation checks (10 deliberate breaks, each reverted)

Each mutation was applied to the real source, the targeted suite was run, the raw output was
captured, and the file was restored byte-for-byte (the harness asserts this). All ten were
detected.

| # | Mutation | Expected failing test | Verdict |
|---|---|---|---|
| 01 | Web sign-in accepts a phone number without a proof | "an existing phone cannot sign in with no proof or with a forged proof" (+ cross-phone test) | RED |
| 02 | OTP proof can be replayed | "proof is valid once, bound to the phone, and single-use" | RED |
| 03 | Expired OTP proof accepted | "expired proof is rejected" | RED |
| 04 | Per-phone send limit removed | "per-phone send limit (3 / 10 min) triggers" | RED |
| 05 | Per-IP send limit removed | "per-IP send limit triggers across different phones" | RED |
| 06 | Resend cooldown removed | "resend cooldown blocks an immediate second send" | RED |
| 07 | `verificationId` not bound to the requesting phone | "verification id is bound to the phone that requested it" | RED |
| 08 | Verified `verificationId` can be reused | "correct code succeeds and is single-use" | RED |
| 09 | Verify attempt limit removed | "max verify attempts per verification id triggers" | RED |
| 10 | Dev OTP bypass allowed in production | "isOtpDevBypassAllowed is false in production even with the dev flag and APP_ENV=test" | RED |

Full raw outputs: `docs/otp/evidence/mutations/01…10-*.txt`, summary in
`docs/otp/evidence/mutations/summary.txt`.

Mutation 01 also failed the existing cross-phone test, which is expected: without the proof
check, a proof minted for phone A signs in phone B.

Note: mutation 01 originally would have passed for the wrong reason (the test phone had no
user, so `null` came from the missing account, not from the proof check). A regression test
with an existing account plus a genuine-proof sanity assertion was added before the mutation
run, and it is included in the 51-test final run.

## 6. NOT TESTED (no credentials and no real phone in this environment)

Everything below is implemented but was never executed against the live provider. The
provider is mocked at the adapter boundary in every test.

- `GET /auth/v1/authentication/token` — real token issuance, token lifetime/refresh.
- `POST /verification/v3/send` — a real SMS actually arriving on a handset.
- `GET /verification/v3/validateOtp` — real success/failure responses.
- Provider error-code mapping (`702`, `705`, `703`, `505`, `800`, `501`, `511`) against real
  responses; the mapping is unit-tested only with synthetic errors.
- The `timeout` field returned by `send` (used as the binding TTL, clamped 60–600 s).
- Latency, retries, and provider downtime behaviour in production.
- Whether the Message Central account is enabled for a no-DLT OTP flow for our sender.

## 7. Manual steps for the owner

1. Create a Message Central account and enable **Verify Now (V3)**.
2. In the provider console, copy the **Customer ID** and the **Auth Key** (base64-encrypted
   password). Set them as `MESSAGE_CENTRAL_CUSTOMER_ID` and `MESSAGE_CENTRAL_AUTH_KEY` in the
   hosting environment (and `MESSAGE_CENTRAL_BASE_URL` only if the provider gives a different
   base URL). Do not commit them.
3. Confirm with Message Central support that **no DLT / sender-ID registration** is required
   for OTP on this account and that OTP delivery to Indian numbers is enabled. If DLT is
   required, the flow must be registered before launch.
4. Run one real-phone test on a **staging** deployment (not production): request a code,
   confirm the SMS arrives, confirm the code signs in, confirm a second use of the same code
   is rejected, and confirm a wrong code shows the error state on web and mobile.
5. Set a **billing / spend alert** on the Message Central account and confirm the per-OTP
   price. Our own limits (3/10 min/phone, 10/hour/IP) reduce abuse but do not cap spend.
6. Verify `AUTH_SECRET` (or `NEXTAUTH_SECRET`) is set in production — OTP proofs hard-fail
   without it.
7. Decide whether `ALLOW_DEV_MOBILE_LOGIN` stays `false` in production. It is ignored there
   regardless, but keep it off.

## 8. Known limitations / follow-ups

- Rate limits are per single server instance only insofar as `lib/rate-limit.ts` is
  Postgres-backed; they are shared across instances because they use the database.
- `verifyOtp` does not apply an additional per-IP limit; abuse is limited per verification id
  and per send. This matches the design decision recorded in `DECISIONS.md`.
- The proof TTL (2 min) is independent of the provider OTP expiry; if the provider's timeout
  is longer than 2 minutes the user must still sign in within 2 minutes of verification.
- Real provider behaviour, DLT status and spend are **unverified** (section 6).

## 9. Reproduce

```bash
# test DB (already running): Docker Postgres on 127.0.0.1:54329, database otp_test
U="postgresql://postgres:testpassword123@127.0.0.1:54329/otp_test"
DATABASE_URL="$U" DIRECT_URL="$U" TEST_DATABASE_URL="$U" APP_ENV=test NODE_ENV=test \
AUTH_SECRET="otp_test_secret" npx tsx --test --test-concurrency=1 \
tests/otp/*.test.ts tests/api-v1-sec1.test.ts tests/unit/boot-guard-wiring.test.ts

npx playwright test --config tests/otp/playwright.otp.config.ts

cd apps/mobile && npm run test:ui -- tests/auth.test.tsx tests/auth-otp.mounted.test.tsx

npx tsc --noEmit
npm run lint
```

Test-harness note: `scripts/guard-test-db.ts: assertNoEnvLocal` refuses to run while
`.env.local` exists in the worktree, so `.env.local` was moved to
`/private/var/folders/36/yhmqht45575cn6b001lf6m1h0000gn/T/opencode/ts-otp-env-local.bak`
during test runs and restored afterwards. No values were printed or committed.

## 10. Environment stop condition

Free disk on `/System/Volumes/Data` was **1.1–1.3 GB** during this phase (below the 10 GB
floor), so no further build/`next start` verification was attempted beyond the recorded runs.
The build and Playwright evidence above were captured before the floor was reached.
