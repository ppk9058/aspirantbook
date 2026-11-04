# PHASE 0 — Recon + Reconcile (read-only)

- Date: 2026-11-04
- Worktree: `/Users/praveenkumar/ws-launch`
- Start branch/HEAD: `verify-launch-fixes` / `26fd262` (confirmed)
- Final branch created from it: `final-verify` @ `26fd262`
- Remotes: `app` = ppk9058/aspirantbook, `origin` = ppk9058/TrillionSkill
- No code changed in this phase. Evidence: `reports/EVIDENCE/p0-*.txt`

## a) Git state

```
HEAD=26fd26230159b1e52f68e3c88fe5b9ad996ff641 branch=final-verify
app    https://github.com/ppk9058/aspirantbook.git (fetch/push)
origin https://github.com/ppk9058/TrillionSkill (fetch/push)
/Users/praveenkumar/TrillionSkill        c603168 [perf/exam-runtime]
/Users/praveenkumar/TrillionSkill-run9   fde8b68 (detached HEAD)
/Users/praveenkumar/ws-compact           5aba322 [feat/attempt-compaction]
/Users/praveenkumar/ws-launch            26fd262 [final-verify]
```

Note: the primary checkout `/Users/praveenkumar/TrillionSkill` is **not** on a main line and is not the worktree used here. No branch/worktree/file was deleted.

## b) Branch containment in HEAD (`reports/EVIDENCE/p0-containment.txt`)

| branch | ancestor of HEAD? | unique commits `HEAD..branch` |
|---|---|---|
| content-engine-integration | YES | 0 |
| seo-core | YES | 0 |
| otp-message-central | YES | 0 |
| perf-mobile-fix | YES | 0 |
| feat/launch-blockers | YES | 0 |
| fix/demo-role-prod-guard | **NO** | 1 |
| perf/exam-runtime | YES | 0 |
| feat/attempt-compaction | **NO** | 14 |
| feat/ai-layer | **NO** | 2 |
| feat/course-studio-generalize | **NO** | 3 |
| app/main | YES | 0 |
| origin/main | **NO** | 17 |

Verdict: the four "lost" branches named in the brief (`content-engine-integration`, `seo-core`, `otp-message-central`, `perf-mobile-fix`) **are** contained in HEAD. `origin/main` is a different repository line and is *unrelated history* (see c).

## c) Merge dry-run (no working-tree change)

`git merge-tree --write-tree HEAD <branch>` conflict files (`reports/EVIDENCE/p0-conflicts.txt`):

- `fix/demo-role-prod-guard`: `lib/auth/demo-role.ts`, `lib/auth/rbac.ts`, `middleware.ts`, `tests/unit/demo-role-guard.test.ts`
- `feat/attempt-compaction`: `docs/evidence/PROGRESS.md`, `lib/test-db-guard.ts`
- `feat/ai-layer`: `app/(dashboard)/search/page.tsx`, `components/admin/AdminNav.tsx`, `prisma/schema.prisma`
- `feat/course-studio-generalize`: `app/api/auth/mobile-login/route.ts`, `components/admin/courses/VideoCourseEditorClient.tsx`, `components/course/CourseBundleView.tsx`, `prisma/schema.prisma`
- `app/main` vs HEAD: clean (app/main is already an ancestor)
- `origin/main`: **fatal: refusing to merge unrelated histories** (exit 128) — `reports/EVIDENCE/p0-mergetree-originmain.txt`. `app` and `origin` are not two versions of one line; they are unrelated repos.

## d) Contradiction resolution (CODE TRUTH vs CLAIM)

### d1. OTP numbers
| Item | Code truth | file:line |
|---|---|---|
| send per phone | **3 per 600 s (10 min)** | `lib/services/sms-otp/service.ts:34` |
| send per IP | **10 per 3600 s (1 h)** | `lib/services/sms-otp/service.ts:35` |
| resend cooldown | **30 s** | `lib/services/sms-otp/service.ts:36` |
| verify attempts | **5 per 600 s (10 min)** per verificationId | `lib/services/sms-otp/service.ts:37-38,321-332` |
| code/binding expiry | provider timeout clamped **60–600 s**; dev adapter **300 s** | `service.ts:43-44,245-247`; `dev.adapter.ts:19` |
| proof TTL | **2 minutes** | `lib/services/sms-otp/proof.ts:17` |
| HTTP status on attempt limit | **429**, not 423 | `app/api/auth/mobile-login/route.ts:44-55`; `app/api/v1/auth/otp/verify/route.ts:57` |

**Verdict: CLAIM WRONG.** The earlier "1/min + 5/hr, 5 attempts, 300 s, proof 2 min vs 5 per 15 min, 4th attempt 423, 10 min" mixes several schemes. Real: **3/10 min per phone, 10/h per IP, 30 s cooldown, 5 attempts/10 min, 429, proof 2 min**. No 423 path exists.

### d2. Quality gate count
`lib/modules/content-engine/quality-gates.ts:14-22` defines **7 failure reasons**: `missing-answer`, `few-options`, `thin-explanation`, `no-source`, `uncategorized`, `duplicate`, `unverified`. Six run always; `unverified` only when `strict` (`:104-106`); `duplicate` is Jaccard ≥ 0.8 (`:93-102`).
**Verdict: CLAIM "7" is right; "10"/"20" are wrong.** There are 7 gate *reasons*, not 7/10/20 independently configurable gates.

### d3. Rate-limit backend
- Default backend is **PostgreSQL `RateLimit` table** (`INSERT … ON CONFLICT … RETURNING count`), `lib/rate-limit.ts:180-220`.
- Redis is used **only** when `isExamRedisRateLimitEnabled() && redis` (i.e. `EXAM_RUNTIME_REDIS_RATELIMIT=true` + `REDIS_URL`), `lib/rate-limit.ts:146-165`.
- OTP send/verify → `checkRateLimit(... failClosed:true)` (`service.ts:191-240,321`).
- Login lockout → per-user `failedLoginAttempts`/`lockedUntil` (`lib/auth/rate-limiter.ts:16-31,92-99`), plus `checkV1RateLimit` for API login.
- Exam/API routes → `checkV1RateLimit` (`lib/api/v1/rate-limit.ts:6-35`) → same `checkRateLimit`.
- `REDIS_URL` unset: DB path, no in-memory fallback. **Limits survive process restart** (verified later in Phase 2).
**Verdict: CLAIM "Redis/in-memory" FALSE.** Postgres is the real backend.

### d4. "neon"
Only mentions are tests/runbooks/boot-guard, never a provider change:
- `lib/boot-guard.ts:75-86` (comment: Neon pooler host needs `pgbouncer=true`)
- `tests/unit/db-url-neon-safety.test.ts`, `tests/unit/persist-backend-production.test.ts`, `tests/unit/staging-smoke-script.test.ts`
- `docs/runbooks/staging-neon.md`, `docs/runbooks/render-cloudflare.md:162`, `docs/evidence/*`, `docs/verify-launch/REPORT.md:132,155`
**Verdict: Neon is a plan/documentation item only. Production provider remains Supabase/Postgres.**

### d5. Course ownership field
- Schema: `Course.createdById` (`prisma/schema.prisma:121`, relation `:144`). There is **no** `creatorId`/`instructorId`/`userId` on `Course` (`creatorId` at `:1266` belongs to another model — PYQ paper).
- `assertCanManageCourse`/`canManageCourse`/`courseAccessLevel` correctly use `createdById` (`lib/auth/course-access.ts:43-56,74-85`).
- **BUG:** `isCourseVisibleToUser`'s owner-teacher branch checks `course.instructorId ?? course.authorId ?? course.userId` (`lib/courses/visibility.ts:24-33`) — none of these exist on `Course`. A TEACHER previewing their own DRAFT course is therefore **not** recognised as owner and gets the anonymous rule.
**Verdict: one real ownership check uses non-existent fields.** To be reproduced at runtime in Phase 3 and fixed.

### d6. OTP test override
- File: `lib/services/sms-otp/provider.ts` (`__setOtpProviderForTests`, `:18-25`). `lib/otp.ts` **does not exist**.
- Override throws when `NODE_ENV === "production"` (`provider.ts:19-22`); `isOtpDevBypassAllowed()` returns false in production (`:35`); `DevOtpProvider.send/verify` also throw in production (`dev.adapter.ts:25-27,42-44`).
**Verdict: CLAIM "lib/otp.ts" is stale; the real seam is provider.ts and it is production-refusing.**

### d7. Demo flags
There is no `lib/auth/demo-guard.ts`. Real files/flags:
- `lib/auth/demo-role.ts:23-29` — `NODE_ENV==="production"` → false; otherwise `DEMO_MODE_ENABLED==="true"` / `ENABLE_DEMO_ROLE==="true"` / `APP_ENV==="test"`.
- `lib/auth/demo-role-server.ts` uses it.
- `ENABLE_DEMO_DATA` only in `lib/books/bookService.ts:294-301`, which returns false in production.
- `ALLOW_DEV_MOBILE_LOGIN`: `lib/boot-guard.ts:10,90-98` (refuses boot in production), `lib/api/v1/dev-bypass.ts:10-33`, `app/api/auth/mobile-login/route.ts:71` (additionally requires `NODE_ENV !== "production"`).
- **CRITICAL BUG in HEAD:** the raw `ts_demo_role` cookie is still trusted unconditionally by:
  - `lib/auth/rbac.ts:20-25` (HEAD) — `cookieStore.get("ts_demo_role")` cast to role
  - `middleware.ts:13` (HEAD) — `req.cookies.get("ts_demo_role")`
  - `app/api/auth/role/route.ts:8` and `:19-25` (HEAD) — sets it with no environment check
  The guard module exists but is **not wired** at these three call sites.
- `fix/demo-role-prod-guard` (`6799f6b`, 1 commit) is exactly that wiring + test: 22 files, `lib/auth/demo-role.ts` (46 lines), `rbac.ts`, `middleware.ts`, `api/auth/role/route.ts`, `tests/unit/demo-role-guard.test.ts`. Diff vs HEAD contradicts HEAD's history (add/add on demo-role.ts) but the call-site guards are **absent in HEAD**.
**Verdict: the fix is NOT present in HEAD. It is a live privilege-escalation vector to be proven in Phase 2/3 and fixed.**

### d8. Legacy SMS paths / Message Central names
- `FAST2SMS_API_KEY`, `MSG91_AUTH_KEY`, `TWILIO_AUTH_TOKEN` appear only in `lib/boot-guard.ts:13-17` (existence check for a boot warning variable) — **no adapter, no send, no verify**. `SMS_API_KEY` has **0** hits in `lib/`/`app/`.
- The only SMS adapters are `lib/services/sms-otp/dev.adapter.ts` and `message-central.adapter.ts`; both are reached only through `otpService` (binding + attempt gated) and `isOtpDevBypassAllowed`.
**Verdict: legacy providers cannot send or verify OTP.**
- Message Central env names actually read: `MESSAGE_CENTRAL_CUSTOMER_ID`, `MESSAGE_CENTRAL_AUTH_KEY`, `MESSAGE_CENTRAL_BASE_URL` (`message-central.adapter.ts:38-44`, `boot-guard.ts:102-103`). `.env.example:235-239` matches.
- **Wrong doc:** `docs/verify-launch/REPORT.md:150` tells the operator to set `MESSAGECENTRAL_CUSTOMER_ID`, `MESSAGECENTRAL_AUTH_TOKEN`, `MESSAGECENTRAL_SENDER_ID` — all three names are wrong. FINDING (doc only; will fix).

### d9. `/q/[slug]`
`app/q/[shortId]/route.ts` exists as a route handler (no page). It resolves the public question and `NextResponse.redirect(..., 308)` (`:18`). It lives under `app/` (allowed). `app/q` has no `page.tsx`, so `/q/<id>` is a pure 308, unknown id → 404 (`:13-15`).
**Verdict: exists, 308, inside allowed folders.**

### d10. Lint
`npm run lint` → **exit 0**, 0 errors, **2 real ESLint warnings** (`<img>` in `components/books/EBookReaderModal.tsx:231`, `components/editor/RoseraRenderer.tsx:1824`) plus 1 workspace-root inference warning caused by a stray `/Users/praveenkumar/package-lock.json`. Evidence `reports/EVIDENCE/p0-lint.txt`.

## e) Inventory vs static audit

| Thing | Audit claim | Actual (command) | Difference |
|---|---|---|---|
| Web pages (`app/**/page.tsx`) | 160 | **160** | 0 |
| API routes (`app/api/**/route.ts`) | 190 | **190** | 0 |
| Total route handlers | — | 191 (incl. `app/q/[shortId]/route.ts`) | — |
| Mobile screens (`apps/mobile/src/app/**/*.tsx`) | 42 | **42** | 0 |
| Admin studio dirs (`app/admin/*`) | 16 | **19 dirs with page.tsx**: analytics, assessments, audit, batches, book-studio, books, content-engine, courses, current-affairs, dashboard, data-deletion, exercises, homepage-cards, pyqs, seo, settings, tracks, tutorials, users (+ `(dashboard)/admin/test-series`) | audit undercounts |
| Teacher studios | — | batches, book-studio, classes, courses, current-affairs, pyqs, questions, test-series, tests, tutorials | — |

## Findings raised in Phase 0 (to prove in later phases)

1. **P0-F1 (critical, security):** raw `ts_demo_role` cookie trusted in `rbac.ts`, `middleware.ts`, `api/auth/role/route.ts` → role spoofing. Fix branch exists but is not merged.
2. **P0-F2 (functional):** `isCourseVisibleToUser` owner check uses non-existent columns → teacher cannot preview own draft.
3. **P0-F3 (test-infra):** `.env.test` points at `127.0.0.1:54340/trillionskill_launch` (closed port; DB name does not end in `_test`, so it would fail the boot guard). Local 54329 has `launch_verify` and `launch_verify_test`; all runs below override `DATABASE_URL` to 54329 explicitly.
4. **P0-F4 (docs):** wrong Message Central env names in `docs/verify-launch/REPORT.md:150`.
5. **P0-F5 (build hygiene):** stray `/Users/praveenkumar/package-lock.json` makes Next infer the wrong workspace root.

## DB assertion (for all later phases)

```
$ psql -h 127.0.0.1 -p 54329 -d postgres -Atc "select datname ..."
launch_verify
launch_verify_test
postgres
```
Every server/test run later prints `127.0.0.1:54329/<db>` and aborts otherwise. Ports 54340 and 3045 are not used.
