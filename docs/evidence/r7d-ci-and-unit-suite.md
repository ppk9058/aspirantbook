# R7d — CI unit job + unit-suite triage

**Worktree:** `/Users/praveenkumar/ws-launch`
**Branch:** `feat/launch-blockers`
**Fail-before SHA:** `653518fbc09f39a19507000fe9c93cf201314623`
**Pass-after SHA:** `7950d4b` (see the 5x log header for the exact SHA of the run)
**Date:** 2026-10-31

No assertions were weakened, skipped or deleted in this task. Every change is
either an environment/CI change, a test setup/teardown change, or a
behaviour-preserving product fix that makes the product match an existing test.

---

## 0. Where "Postgres at 127.0.0.1:54340" actually comes from

The audit addendum assumed the tests ask for `54340`. They do not:

```
$ grep -rn "54340" tests lib .github package.json
tests/unit/health-endpoint.test.ts:40:    assert.ok(!rawText.includes("54340"), "Must not leak internal DB port");
tests/unit/health-completeness.test.ts:121:  ... my_super_secret_db_pass@127.0.0.1:54340/trillionskill_launch
```

Both are synthetic values (a leak assertion and a leak fixture). The port comes
from the **untracked `.env.test` in this worktree**, which points at
`127.0.0.1:54340/trillionskill_launch` and is loaded by `dotenv.config()` in 12
suites. When `DATABASE_URL` is *not* already in the environment, those suites
hand `lib/prisma.ts` the 54340 URL and `lib/test-db-guard.ts` refuses it before
Prisma connects, which is exactly the "DB-unreachable cascade" the audit saw.

Two consequences, both fixed here:

1. The canonical test database is `127.0.0.1:54329/trillionskill_test`
   (`docker-compose.test.yml`, `lib/test-db-guard.ts`, `tests/unit/*`).
   CI now publishes the service on **54329** and exports that URL, so the
   environment wins over `.env.test` (dotenv never overrides an existing var).
2. Suites that hardcoded the *perf* database name on 54329 no longer need a
   second database; they prefer `TEST_DATABASE_URL`, then `DATABASE_URL`.

Local reproduction used a throwaway `postgres:16-alpine` on the documented port
plus the docker-compose test DB; both were migrated with `prisma migrate deploy`
(31 migrations, 0 pending).

---

## 1. Measured baseline (fail-before, SHA 653518f)

Runner: `scripts/r7d-clean-env-suite.sh` (`env -i` + only CI variables:
`APP_ENV=test NODE_ENV=test AUTH_TRUST_HOST=true NEXTAUTH_SECRET=<dummy>
DATABASE_URL=postgresql://...@127.0.0.1:54329/trillionskill_test`).

| Environment used | tests | pass | fail | log |
| :--- | ---: | ---: | ---: | :--- |
| DATABASE_URL=127.0.0.1:54340/trillionskill_launch (as `.env.test` asks) | 194 | 136 | 58 | `raw/r7d-baseline-653518f.txt` |
| DATABASE_URL=127.0.0.1:54329/trillionskill_test (canonical) | 444 | 433 | 11 | `raw/r7d-baseline-54329-653518f.txt` |

The difference is entirely the guard: with the launch URL, `lib/prisma.ts`
refuses port 54340 and the database name, so every DB suite dies on import.

Remaining 11 failures at the canonical URL (5 suites):

```
not ok 20 - B5 content audit events live in the database
not ok 35 - C2 doubts and form submissions live in the database
not ok 40 - S3 configuration guards (B-013)
not ok 52 - P1-5: Exam Route Rate Limiting Hardening
not ok 77 - S0: test-database guard
```

`connection-limit-validator`, `exam-rate-limiting`, `guard-test-db`,
`env-guard`, `razorpay-config-fail-closed` and `turnstile-login` are exactly the
suites the audit named.

---

## 2. Bucket 1 — env-only

| Suite | Fail-before | Cause | Fix (no assertion touched) | Pass-after |
| :--- | :--- | :--- | :--- | :--- |
| `env-guard` (S3) | `raw/r7d-baseline-54329-653518f.txt:1911` | `lib/aws-s3.ts` error text had drifted to "AWS_ACCESS_KEY_ID (or S3_ACCESS_KEY) …", the suite asserts the original sentence | error keeps the asserted sentence and appends the accepted aliases | 5x log |
| `razorpay-config-fail-closed` | clean env, no DATABASE_URL: `not ok 6 … error: 'Invalid URL'` (`raw/r7d-razorpay-fail-before.txt`) | the suite parsed `process.env.DATABASE_URL` without ever setting it | the suite sets `DATABASE_URL`/`DIRECT_URL` to the canonical test DB when unset and restores them in `after()` | 6/6 pass with no DATABASE_URL in env |
| `turnstile-login` (G1) | `raw/r7d-unit-suite-5x-5f2b623.txt` run 2/5 (`not ok 79`) | three mobile-login bursts of 6 requests must stay inside one wall-clock minute; under CPU load the burst straddled a boundary and the counter reset | each affected burst now starts with ≥45 s of headroom in the window | 5x log |
| `lib/test-db-guard` (S0) | `raw/r7d-baseline-54329-653518f.txt:3451` "Missing expected exception" | the guard had been relaxed to accept the default port 5432, which its own suite rejects | 5432 removed from the allow-list (54340, the documented launch DB, added) | 5x log |

CI-level env-only items are in section 4 (the job had no `NEXTAUTH_SECRET`, no
`AUTH_TRUST_HOST`, and published Postgres on 5432).

---

## 3. Bucket 2/3 — state, ordering and hardcoded database

| Suite | Fail-before | Cause | Fix (no assertion touched) | Pass-after |
| :--- | :--- | :--- | :--- | :--- |
| `exam-rate-limiting` (web + mobile v1) | `…:2398`, `…:2420` `'2' !== '60'` | `Retry-After` is the seconds left in the current minute bucket, so it equals `windowSeconds` only at the exact boundary | `Date` is pinned to a bucket boundary for the two assertions (`mock.timers`, `apis: ["Date"]`), limiter rows deleted afterwards | 5x log |
| `ratelimit-and-mobile-sync` | not red at the canonical URL, but shared a fixed key `exam:web:submit:u_u_ratelimit_exhaust_test` across runs | no reset hook | `before`/`after` delete that key and restore `TRUST_PROXY` / `EXAM_RATE_LIMIT_ENABLED` | 5x log |
| `rate-limit-ip` | not red; already had a reset hook | — | unchanged | 5x log |
| `cache-invalidation-versioning` | red only when the perf DB does not exist (CI) | hardcoded `trillionskill_perf_v2_test` | URL = `TEST_DATABASE_URL \|\| DATABASE_URL \|\| <local fallback>` (same for 8 sibling perf suites) | 5x log |
| `connection-limit-validator` | `…:940` "At least 1 active connection should exist" | `pg_stat_activity` filtered on the hardcoded database name | filters on `current_database()` | 5x log |

---

## 4. Task A — `.github/workflows/ci.yml` test job

Before: `node --test --test-concurrency=1 node_modules/.bin/tsx tests/unit/*.test.ts`
(loads the tsx shim as a test file, no tsx loader, no `@/*` alias: 8 pass / 72
fail / 9 cancelled), no `NEXTAUTH_SECRET`, no `AUTH_TRUST_HOST`, Postgres on
5432 which the guard rejects.

After:

* runner `npx tsx --test --test-concurrency=1 tests/unit/*.test.ts`
* `services.postgres` = `postgres:16-alpine`, health-checked, published
  **54329:5432**
* job env: `APP_ENV=test`, `NODE_ENV=test`, `AUTH_TRUST_HOST=true`,
  `NEXTAUTH_SECRET` = dummy CI value, `DATABASE_URL`/`DIRECT_URL` on
  127.0.0.1:54329 (`?connection_limit=10` on the URL the app uses)
* wait-for-Postgres step (TCP probe), `prisma migrate deploy`, then
  `prisma migrate status` before the suite
* no real secrets anywhere in the file; `npm ci` runs `prisma generate` via
  `postinstall`

YAML parses (`js-yaml`, jobs: lint, tsc-ratchet, security-audit,
migrations-check, test, build, docker-build, deploy-staging, deploy-prod).

---

## 5. Task C — five consecutive clean-env runs

`scripts/r7d-unit-suite-5x.sh` runs the suite five times from `env -i` with only
the CI variables and writes the SHA in every run header.

**SHA `7950d4b32ffe728f16e5fe58a48bad8d8e54cc62` — 5/5 green.**

| Run | tests | pass | fail | cancelled | exit |
| :--- | ---: | ---: | ---: | ---: | :--- |
| 1/5 | 444 | 444 | 0 | 0 | 0 |
| 2/5 | 444 | 444 | 0 | 0 | 0 |
| 3/5 | 444 | 444 | 0 | 0 | 0 |
| 4/5 | 444 | 444 | 0 | 0 | 0 |
| 5/5 | 444 | 444 | 0 | 0 | 0 |

Log: `raw/r7d-unit-suite-5x-7950d4b.txt`.

For transparency: the same script at `5f2b623` produced 4/5 green and one failure
(`turnstile-login`, run 2 — minute-boundary race). That log is kept in
`raw/r7d-unit-suite-5x-5f2b623.txt`; run 2 there overlapped an unrelated
`next build` that saturated the CPU, which is what widened the race. The fix for
it is the headroom helper described in section 2.

---

## 6. Task E — quick checks (report only)

Full raw output: `raw/r7d-e-quick-checks.txt`, `raw/r7d-mobile-tsc.txt`.

### E1 dev OTP bypass guard

* `lib/boot-guard.ts` refuses to boot when `NODE_ENV=production` and
  `ALLOW_DEV_MOBILE_LOGIN=true`, and when `APP_ENV=test` without a local
  `*_test` database. It is imported **only** from `app/layout.tsx`, so it runs
  on page renders, not in an API-only server process.
* `lib/api/v1/dev-bypass.ts` is the central helper. `app/api/auth/mobile-login/route.ts:52`
  implements the same policy inline instead of calling it — behaviourally
  equivalent today (production requires `APP_ENV=test` + local `*_test` DB),
  but it is a third copy of the rule (the third is a UI flag in
  `lib/services/config.service.ts:13`). Drift risk, not an active bypass.
* `isDevBypassAllowed()` keys on `NODE_ENV === "production"`; a deployment that
  forgets `NODE_ENV` is only protected by the absence of `APP_ENV=test`.

### E2 CORS on `/api/v1` — moved to R7e

`grep -rn "Access-Control-Allow-Origin" app lib middleware.ts` → **no matches**.
`grep -rn "export async function OPTIONS" app/api/v1` → **no matches**.
There is no CORS layer on `/api/v1` at all: the native app is unaffected (RN
does not enforce CORS), browser clients can only call same-origin, and no route
answers a preflight. Not touched in R7d; the origin list for the mobile app must
be confirmed first (R7e).

### E3 mobile `tsc` after `npm install`

`npm install` in `apps/mobile` (904 packages, 2 min, no tracked file changed)
makes `npx tsc --noEmit` reach the real type check: **27 errors**, all caused by
`src/lib/cbt-sync.ts` no longer exporting `cbtSyncQueue`, `CbtSyncQueueManager`,
`MemoryCbtDriver`, `LocalAnswerRecord`, `NodeSqliteDriver`, `SqliteCbtStorage`,
`ExpoSqliteDriver`, plus two `ApiClient` signature mismatches in
`src/app/settings.tsx`. Two of those imports are **app code**
(`src/app/_layout.tsx:12`, `src/components/cbt/CbtRecoveryManager.tsx:4`), so the
mobile bundle does not build. Report only — no code changed in R7d.

---

## 7. Still red / not verifiable here

* **Nothing in `tests/unit/*` is red** at `7950d4b` in a clean environment
  (444/444, five consecutive runs).
* **No GitHub Actions run.** Pushes are out of scope for this task, so the
  fixed `test` job has only been reproduced locally (same runner, same env, an
  equivalent `postgres:16-alpine` on 54329). The first hosted run is still the
  only proof that the service container, the wait step and `npm ci` behave on
  `ubuntu-latest`.
* **`npm ci` was not re-run at the repo root** (it would replace the shared
  `node_modules`); `apps/mobile` `npm install` did reach the registry, so the
  earlier "registry unreachable" limitation no longer applies.
* **Mobile app does not type-check/bundle** — 27 `tsc` errors caused by
  `apps/mobile/src/lib/cbt-sync.ts` exporting a different API than
  `_layout.tsx`, `CbtRecoveryManager.tsx` and six test files import (E3). That
  is a product defect, outside "triage the unit suite", and it is the largest
  remaining launch blocker found in this pass.
* **`/api/v1` has no CORS layer** (E2 → R7e).
* **`lib/boot-guard.ts` only runs from `app/layout.tsx`** (E1): an API-only
  deployment never executes the `APP_ENV=test` + non-test-DB refusal.
* **Contact/doubt persistence defaults to local disk.** `PERSIST_BACKEND`
  defaults to `fs`, so a production deployment that does not set
  `PERSIST_BACKEND=db` writes `data/form-submissions.json` (visible as untracked
  test residue during this run). Unchanged by R7d, but worth an owner decision.

