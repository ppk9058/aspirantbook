# Production-Readiness Phase Status Audit (Phases 0 to 10)

**Date:** 2026-11-01  
**Worktree:** `/Users/praveenkumar/ws-launch`  
**Branch:** `feat/launch-blockers`  
**Auditor Role:** Read-Only Production-Readiness Auditor  

---

## 1. Baseline Inventory

- **Current HEAD SHA:** `1995d8ce796baad0f22bf9dd162a0b0344111e02`
- **Current HEAD Subject:** `R13: Mark dependency remediation complete`
- **Working Tree Status (`git status --short`):**
  - Untracked: `?? data/form-submissions.json` (runtime local form data)
  - Tracked modifications: 0 (working tree clean)
- **Commits Since Release / Checkpoint Tags:**
  - `r7e-green-2026-10-31`: 73 commits
  - `r9-ready-2026-10-31`: 63 commits
  - `r10-ready-2026-10-31`: 56 commits
  - `r11-ready-2026-11-01`: 53 commits
- **Tag `r12-ready-*` Check:**
  - `r12-ready-*` tag does **NOT** exist (only `r12-partial-2026-11-01` exists).
- **Documentation Inventory:**
  - `docs/evidence/*.md`: 19 files (`PROGRESS.md`, `b1-google-oauth.md`, `b2-dependency-security.md`, `b3-no-local-disk-writes.md`, `b4-trust-proxy.md`, `claims-register.md`, `cors-decision.md`, `deletion-procedure.md`, `email-transport.md`, `launch-owner-todo.md`, `live-unverified.md`, `push-ready-checklist.md`, `r10-audit.md`, `r10-mobile-contracts.md`, `r10-secrets-hygiene.md`, `r12-audit.md`, `r12-mobile-test-proposals.md`, `r7d-ci-and-unit-suite.md`, `r8-fresh-clone-verification.md`)
  - `docs/runbooks/*.md`: 3 files (`render-cloudflare.md`, `rollback.md`, `staging-neon.md`)
  - `docs/play-store/*`: 1 file (`data-safety-draft.md`)
- **`docs/evidence/PROGRESS.md` Task Ledger:**
  - 90 task rows recorded across A, B, C, Z, G, R7, R9, R10, R11, R12, and R13 rounds.

---

## 2. Phase-by-Phase Audit Table (Phases 0 to 10)

| Phase | Description | Status | Concrete Evidence | What Remains | Responsible Party |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **0** | **Secure the Code** | **PARTIAL** | `.gitleaksignore` exists (3 lines, 0 rules > 12 chars); `.github/workflows/ci.yml` contains `gitleaks` job (v2.3.8, continue-on-error, redact enabled); `.github/dependabot.yml` defines groups, limit 3, and ignore rules for root, shared, mobile, and docker; 41 files in `scripts/` & `tests/e2e/` migrated to env vars. | Review 58 historical gitleaks findings; fix hardcoded `testpassword123` fixture in `backup-and-rollback.test.ts`. | Owner (key review/rotation) & Agent (fix test fixture) |
| **1** | **Launch Blockers in Code** | **DONE** | Consent checkbox default `false` in `RegisterForm.tsx` (button disabled until checked); server enforcement via `auth.ts` (`z.preprocess`) and API v1 `RegisterRequestSchema` (`z.literal(true)`); 0 occurrences of `[OWNER TO CONFIRM` in `app/` and `lib/`; centralized `brand.ts` present (legal entity, 6-digit PIN 110016, grievance officer, contact); `PERSIST_BACKEND=db` boot refusal guard in `boot-guard.ts`; single `isDevBypassAllowed` helper; `next: 15.5.28`, `next-auth: 5.0.0-beta.32` (exact pin), `zod: ^3.25.76`; `cors-decision.md` present; 122 variables in `.env.example` vs 117 distinct `process.env` in code (0 missing). | Owner to confirm postal PIN code (110016 vs 110022). | Owner |
| **2** | **Database** | **PARTIAL** | `prisma/schema.prisma` declares `url` and `directUrl`; 31 migrations present in `prisma/migrations` (clean migrate status, additive); `scripts/ops/` contains `migrate-deploy.sh`, `db-size-report.sql`, `staging-smoke.sh`, `db-backup-to-s3.sh`, `backup-restore-test.sh`; `lib/boot-guard.ts` validates remote DB, `sslmode=require`, `pgbouncer=true` for pooler, and `DIRECT_URL`. | Provision remote Neon staging/production databases and run `migrate-deploy.sh`. | Owner |
| **3** | **Container & Host** | **DONE** | `Dockerfile` runs non-root `USER nextjs`, includes `HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3`; `render.yaml` present (web service `trillionskill-web` with healthcheckPath `/api/health`, region singapore, cron `email-outbox-cron`); `docs/runbooks/render-cloudflare.md` present; `.dockerignore` excludes all `.env*` files with `!.env.example`. | Deploy Render blueprint and populate production secrets in dashboard. | Owner |
| **4** | **Edge** | **DONE** | `next.config.js` sets HSTS (`max-age=63072000; includeSubDomains; preload`), nosniff, SAMEORIGIN, Permissions-Policy; CSP allows `'self'`, Razorpay, Turnstile, YouTube; `supabase.co` is removed; zero wildcard `script-src`; `TRUST_PROXY` in `lib/rate-limit.ts` strictly defaults to `127.0.0.1` unless `TRUST_PROXY=true`; Turnstile in `lib/security/turnstile.ts` defaults `TURNSTILE_ENABLED=false` and fails closed if secret key is missing. | Configure Cloudflare proxy, SSL Full (Strict), and origin protection. | Owner |
| **5** | **Performance** | **DONE** | All 6 runtime optimization flags in `lib/exam-flags.ts` default strictly to `false` (OFF): `EXAM_RUNTIME_BATCH_SYNC`, `EXAM_RUNTIME_FAST_GRADING`, `EXAM_RUNTIME_CACHE_QUESTIONS`, `EXAM_RUNTIME_CACHE_LEADERBOARD`, `EXAM_RUNTIME_REDIS_RATELIMIT`, `EXAM_RATE_LIMIT_ENABLED`. | None. Flags remain default OFF per rigorous load test verdict (no proven benefit). | Done |
| **6** | **Live Verification** | **NOT STARTED** | `docs/evidence/live-unverified.md` registers 8 third-party integrations with deterministic unit mocks. All 8 are marked **NOT VERIFIABLE LOCALLY** (require third-party credentials/network). Exact env vars documented below. | Staging verification with live credentials. | Owner |
| **7** | **Monitoring and Backups** | **DONE** | `@sentry/nextjs: "11.8.0"` pinned in `package.json` (no-op without `SENTRY_DSN`, PII scrubber active); email outbox worker configured in `render.yaml` (`email-outbox-cron` every 5 min via `CRON_SECRET`), route `/api/internal/email-outbox`; `scripts/ops/db-backup-to-s3.sh` present (compressed custom dump, S3/R2 upload, zero leaked secrets); `docs/runbooks/rollback.md` present; `/api/health` returns status, database latency, payments, paymentMode, and protected details. | Provide live Sentry DSN and S3/R2 backup credentials. | Owner |
| **8** | **Legal, Payments, Business** | **PARTIAL** | `app/privacy`, `app/terms`, `app/refund`, `app/contact`, `app/data-deletion` all exist; `app/refund/page.tsx` contains 0 physical shipping words; `lib/data-deletion/retention-executor.ts` and `lib/config/retention.ts` implemented; `paymentMode: getPaymentMode()` returned in health. | Remove `[DRAFT - owner/CA to confirm]` markers in `docs/evidence/deletion-procedure.md`; formal legal review of refund policy. | Owner & Legal / CA counsel |
| **9** | **Mobile** | **PARTIAL** | `apps/mobile/eas.json` profiles defined; `apps/mobile/app.config.ts` release guard rejects non-HTTPS/localhost URLs; `docs/play-store/data-safety-draft.md` present; `settings.tsx` contains "Request submitted" Alert; mobile `npm ci` (EXIT:0) and `tsc --noEmit` (EXIT:0). | Fix 4 failing/hanging mobile test files per `docs/evidence/r12-mobile-test-proposals.md`; submit Play Store Data Safety form. | Agent (test updates) & Owner (Play Console) |
| **10** | **Soft Launch Readiness** | **PARTIAL** | `scripts/ops/staging-smoke.sh` present (protocol validation, budget checks, route scans); staging runbooks documented. | Resolve the 10 blocking launch items before traffic cutover. | Owner & Agent |

---

## 3. Allocation of Remaining Work

### Needs an Agent (Coding Tasks)
1. **Fix hardcoded test DB credential in `tests/unit/backup-and-rollback.test.ts`:** Line 10 hardcodes `testpassword123` in `TEST_DB`. Update it to fall back to `process.env.DIRECT_URL || process.env.DATABASE_URL` so that running against standard CI credentials (`postgres_password`) passes cleanly.
2. **Apply 4 minimal mobile test proposals from `docs/evidence/r12-mobile-test-proposals.md`:**
   - `apps/mobile/tests/account-and-search.test.ts`: Update deletion assertion to check for `submitMobileDeletionRequest`.
   - `apps/mobile/tests/alert-allowlist.test.ts`: Allow 9th informational alert for "Request submitted".
   - `apps/mobile/tests/fake-data-scan.test.ts`: Strip thrown Error messages before checking for `localhost` fallbacks.
   - `apps/mobile/tests/auth-logout-cache.test.ts`: Clear `QueryClient` instances in `afterEach` to stop GC timers hanging Node.
3. **Flip CI Placeholder Check to Blocking (Post-Sign-Off):** Once owner reviews brand values, set `continue-on-error: false` in `.github/workflows/ci.yml`.

### Needs the Owner (Accounts, Keys, Decisions, Reviews)
1. **Database Infrastructure:** Create Neon project, create databases, obtain pooled + direct connection strings, and run `scripts/ops/migrate-deploy.sh`.
2. **Render Hosting:** Connect repository to Render, configure Blueprint services from `render.yaml`, set `PERSIST_BACKEND=db`, and generate random `CRON_SECRET`.
3. **Cloudflare & Edge:** Configure DNS CNAME, SSL Full (Strict), WAF/Origin restrictions, and generate Cloudflare Turnstile keys.
4. **Third-Party Payment Gateways:** Set live/sandbox credentials for Razorpay (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) and configure webhook endpoints.
5. **Transactional Email:** Set `BREVO_API_KEY` (and `RESEND_API_KEY` fallback), verify sender domain, and configure Cloudflare email routing alias `grievance@aspirantbook.com`.
6. **Object Storage & Backups:** Provision S3 or Cloudflare R2 bucket for backups and media uploads (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`).
7. **Error Monitoring:** Create Sentry project and configure `SENTRY_DSN`.
8. **Legal & Compliance Review:** Submit `/refund` and `docs/evidence/deletion-procedure.md` to legal counsel and Chartered Accountant (CA) to confirm statutory retention windows.
9. **Registered Address & PIN Code:** Confirm physical premises PIN code in Hauz Khas / RK Puram (110016 vs 110022).
10. **Google Play Console:** Complete App Content -> Data Safety declarations using `docs/play-store/data-safety-draft.md` and set Account Deletion URL.

---

## 4. Disagreements Found with `PROGRESS.md` & Historical Reports

1. **Unit Test Gate Suite Status Under CI Credentials:**  
   `PROGRESS.md` (R12-Z and R13-FINAL) claimed "Full clean-env unit suite 5× 558/558 pass, EXIT:0".  
   **Audit Reality:** When executed against a throwaway Postgres container configured with CI credentials (`POSTGRES_PASSWORD=postgres_password` as declared in `.github/workflows/ci.yml`), `tests/unit/backup-and-rollback.test.ts:10` hardcodes `testpassword123` and fails during `G-R12-05` with `pg_dump: FATAL: password authentication failed for user "postgres"`. The true clean-env CI tally is **557 PASS, 1 FAIL (EXIT: 1)**.
2. **Metadata & Worktree Attribution in Header:**  
   `PROGRESS.md` header states `Branch: perf/exam-runtime-v2` and `Base Worktree: /Users/praveenkumar/ws-perf-v2`.  
   **Audit Reality:** The active worktree is `/Users/praveenkumar/ws-launch` and branch is `feat/launch-blockers`.
3. **Task Ledger Baseline Count:**  
   `PROGRESS.md` Task D recorded `460/460 tests pass`.  
   **Audit Reality:** That was an R7d intermediate milestone; the active suite consists of 558 tests across 128 test files.
4. **Task R10-4 Status:**  
   `PROGRESS.md` marked task `R10-4` as `BLOCKED`.  
   **Audit Reality:** The root causes were fully audited and documented in `docs/evidence/r12-mobile-test-proposals.md` with explicit 1-2 line fixes, but the ledger status was left as `BLOCKED` rather than `PROPOSED / PENDING OWNER APPROVAL`.

---

## 5. Phase 6: Live Unverified Integrations & Required Environment Variables

All 8 integrations are marked **NOT VERIFIABLE LOCALLY** and require live staging verification by the owner:

| # | Integration | Status | Required Environment Variable Names | Primary Code Locations |
| :--- | :--- | :---: | :--- | :--- |
| 1 | Google OAuth | NOT VERIFIABLE LOCALLY | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_IDS`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` | `auth.ts:345`, `lib/auth/google-token-verifier.ts:33` |
| 2 | Razorpay Webhook | NOT VERIFIABLE LOCALLY | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | `lib/payments/razorpay.ts:13`, `lib/payments/razorpay-webhook.ts:18` |
| 3 | Brevo Email | NOT VERIFIABLE LOCALLY | `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | `lib/email.ts:28`, `lib/email/outbox-worker.ts:45` |
| 4 | Resend Email | NOT VERIFIABLE LOCALLY | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | `lib/email.ts:34`, `lib/email/outbox-worker.ts:50` |
| 5 | Cloudflare Turnstile | NOT VERIFIABLE LOCALLY | `TURNSTILE_ENABLED`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_VERIFY_URL`, `TURNSTILE_TIMEOUT_MS` | `lib/security/turnstile.ts:21-65`, `components/security/TurnstileWidget.tsx:43` |
| 6 | S3 / R2 Storage | NOT VERIFIABLE LOCALLY | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_S3_ENDPOINT`, `AWS_S3_FORCE_PATH_STYLE` | `lib/aws-s3.ts:18`, `lib/s3.ts:14`, `scripts/ops/db-backup-to-s3.sh:31` |
| 7 | Cloudflare Proxy | NOT VERIFIABLE LOCALLY | `TRUST_PROXY`, `TRUST_PROXY_HOPS` | `lib/rate-limit.ts:83-102` |
| 8 | Play Console Deletion | NOT VERIFIABLE LOCALLY | `NEXT_PUBLIC_APP_URL`, `EXPO_PUBLIC_APP_URL`, `NEXTAUTH_URL` | `lib/actions/auth.ts:116`, `apps/mobile/src/lib/data-deletion.ts:20` |

---

## 6. Fresh-Clone Quality Gate Summary (Run at Current HEAD)

Executed in `/tmp/audit-clone` (--no-hardlinks) with a throwaway Postgres container on `127.0.0.1:54329`:

1. **`npm ci` (Root):** `EXIT: 0` (Added 831 packages, audited 834 packages in 35s)
2. **`npx tsc --noEmit` (Web):** `EXIT: 0` (0 errors)
3. **`npm run lint` (Web):** `EXIT: 0` (0 errors, 2 image warnings)
4. **`npm run build` (Next.js):** `EXIT: 0` (162/162 static/dynamic routes compiled successfully; First Load JS shared: 103 kB)
5. **Unit Test Suite (`ci.yml` runner):** `EXIT: 1`
   - Total Tests: 558 across 128 suites
   - Pass: 557
   - Fail: 1
   - Cancelled: 0
   - First Error: `tests/unit/backup-and-rollback.test.ts:53` failed in `G-R12-05`:
     ```
     pg_dump: error: connection to server at "127.0.0.1", port 54329 failed: FATAL:  password authentication failed for user "postgres"
     ```
     *(Caused by hardcoded `TEST_DB` credential `testpassword123` versus throwaway container credential `postgres_password`)*
6. **Mobile `npm ci` & `tsc --noEmit`:**
   - `apps/mobile npm ci`: `EXIT: 0`
   - `apps/mobile npx tsc --noEmit`: `EXIT: 0` (0 errors)
7. **Dependency Security Audits (`npm audit`):**
   - Root: `{ info: 0, low: 1, moderate: 21, high: 7, critical: 0, total: 29 }`
   - `packages/shared`: `{ info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1 }`
   - `apps/mobile`: `{ info: 0, low: 6, moderate: 30, high: 5, critical: 0, total: 41 }`
   - Critical vulnerabilities across all workspaces: **0**

---

## 7. Integrity Diff vs Tag `r11-ready-2026-11-01`

- **Removed Test Assertions / Expect Lines:** **0** (verified with `git diff -U0 r11-ready-2026-11-01..HEAD -- tests apps/mobile/tests`)
- **Deletions of Test Files:** **0**
- **Dependency Changes in `package.json` files:**
  - Added `@sentry/nextjs: "11.8.0"` (aged > 14 days)
  - Pinned `next-auth: "5.0.0-beta.32"` (removed `^` prefix)
  - Added dependency override `"brace-expansion@1": "1.1.21"`
  - Zero changes in `packages/shared/package.json` or `apps/mobile/package.json`

---

## 8. Top 10 Launch Risks Ordered by Severity

1. **Production DB Refusal on Misconfiguration (`HIGH`):**  
   `lib/boot-guard.ts` terminates the server process immediately on boot if `PERSIST_BACKEND !== "db"`, if `DATABASE_URL` lacks `sslmode=require`, or if Neon pooler host lacks `pgbouncer=true`. Production deployment will fail to start if Render environment variables are not populated exactly as specified in `docs/runbooks/render-cloudflare.md`.
2. **False Green CI Unit Gate on Alternate Database Credentials (`HIGH`):**  
   `tests/unit/backup-and-rollback.test.ts` hardcodes `testpassword123`. When CI runs against a service with a different password, the suite fails. Needs an immediate 1-line fallback fix.
3. **Unverified Payment & Webhook Signature Flows (`HIGH`):**  
   Razorpay order creation and webhook verification have only been tested with deterministic in-memory HMAC fixtures. Any subtle discrepancy in live header parsing or signing keys will disrupt order fulfillment.
4. **Stale Mobile Test Suite (`MEDIUM`):**  
   3 mobile tests fail and 1 hangs on timer exhaustion. While mobile `tsc` is clean, automated CI cannot validate mobile regressions until `docs/evidence/r12-mobile-test-proposals.md` is applied.
5. **DRAFT Status of Data Retention Policy (`MEDIUM`):**  
   Statutory retention periods in `docs/evidence/deletion-procedure.md` are marked `DRAFT`. If a user invokes account deletion before legal/CA review, statutory accounting or analytics records could be wiped prematurely.
6. **Email Outbox Reliance on External Cron Trigger (`MEDIUM`):**  
   Email dispatch depends on Render cron calling `/api/internal/email-outbox` every 5 minutes. If `CRON_SECRET` is misconfigured, transactional verification emails will accumulate in `DevEmailOutbox` without delivery.
7. **Cloudflare Proxy / TRUST_PROXY IP Spoofing Risk (`MEDIUM`):**  
   If `TRUST_PROXY=true` is set before origin firewall rules restrict traffic to Cloudflare IP ranges, attackers can spoof `X-Forwarded-For` or `CF-Connecting-IP` headers to bypass rate limits.
8. **Historical Secret Leaks in Git History (`LOW-MEDIUM`):**  
   58 historical findings (mostly test tokens and documentation URLs) exist across git history. While no active live production keys are exposed, the repository history should be safeguarded prior to public collaboration.
9. **Registered PIN Code Uncertainty (`LOW`):**  
   Hauz Khas premises PIN code (110016 vs 110022) must be confirmed to avoid consumer protection compliance notices under E-Commerce Rules 2020.
10. **High npm Vulnerability Count in Dependencies (`LOW`):**  
    Root has 7 high vulnerabilities and mobile has 5 high vulnerabilities (0 critical). All require semver-major updates currently blocked by Next.js 15 / Expo 57 peer dependencies.
