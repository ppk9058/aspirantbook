ROLE: Executor for R12 in /Users/praveenkumar/ws-launch on branch feat/launch-blockers (HEAD should be 6b04751, tag r11-ready-2026-11-01). Read docs/evidence/PROGRESS.md first. GitHub CI is green at this commit; keep it green.

HARD RULES
- Forbidden: git push, merge, rebase, reset, clean, stash, branch/worktree deletion, force, switching branches, touching other worktrees. Commits only, prefix "R12-<step>:".
- Never read or print values from any .env file or secret. Names, paths, counts only. No real keys exist in this task; use env var names and dummy values only in tests.
- Never weaken, skip or delete a test or assertion. Fail-before and pass-after 5x in a clean env (env -i, CI variable names from .github/workflows/ci.yml, local throwaway Postgres on 54329 with the CI credential shape), git SHA in every log header, logs in docs/evidence/raw/, one summary row per step appended to docs/evidence/PROGRESS.md.
- Max 2 fix attempts per problem, then mark BLOCKED with evidence and continue to the next step.
- No remote services. No live calls to Render, Neon, Cloudflare, Sentry, Razorpay, Google, Brevo or Resend. Everything is verified locally with mocks or the local DB.
- Any new npm dependency: exact pinned version at least 14 days old, record npm audit before/after (critical must stay 0), build must still produce 162 routes. Prefer no new dependency.
- Do not change .github/workflows/ci.yml in a way that makes any current job less strict. Do not bump next, react, zod, expo, next-auth majors.
- Do not edit apps/mobile tests. Do not change any user-facing legal text except where a step says so.

R12-0 AUDIT (read-only, commit as docs/evidence/r12-audit.md)
For every step below report: already done / partly / missing, with file paths. Also list: gitleaks CI job present?, .gitleaksignore present?, render.yaml present?, Sentry present?, count of console.log in server code (app/api, lib, app/**/actions), count of localhost/127.0.0.1 fallbacks in non-test production code, supabase.co references in next.config.js and middleware, tracked files over 1 MB, LICENSE present?. Skip later steps that are already done and say so.

TIER 1: needed for the staging soft launch

R12-A RENDER BLUEPRINT
Add render.yaml at repo root: one Docker web service using the existing Dockerfile, healthCheckPath /api/health, autoDeploy off, env var NAMES only (no values; secrets as sync:false) taken from the REQUIRED entries of .env.example, NODE_ENV=production, PERSIST_BACKEND=db, TRUST_PROXY left unset with a comment saying set to true only after Cloudflare proxy is on. Add a pre-deploy migration command that runs scripts/ops/migrate-deploy.sh using DIRECT_URL. Add a validation test (YAML parses, no secret-like values, every env name exists in .env.example). Update docs/runbooks/render-cloudflare.md to match.

R12-B DATABASE URL SAFETY FOR NEON
Check prisma/schema.prisma uses url=DATABASE_URL and directUrl=DIRECT_URL. Add a boot-time check (extend the existing boot guard, production only): DATABASE_URL must not point at localhost/127.0.0.1, must contain sslmode=require, and a pooled Neon host requires pgbouncer=true; DIRECT_URL must be set for migrations. Fail closed with a clear message that never prints the URL. Tests for each rule, non-production unaffected.

R12-C SECURITY HEADERS AND CSP
Review next.config.js headers. Remove the stale supabase.co allowance from connect-src (no live Supabase use exists). Ensure the CSP allows exactly what the app uses: Cloudflare Turnstile (challenges.cloudflare.com), Razorpay checkout, Google OAuth, the configured S3/R2 host via env, Sentry ingest host via env if R12-E is done. Add HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors, Permissions-Policy. Add a test that fetches headers from the built server (or the config object) and checks no wildcard * script-src and no supabase.co. Verify the built server still renders login, register, a course page, and checkout page without CSP violations in a headless check if Playwright is already installed; otherwise state not verified.

R12-D STAGING SMOKE SCRIPT
Add scripts/ops/staging-smoke.sh taking BASE_URL from env (refuse non-https unless localhost). Checks: /api/health 200 and body has no secret-like strings; /admin 307; /api/admin 401; /api/auth/role 404; /api/exam/test/bulk 401; register page and login page 200; robots/sitemap 200; security headers present; a response time budget. Prints PASS/FAIL per check, exit 1 on any fail. Run it against the local production build and record the log. Document in docs/runbooks/staging-neon.md.

R12-E ERROR MONITORING (Sentry, optional by env)
Add @sentry/nextjs (pinned) initialised only when SENTRY_DSN is set; absent DSN means a no-op and zero network calls. Scrub request bodies, cookies, auth headers, emails, tokens and query strings before send. Add SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE (git SHA) to .env.example as OPTIONAL; extend the .env.example completeness test accordingly. Tests: no-op without DSN; scrubber removes seeded fake PII. Build must still pass 162 routes and bundle size change must be reported.

R12-F EMAIL OUTBOX CONSUMER
The outbox worker exists (lib/email/outbox-worker.ts, app/api/internal/email-outbox, workflow stub disabled). Add a Render cron job entry to render.yaml that calls the CRON_SECRET-protected route every 5 minutes (secret via env, not in file), and a re-enable-ready GitHub Actions alternative left disabled. Add a test that the route rejects missing/wrong secret and processes a pending row. Document in the runbook.

R12-G BACKUPS AND ROLLBACK
Extend scripts/ops: db-backup-to-s3.sh (pg_dump from DIRECT_URL, compressed, uploaded to an S3/R2-compatible bucket by env names, retention prune, never prints URLs or keys; supports a local MinIO or local directory target for testing), and restore verification reuse of backup-restore-test.sh. Add docs/runbooks/rollback.md: app rollback on Render, DB restore steps, migration rollback policy (additive only), who-does-what checklist. Test the backup script end to end against the local DB and local target; record row counts compared.

TIER 2: before opening to the public

R12-H DEPENDENCY CLEANUP WITHOUT MAJOR BUMPS
Run npm audit (root, packages/shared, apps/mobile). Apply only non-breaking fixes (npm audit fix without --force, or targeted minor/patch bumps and overrides). Report before/after counts per severity. After changes: tsc, lint, build 162 routes, unit suite 5x clean env, B-001 built-server smoke. If a fix needs a major bump, list it for the owner instead of doing it. Pin next-auth to its exact current beta version.

R12-I HYGIENE
Using the R12-0 counts: (1) replace console.log in server code with the existing logger or remove, keeping intentional audit logging; (2) in production code paths, localhost/127.0.0.1 fallbacks must fail closed in production (use NODE_ENV checks) without changing dev/test behaviour; (3) remove supabase.co from non-test code and config where unused; (4) add LICENSE only as "All rights reserved" notice placeholder file named LICENSE with the owner legal name from lib/config/brand.ts; (5) report tracked files over 1 MB and do NOT delete them, just list. Every change gets a test or a grep-based guard test. Do not touch .env files.

R12-J SECRET HYGIENE FOLLOW-UP
Confirm .gitleaksignore exists and ignores nothing longer than 12 chars. Add a gitleaks CI job (continue-on-error: true, pinned action version at least 14 days old, redact output). Replace the remaining "process.env.X || <literal>" fallbacks in scripts/ and tests/e2e with fail-fast env reads where that cannot change unit suite behaviour; list the ones in tests/unit that must keep a fixture value (names and counts only). Re-run gitleaks and report counts by rule, never values.

R12-K DATA DELETION AND RETENTION EXECUTOR
Per docs/evidence/deletion-procedure.md (retention values are DRAFT, keep them as named constants in one config file, each marked owner/CA to confirm): implement an admin-triggered processor for COMPLETED-approved deletion requests: 30-day recovery window, then irreversible PII wipe of the user (anonymise, keep anonymised exam answers for analytics, keep payment records and GST invoices untouched), and a separate purge of doubt attachments older than the configured days. Dry-run mode by default, explicit confirm flag to execute, one AuditLog row per action, idempotent, never touches payments. Tests on real Postgres: dry-run changes nothing, execute anonymises exactly the target user, other users unchanged, payments untouched, second run is a no-op. Do not enable any scheduler.

R12-L PAYMENT MODE SAFETY
Without calling Razorpay: add a startup/health indicator "paymentMode: test|live|unconfigured" derived from the key id prefix (never print the key), and a production boot warning when live keys are present while docs/evidence/launch-owner-todo.md items are unchecked is NOT required; instead only add the health field and a test. Verify the webhook route still fails closed without RAZORPAY_WEBHOOK_SECRET and that order creation refuses to run with a mismatched test/live pair. Tests only; no behaviour change for valid configs.

TIER 3: mobile and Play Store prep (no store actions)

R12-M MOBILE PREP
(1) Write docs/evidence/r12-mobile-test-proposals.md for the 4 failing mobile tests: for each, the test file, what it asserts, why it conflicts with the current product behaviour, and the exact minimal test change you would propose. DO NOT edit any mobile test and do not change product code to satisfy them. Identify the 4th failing test, which was never named. (2) Verify apps/mobile has eas.json with development, preview, production profiles; production reads the API base URL from env, https only (the existing check:release must pass). Add or fix eas.json/app.config.ts only if missing, without touching tests. (3) Generate docs/play-store/data-safety-draft.md from the code: list of personal data fields collected by the mobile app and API (email, name, goals, exam attempts, device push token, etc.) with purpose, storage, deletion path, and the account-deletion URL; mark it DRAFT for the owner. (4) Verify mobile tsc 0 and mobile test count unchanged (the same 4 failures, no new ones).

R12-Z FINAL
Fresh clone under /tmp at the final SHA: npm ci, web tsc, lint, build (162 routes), full clean-env unit suite, mobile npm ci + tsc, staging-smoke against the local production build. Check git diff 6b04751..HEAD -- tests apps/mobile/tests for removed assert/expect/it(/test( lines (must be none, new test files are fine). Commit, create local tag r12-ready-2026-11-01. Do not push.

FINAL REPORT: per step status (DONE / SKIPPED-already-done / BLOCKED), what changed, fail-before and pass-after numbers, SHAs, new dependencies with versions, audit before/after, anything you were unsure about, and every removed test or assertion line (must be none).