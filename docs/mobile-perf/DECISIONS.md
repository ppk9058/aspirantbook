# DECISIONS — mobile + API performance pass (perf-mobile-fix)

Autonomous run. Every ambiguity resolved by the safest option (zero visible /
behavioural change). Never stopped to ask.

## Environment / isolation

| Topic | Decision | Why |
| --- | --- | --- |
| Worktree | `../TS-perf`, branch `perf-mobile-fix` created from `feat/launch-blockers` | `feat/launch-blockers` is the only local branch that tracks **both** `apps/mobile/src` and `app/api/v1` (`git ls-tree` check), and it is 7 commits ahead of `app/main`, 0 behind. `perf/exam-runtime` (original folder) has neither tree. |
| Sibling worktree `../TS-otp` | never opened, never touched | parallel OTP-login session |
| Disk | 20 GB free at start (`df -h .` = 20Gi avail) > 10 GB → proceed | BLOCKED.md not written |
| `.env`, `.env.test` | copied into the worktree (names only, never printed) | |
| `.env.local` | copied in, then renamed to `.env.local.perf-backup` before any test-DB run | `scripts/guard-test-db.ts` aborts if `.env.local` exists, and `.env.local` holds the dev/Supabase overrides which must never be loaded by a test run. Restored at the end of the run. |
| Prisma env loading | every DB/server command explicitly exports `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL` | `@prisma/client` loads the root `.env` into `process.env` on import, which otherwise trips `assertNoSupabaseEnv()` and could point tooling at Supabase |
| Test DB | Docker Postgres `127.0.0.1:54329`, **dedicated database `perf_test`** (`CREATE DATABASE perf_test`), `prisma migrate deploy` with the repo's existing migrations, seeded with `scripts/seed-docker-test-db.ts` | no `db push`, no `migrate dev`, no reset/drop/truncate; `trillionskill_test` and the sibling session's `otp_test` untouched |
| Test server | `next dev` on **127.0.0.1:3046** with `APP_ENV=test PRISMA_LOG_QUERIES=1 NEXT_DIST_DIR=.next-test` against `perf_test` | never 3000, never 3045 |
| Device / FPS / memory | NOT TESTED — no Xcode (`xcodebuild` missing, `simctl` unavailable) and no Android emulator/AVD on this machine | mobile runtime perf claims are not made; jest-expo mounted tests are the executable evidence |
| Docker Desktop | had to be restarted before the run (daemon socket was dead). No repo change. | |

## Scope decisions

| Fix | Decision | Reason |
| --- | --- | --- |
| F1 lists | virtualize `(tabs)/courses`, `(tabs)/tests`, `(tabs)/home`, `current-affairs/index`, `pyqs/index` | these are the unbounded/bounded-but-long lists reachable from the 5 audited screens. Other `ScrollView`+`.map` screens (my-learning, my-tests, library, learn, search, career-tracks, notifications, practice, subscription) are **not touched** — out of the requested fix list; recorded as follow-ups. |
| F1 horizontal carousels | left untouched (`ScrollView horizontal` inside `ListHeaderComponent`) | task requirement |
| F2 persistence | debounce 2 s + flush on `AppState` background/inactive + flush on unmount; the debounce is cancellable and `clearPersistedQueryCache` cancels it | a pending timer that fired after logout could re-write the previous account's cache — cancelling keeps today's logout guarantee |
| F3 duplicate `/me` | keep both call sites' decision logic **identical**; the provider exposes the `/me` promise it already starts (`AuthContext.awaitViewerProfile()`) and `BootstrapScreen` awaits that same promise, falling back to `api.getMe()` when no provider request exists | first attempted as a module-level single-flight around `api.getMe()` in `lib/api.ts`; that broke the existing regression `T2 … AuthProvider profile refresh race › ignores a stale refreshProfile response that resolves after a newer one`, which asserts that two concurrent `refreshProfile()` calls issue **two** `api.getMe()` requests. Reusing the provider's own promise keeps that behaviour: only the bootstrap/context pair is deduped, two explicit refreshes still make two requests. Branch logic (offline/expired-token token wipe in both places) is untouched. |
| F4 tests tab | defer PYQ + current-affairs queries with `InteractionManager.runAfterInteractions`; `isLoading` for a not-yet-started deferred pill reports `true` (skeleton) | a disabled TanStack query reports `isLoading === false`, which would flash the "No Papers Found" empty state for a fast tap — that would be a visible change. Reporting the pre-existing loading state keeps the same skeleton→data transition. |
| F5 profile | `placeholderData` from the auth-context user (not `initialData`) | `initialData` counts as fresh data (`dataUpdatedAt`) and would *skip* the background revalidation for `staleTime`; `placeholderData` keeps the exact same revalidation behaviour while the screen paints immediately |
| F8 caching | only add public `Cache-Control` where the JSON is provably viewer-independent (`/api/v1/career-tracks`). `home`, `me`, `sessions`, `courses` (has `isEnrolled`), `pyq/papers` (`isLockedForGuest`, `previewCount`, `fileUrl`), `exam-series` (per-viewer access) stay `private` | task requirement; `current-affairs`, `pyq/exams`, `tutorials`, `config` already send public headers |
| F9 splash | see REPORT (lossless-only constraint) | |

## Pre-existing conditions found before any edit (baseline, not caused by this run)

- root `npx tsc --noEmit`: 0 errors; `apps/mobile` `npx tsc --noEmit`: 0 errors
- root `next lint`: 0 errors, 2 pre-existing `no-img-element` warnings
- `apps/mobile` jest: 3 failed / 339 passed / 342 tests before any change
  (`[matrix] (b) every required state …`; `(tabs)/home renders daily prep hub …`
  expects a stale `Change →` label; `settings renders settings header …`)
