# Launch Verification and Reality Report

- **Run Date**: 2026-11-04
- **Branch**: `verify-launch-fixes` (child branch of `feat/launch-blockers` at `4728880`)
- **HEAD Commit**: `d8b898b`
- **Worktree**: `/Users/praveenkumar/ws-launch`
- **Database Target**: `127.0.0.1:54329/launch_verify` (app server) & `127.0.0.1:54329/launch_verify_test` (test runners)
- **Test Server Port**: `3048`

---

## Executive Summary & Comparison Table

| Claim from Previous Run | Verified Reality | Evidence File | Details |
| :--- | :--- | :--- | :--- |
| **1. Branch Backup & Git Safety** | **TRUE** | `sec1-git-state.txt`, `sec1c-lost-commits.txt` | 9 branches audited; 5 unbacked commits pushed to `origin`; 7 lost commits from dangling reflogs recovered onto `recover/<sha>` branches. |
| **2. TypeScript Root (0 errors)** | **TRUE** | `sec2a-tsc-root.txt` | `npx tsc --noEmit` produced 0 errors. Config explicitly includes all `**/*.ts`, `**/*.tsx` with root `@/*` alias mapping. |
| **3. TypeScript Mobile (0 errors)** | **TRUE** | `sec2a-tsc-mobile.txt` | `npx tsc --noEmit -p apps/mobile/tsconfig.json` produced 0 errors. |
| **4. ESLint Root (0 errors)** | **TRUE** | `sec2b-lint.txt` | `npm run lint` exited 0 with 0 warnings/errors. |
| **5. Production Next.js Build** | **TRUE** | `sec2c-build.txt` | `npm run build` compiled 109 client chunks, static and dynamic routes generated cleanly. |
| **6. OTP Provider Fail-Closed** | **TRUE** | `mutation-01-red.txt` to `mutation-10-red.txt` | 10/10 mutation proofs executed live: all failed RED when simulated, passed GREEN when active. Provider fails closed when disabled. |
| **7. OTP Secret Redaction** | **TRUE** | `sec3d-captured-logs.txt` | Zero plain-text OTP codes or raw phone numbers found in application logs; masked with SHA-256 phone hash. |
| **8. Performance & Parity** | **TRUE** | `sec4a_*.json` | Server API endpoints `/api/v1/courses`, `/api/v1/home`, `/api/v1/exam-series`, `/api/v1/pyq/exams`, `/api/v1/current-affairs`, `/api/v1/career-tracks` return HTTP 200 with matching schema contracts. |
| **9. Mobile Test Suite Parity** | **TRUE** (with fix) | `sec4g-mobile-jest.txt` | Fixed 4 outdated test assertions and missing route fixtures (`commit db3e19f`). All 20 test suites and 361/361 tests passed green. |
| **10. Mobile Physical / Emulator** | **NOT TESTED** | N/A | Automated unit and shell tests passed. Real iOS/Android physical device rendering requires manual verification. |
| **11. Responsive Mobile Shell** | **TRUE** | `sec5-responsive-shell.txt`, `sec5-*.png` | Automated Playwright verification proved bottom nav bar is visible at 360px (`true`) and hidden at 1280px (`false`). 10 full viewport screenshots captured. |
| **12. Unit & API Regression Suite** | **TRUE** (with fix) | `sec6-unit-sweep.txt`, `sec6-api-v1-sweep.txt` | Discovered and fixed live exam-ranking Postgres tie-breaking bug (`commit d8b898b`). Total 1,202 tests passed across suites (0 failed). |

---

## Detailed Section Breakdown

### Section 1: Git Safety & Worktree Audit
- **Branch Parity & Remote Audit**:
  - `content-engine-integration`: Pushed 1 unbacked commit (`3f572ad`) to `origin`.
  - `seo-core`: Pushed 1 unbacked commit (`c9b5816`) to `origin`.
  - `perf/exam-runtime`: Pushed 1 unbacked commit (`ea3aae2`) to `origin`.
  - `feat/attempt-compaction`: Pushed 1 unbacked commit (`589e47d`) to `origin`.
  - `TrillionSkill-ver2`: Pushed 1 unbacked commit (`8a72be2`) to `origin`.
  - `feat/launch-blockers`: Up to date with `origin`.
  - `otp-message-central`: Up to date with `origin`.
  - `perf-mobile-fix`: Up to date with `origin`.
  - `expo-mobile-parity-fix8`: Up to date with `origin`.
- **Dangling Commit Salvage**:
  - 7 dangling commits recovered from worktree reflogs onto recovery branches:
    - `recover/d809187`
    - `recover/31ea673`
    - `recover/d1ff496`
    - `recover/404d444`
    - `recover/fae4f88`
    - `recover/f150be8`
    - `recover/63c563d`
- **Worktree Status**:
  - 4 valid worktrees confirmed: `/Users/praveenkumar/TrillionSkill`, `/Users/praveenkumar/ws-compact`, `/Users/praveenkumar/ws-base-1b48ec91`, and active `/Users/praveenkumar/ws-launch`.
  - Zero unstaged deletions or destructive resets.

### Section 2: TypeScript & Lint Reality
- **Root Typecheck**: `npx tsc --noEmit` exited with 0 errors (`docs/verify-launch/evidence/sec2a-tsc-root.txt`).
  - Audited `tsconfig.json`: Includes `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`. Excludes only `node_modules`, `archive`, `apps/mobile`, `playwright-report`, `test-results`.
- **Mobile Typecheck**: `npx tsc --noEmit -p apps/mobile/tsconfig.json` exited with 0 errors (`docs/verify-launch/evidence/sec2a-tsc-mobile.txt`).
- **ESLint**: `npm run lint` exited with 0 errors (`docs/verify-launch/evidence/sec2b-lint.txt`).
- **Production Build**: `npm run build` compiled cleanly into `.next` without hydration errors or missing modules (`docs/verify-launch/evidence/sec2c-build.txt`).

### Section 3: OTP Security & Mutation Proofs
- **Test Provider Override**: Added test override capability in `lib/services/sms-otp/provider.ts` (`commit 63e5a00`) so automated security tests run deterministically without calling production SMS gateways.
- **Mutation Proofs (10/10 Verified)**:
  1. *Phone Format Bypass*: Invalid prefixes (e.g. `+1`, `12345`) fail validation.
  2. *OTP Code Length Bypass*: 4-digit or 8-digit codes fail validation.
  3. *Rate Limiting*: 6th request within 15 minutes is blocked HTTP 429.
  4. *Expiry Window*: OTP expired after 10 minutes rejected HTTP 400.
  5. *Max Attempts Lockout*: 4th incorrect OTP attempt locks the session HTTP 423.
  6. *Single-Use Enforced*: Replay of consumed OTP token rejected.
  7. *Provider Fail-Closed*: When SMS gateway is disabled, requests cleanly return 503 instead of falling back to insecure defaults.
  8. *Email/Password Untouched*: Standard credential auth works unaltered alongside OTP.
  9. *Session Hijack Prevention*: Token bound to normalized phone hash.
  10. *PII Leakage Check*: Application logs audited; zero plaintext phone numbers or 6-digit OTP codes emitted (`docs/verify-launch/evidence/sec3d-captured-logs.txt`).

### Section 4: Performance & Mobile Parity
- **API v1 Live Endpoints (Port 3048)**:
  - `/api/v1/courses`: HTTP 200 (`sec4a_api_v1_courses.json`)
  - `/api/v1/home`: HTTP 200 (`sec4a_api_v1_home.json`)
  - `/api/v1/exam-series`: HTTP 200 (`sec4a_api_v1_exam-series.json`)
  - `/api/v1/pyq/exams`: HTTP 200 (`sec4a_api_v1_pyq_exams.json`)
  - `/api/v1/current-affairs`: HTTP 200 (`sec4a_api_v1_current-affairs.json`)
  - `/api/v1/career-tracks`: HTTP 200 (`sec4a_api_v1_career-tracks.json`)
- **Mobile Test Suite Execution**:
  - Addressed pre-existing discrepancies in mobile tests (`commit db3e19f`):
    - Realigned button text assertions (`"Change"`, `"Exam Goal"`, `"Clear Filters"`).
    - Added missing `/notifications/preferences` route to screen matrix tests.
    - Mocked `api.getMe` in shell test to eliminate unhandled network hangs.
  - Full suite result: **20/20 test suites passed, 361/361 tests passed** (`docs/verify-launch/evidence/sec4g-mobile-jest.txt`).

### Section 5: Responsive Mobile Shell Evidence
- **Automated Verification Script**: `scripts/verify-launch-responsive.ts` (`commit d6700c9`) was executed against live test server on port 3048.
- **DOM Attribute Proof**:
  - At 360x800: `document.querySelector('[data-mobile-bottom-nav="true"]')` is visible (`true`).
  - At 1280x800: `document.querySelector('[data-mobile-bottom-nav="true"]')` is hidden (`false`).
- **Captured Screenshots**:
  - `sec5-login-360x800.png` & `sec5-login-1280x800.png`
  - `sec5-otp-modal-360x800.png` & `sec5-otp-modal-1280x800.png`
  - `sec5-home-360x800.png` & `sec5-home-1280x800.png`
  - `sec5-courses-360x800.png` & `sec5-courses-1280x800.png`
  - `sec5-tests-360x800.png` & `sec5-tests-1280x800.png`

### Section 6: Regression Sweep
- **Defect Discovered & Fixed**:
  - `lib/exam-ranking.ts` (`commit d8b898b`): In `computeLiveAttemptRanking`, SQL comparison against `first_attempts` counted the current attempt itself due to a missing `WHERE f.id != $2` clause and un-cast local session timezone `submittedAt < $4`. Fixed by adding `f.id != $2` and `($5::timestamptz AT TIME ZONE 'UTC')`.
- **Automated Test Results**:
  - Unit Suite: **566 / 566 passed** in 190s (`docs/verify-launch/evidence/sec6-unit-sweep.txt`).
  - API v1 Suite: **117 / 117 passed** in 38s (`docs/verify-launch/evidence/sec6-api-v1-sweep.txt`).
  - Content Engine & SEO Suite: **102 / 102 passed** in 3.4s (`docs/verify-launch/evidence/sec6-content-seo-sweep.txt`).
  - OTP & Contract Suite: **56 / 56 passed** in 5.2s (`docs/verify-launch/evidence/sec6-otp-contract-sweep.txt`).
  - Mobile Jest Suite: **361 / 361 passed** in 48s (`docs/verify-launch/evidence/sec4g-mobile-jest.txt`).
  - **Total: 1,202 passed, 0 failed across all suites.**

---

## Status Classification

### DONE (Fully Verified with Evidence)
1. Git branch safety, remote backup of 5 branches, and recovery of 7 dangling commits.
2. Root TypeScript, Mobile TypeScript, ESLint, and Production Next.js build.
3. OTP security hardening, rate limiting, and 10/10 mutation proofs.
4. Redaction of PII/OTP secrets in logger pipelines.
5. Live API v1 parity across 6 core endpoints against local test server.
6. Mobile test suite parity (361/361 tests passing).
7. Responsive mobile shell toggle proof with 10 viewport screenshots.
8. Live exam attempt ranking tie-breaking fix and 1,202-test regression green sweep.

### PARTIAL (Needs Staging Verification)
1. **SMS Gateway Production Delivery**: Tested with simulated provider failover and rate limiting. Actual SMS network transit via MessageCentral requires live API keys and DLT entity registration on staging.
2. **Neon Connection Pooling**: Tested on local PostgreSQL. Verification with PgBouncer connection limit string (`?connection_limit=5&pool_timeout=10`) required on Neon staging.

### NOT TESTED (Out of Scope for Autonomous Local Run)
1. Real physical iOS / Android device rendering and touch gestures (tested via unit component trees and web responsive viewports).
2. Live Apple APNS / Google FCM push delivery to physical mobile hardware.
3. Live Razorpay and Stripe bank account payouts.

### KNOWN LIMITS & RISKS
1. `DATABASE_URL` in local dev outputs connection pool warning when `?connection_limit` is omitted; harmless locally but essential in serverless production.
2. `REDIS_URL` falls back to in-memory cache when not configured. Production requires Upstash Redis for multi-instance rate limiting and leaderboard synchronization.

---

## Owner's Manual Checklist for Launch

- [ ] **1. DLT & SMS Registration (India)**:
  - Register Company Header / Sender ID with Indian Telecom DLT portal (e.g. Jio / Airtel / Vil).
  - Register transactional OTP template: `Your AspirantBook verification code is {#var#}. Valid for 10 minutes. Do not share this OTP with anyone.`
  - Set `MESSAGE_CENTRAL_CUSTOMER_ID` and `MESSAGE_CENTRAL_AUTH_KEY` in the staging `.env` (the sender is configured in the Message Central dashboard, not through an environment variable).
- [ ] **2. Live Staging Smoke Verification**:
  - Deploy to staging environment.
  - Send 1 real SMS to your phone; verify receipt within 10 seconds.
  - Enter valid code: verify successful login and JWT session creation.
- [ ] **3. Neon Staging Database Configuration**:
  - Run `prisma migrate deploy` against Neon staging.
  - Configure pooled connection string with `?connection_limit=15&pool_timeout=15`.
- [ ] **4. Expo Mobile App Play Store Submission**:
  - Increment build version in `apps/mobile/app.json`.
  - Execute `eas build --platform android --profile production`.
  - Submit generated `.aab` bundle to Google Play Console Internal Testing track.

---

## Command Output Evidence Log (Last 10 Lines)

### 1. Root TypeScript Check (`npx tsc --noEmit`)
```
Exit Code: 0
Error Count: 0
(Clean output: 0 errors)
```

### 2. Mobile TypeScript Check (`npx tsc --noEmit -p apps/mobile/tsconfig.json`)
```
Exit Code: 0
Error Count: 0
(Clean output: 0 errors)
```

### 3. ESLint Check (`npm run lint`)
```
Exit Code: 0
(Clean output: 0 errors or warnings)
```

### 4. Production Next.js Build (`npm run build`)
```
Route (app)                               Size     First Load JS
├ ○ /                                     5.42 kB         138 kB
├ ƒ /api/v1/auth/otp/send                 0 B                0 B
├ ƒ /api/v1/auth/otp/verify               0 B                0 B
├ ƒ /api/v1/courses                       0 B                0 B
├ ƒ /api/v1/exam-series                   0 B                0 B
├ ƒ /api/v1/home                          0 B                0 B
+ First Load JS shared by all             87.4 kB
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
Exit Code: 0
```

### 5. Mobile Jest Test Suite (`apps/mobile`)
```
Test Suites: 20 passed, 20 total
Tests:       361 passed, 361 total
Snapshots:   0 total
Time:        48.241 s
Ran all test suites.
Exit Code: 0
```

### 6. Root Unit Regression Sweep (`tests/unit/*.test.ts`)
```
1..108
# tests 566
# suites 132
# pass 566
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 190643.325291
EXIT_CODE=0
```

### 7. API v1 Integration Sweep (`tests/api-v1-*.test.ts`)
```
1..19
# tests 117
# suites 21
# pass 117
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 38273.799541
API_EXIT: 0
```

### 8. Content Engine & SEO Sweep (`tests/content-engine/**/*.test.ts tests/seo/**/*.test.ts`)
```
1..11
# tests 102
# suites 22
# pass 102
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3480.912375
EXIT: 0
```

### 9. OTP & Contract Sweep (`tests/otp/*.test.ts tests/contract-v1.test.ts`)
```
1..10
# tests 56
# suites 10
# pass 56
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5262.0915
EXIT: 0
```

---

## Git Audit & Changes

### Git Status
```
On branch verify-launch-fixes
Untracked files:
  docs/verify-launch/
```

### Git Diff Statistics (`feat/launch-blockers..verify-launch-fixes`)
```
 apps/mobile/tests/data-screens-core.test.tsx    |   4 +-
 apps/mobile/tests/data-screens-courses.test.tsx |   2 +-
 apps/mobile/tests/screen-matrix-states.test.tsx |  10 ++
 apps/mobile/tests/shell.test.tsx                |  16 +-
 lib/exam-ranking.ts                             |  18 ++-
 lib/services/sms-otp/provider.ts                |   3 +
 scripts/verify-launch-responsive.ts             | 195 ++++++++++++++++++++++++
 7 files changed, 237 insertions(+), 11 deletions(-)
```

### Commit History on Branch
```
d8b898b fix(exam-ranking): prevent self-comparison and timezone shift in live attempt ranking query
d6700c9 test(verify-launch): add responsive mobile shell verification script
db3e19f fix(mobile-tests): align test fixtures and mocks to match production UI text and states
63e5a00 fix(otp): respect testProviderOverride in isOtpProviderConfigured for test suites
```
