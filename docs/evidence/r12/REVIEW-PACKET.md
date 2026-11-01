# R12 Review Packet

Date: 2026-11-01
Branch: `feat/launch-blockers`
Final verification clone SHA: `5b4a6069b1586c58a5bae45ccfbc9e43c4fd9648`
R12-Z evidence commit: `df21eb2`
Local tag: `r12-partial-2026-11-01` pointing to `df21eb2`

## Summary

R12 is **PARTIAL**, not ready. R12-M and retro-verification are complete, and the final fresh-clone CP2 suite passes 558/558 tests in each of five runs. R12-Z is BLOCKED because a local `next start` production server refuses the isolated local database under the R12-B production boot guard; staging smoke consequently exits 1. The ready tag was not created. Mobile still has four assertion-failing subtests across three files plus one hanging file, so the partial tag is required independently of CP2.

No mobile test or product source was edited. No assertions were removed. No push, branch switch, merge, rebase, reset, stash, or worktree deletion was performed.

## Per-step status and evidence

| Step | Status | Step SHA | Tests added | Fail-before | Pass-after / verification | EXIT evidence |
|---|---|---:|---:|---|---|---|
| R12-0 | DONE | `6a25e53` | — | — | Read-only audit | Audit completed; V1 later corrected its large-file count |
| R12-B | DONE | `3968743` | 9 | 5× EXIT:1 | 5× EXIT:0 | `r12-b-*.txt` |
| R12-A | DONE | `38a85ce` | 10 | 5× EXIT:1 | 5× EXIT:0 | `r12-a-*.txt` |
| R12-C | DONE | `0cc72dc` | 14 | 5× EXIT:1 | 5× EXIT:0 | `r12-c-*.txt` |
| R12-L | DONE | `1576dd7` | 11 | 5× EXIT:1 | 5× EXIT:0 | `r12-l-*.txt` |
| R12-K | DONE | `f042eff` | 7 | 5× EXIT:1 | 5× EXIT:0 | `r12-k-*.txt` |
| R12-D | DONE | `ff1beac` | 5 | 5× EXIT:1 | 5× EXIT:0; local smoke 10/10 | `r12-d-*.txt`, `staging-smoke-local.txt` |
| R12-F | DONE | `ea5b528` | 6 | 5× EXIT:1 | 5× EXIT:0 | `r12-f-*.txt` |
| R12-G | DONE | `e074809` | 5 | 5× EXIT:1 | 5× EXIT:0; restore 75/75 tables | `r12-g-*.txt` |
| R12-E | DONE | `6a90c28` | **9 total**: 8 Sentry + 1 env-example | 5× EXIT:1 | Focused Sentry suite 5× EXIT:0; ninth test passes CP1/CP2 | `r12-e-*.txt`, `r12-h-unit-suite-*.txt`, `r12-z-unit-suite-final-*.txt` |
| R12-H | DONE | `a7f9228` | 0 | — | CP1 549/549, 5× EXIT:0; tsc/lint/build EXIT:0 | `r12-h-*.txt` |
| R12-I | DONE | `6839cdb` | 5 | 5× EXIT:1 | 5× EXIT:0 | `r12-i-*.txt` |
| R12-J | DONE | `2b7ea6d` | 4 | **5× EXIT:1 demonstrated by V2**, two expected failures each | 5× EXIT:0 | `r12-j-*.txt`, `r12-v2-j-fail-before-*.txt` |
| R12-M | DONE | `49e9d70` | 0 | — | 38 mobile files documented; release check and mobile tsc EXIT:0 | `r12-m-*.txt` |
| R12-V | DONE | `78daac8` | 0 | J fail-before established | V1/V2/V3 reconciled | `r12-v*.txt`, CP2 logs |
| R12-Z | **BLOCKED** | `df21eb2` | 0 | Initial environment attempts retained | Final CP2 558/558, 5× EXIT:0; all other clone checks EXIT:0 except smoke | Local production smoke EXIT:1; see Z detail |

## R12-M mobile per-file results

Command per file: 90-second process alarm, `tsx --test --test-timeout=60000 <file>`. Run SHA: `ca747bd01c90a93797bdda5251e3bb2818319d9d`. Raw log: `docs/evidence/raw/r12-m-mobile-tests.txt`.

| File | Result | Exit |
|---|---|---:|
| account-and-search.test.ts | FAIL | 1 |
| account-deletion-flow.test.ts | PASS | 0 |
| alert-allowlist.test.ts | FAIL | 1 |
| api-dynamic-base.test.ts | PASS | 0 |
| api-url-precedence.test.ts | PASS | 0 |
| auth-error-text.test.ts | PASS | 0 |
| auth-flow.test.ts | PASS | 0 |
| auth-logout-cache.test.ts | **HANGING** (60-second `testTimeoutFailure`) | 1 |
| cbt-engine.test.ts | PASS | 0 |
| cbt-persistence.test.ts | PASS | 0 |
| cbt-selection.test.ts | PASS | 0 |
| cbt-sqlite-durability.test.ts | PASS | 0 |
| cbt-submit-guards.test.ts | PASS | 0 |
| check-release-config.test.ts | PASS | 0 |
| courses-and-home.test.ts | PASS | 0 |
| courses-ux-polish.test.ts | PASS | 0 |
| data-deletion-module.test.ts | PASS | 0 |
| exam-access-ui.test.ts | PASS | 0 |
| fake-data-scan.test.ts | FAIL | 1 |
| guest-and-goal-parity.test.ts | PASS | 0 |
| math-corpus.test.ts | PASS | 0 |
| math-renderer.test.ts | PASS | 0 |
| offline-hardening.test.ts | PASS | 0 |
| pdf-manager.test.ts | PASS | 0 |
| pdf-offline-caching.test.ts | PASS | 0 |
| push-notifications-flow.test.ts | PASS | 0 |
| pyq-and-ca.test.ts | PASS | 0 |
| query-keys.test.ts | PASS | 0 |
| reader-storage.test.ts | PASS | 0 |
| reliability-offline.test.ts | PASS | 0 |
| route-manifest-mutation.test.ts | PASS | 0 |
| search-filters.test.ts | PASS | 0 |
| shell-and-navigation.test.ts | PASS | 0 |
| sqlite-adapter-contract.test.ts | PASS | 0 |
| test-series-flow.test.ts | PASS | 0 |
| theme-and-tokens.test.ts | PASS | 0 |
| video-player.test.ts | PASS | 0 |
| web-links.test.ts | PASS | 0 |

Total: **34 PASS, 3 assertion-FAIL files, 1 HANGING file**.

### Four assertion failures and the hang

1. `account-and-search.test.ts`: Settings no longer contains direct `deleteMe`; it uses `submitMobileDeletionRequest`.
2. `alert-allowlist.test.ts`, count subtest: the test really asserts both `totalAlertCount <= 12` **and** `totalAlertCount === 8`. The first passes at 9; the second fails. The allow-list has 8 entries while the source has 9 alerts.
3. `alert-allowlist.test.ts`, literal-buttons subtest: the informational `Request submitted` alert in Settings has no buttons, conflicting with the test's rule that every alert is a confirmation with a literal array of at least two buttons.
4. **Fourth failing item:** `fake-data-scan.test.ts`, subtest `app.config.ts has no hardcoded IP or localhost fallbacks`. Raw source contains `localhost` in a production-guard error message, not in a fallback URL.

`auth-logout-cache.test.ts` is a hang, not an assertion failure: all four named subtests pass, then the file-level test times out and one test is cancelled. The proposed hypothesis is uncleared TanStack Query GC timers, including the main client's one-hour `gcTime` and additional `newClient` instances. The memory adapter makes SQLite unlikely in this file. This is not proven by a handle dump; no test/module edits were allowed.

Exact minimal test-only proposals are in `docs/evidence/r12-mobile-test-proposals.md`. The Play data-safety document is `docs/play-store/data-safety-draft.md`, explicitly marked DRAFT.

### M configuration checks

- `check:release`: EXIT:0.
- EAS development, preview, and production profiles exist; production API URL comes from the EAS environment and runtime guards require HTTPS and reject local hosts. No config edit was needed.
- Mobile `tsc --noEmit`: EXIT:0 in both the worktree and fresh clone.
- `git diff 6b04751..HEAD --stat -- apps/mobile`: only `apps/mobile/package-lock.json`; no mobile test files changed.

## Retro-verification V1–V3

### V1 — large files

The original R12-0 claim `0 files >1MB` was wrong. A dated correction was appended to `docs/evidence/r12-audit.md` without rewriting the original row.

- `docs/design_walkthrough.pdf`: 12,041,186 bytes.
- `assets/brand/splash-image.png`: 1,094,558 bytes.

The R12-I inventory already had both files and was correct. Inventory log EXIT:0. No tracked `.gitattributes` was found. `git lfs` is unavailable (EXIT:1), so LFS object enumeration could not be performed.

### V2 — J fail-before

Created `/tmp/j-before` from `2b7ea6d^` using `git archive`, copied only `tests/unit/secret-hygiene.test.ts` from HEAD, and ran it five times in a clean environment against the disposable 54329 test database.

- Each run: EXIT:1.
- Each run: 4 tests, 2 pass, 2 fail.
- Expected failing assertions: missing gitleaks CI job and literal webhook fallback.
- Summary verification log: `r12-v2-j-fail-before-summary.txt`, EXIT:0 (all five expected failures reproduced).

J now has demonstrated fail-before evidence; it is not marked `not demonstrated`.

### V3 — test-count arithmetic

Handoff arithmetic: 473 baseline + 84 listed new tests = 557. Actual CP2 TAP count: **558 tests, 128 suites**.

The one-test difference is explained by R12-E: its focused log contains 8 Sentry tests, but the same commit also adds `Sentry error monitoring variables are documented in .env.example as OPTIONAL` to `env-example-completeness.test.ts`. Thus 473 + 84 + 1 omitted env test = **558**. CP1 independently supports this: 473 + 76 through E = 549; adding I's 5 and J's 4 gives 558. No number was adjusted to fit.

## R12-Z fresh-clone verification

Fresh local clone: `/tmp/r12z-5b4a606`, at SHA `5b4a6069b1586c58a5bae45ccfbc9e43c4fd9648`.

| Check | Result | Evidence |
|---|---|---|
| Local clone | EXIT:0 | `r12-z-clone.txt` |
| Web `npm ci` | EXIT:0 | `r12-z-npm-ci.txt` |
| Web `tsc --noEmit` | EXIT:0 | `r12-z-web-tsc.txt` |
| Web lint | EXIT:0; existing warnings only | `r12-z-lint.txt` |
| Web production build | EXIT:0; `Generating static pages (162/162)` | `r12-z-build.txt` |
| Mobile `npm ci` | EXIT:0 | `r12-z-mobile-npm-ci.txt` |
| Mobile `tsc --noEmit` | EXIT:0 | `r12-z-mobile-tsc.txt` |
| Initial CP2 environment | 5× EXIT:1; 558 discovered; APP_ENV unset and DB credential mismatch | `r12-z-unit-suite-[1-5].txt` |
| Compose-DSN CP2 attempt | 5× EXIT:1; 557/558; sole NextAuth MissingSecret failure | `r12-z-unit-suite-compose-[1-5].txt` |
| Final CP2 with APP_ENV and dummy test-only AUTH_SECRET | **5× EXIT:0; 558/558 pass, 0 fail, 0 cancelled each** | `r12-z-unit-suite-final-[1-5].txt` |
| Removed-assertion check | Empty diff output; check EXIT:0 | `r12-z-removed-assertions.txt` |
| Local production smoke | **EXIT:1, BLOCKED** | `r12-z-staging-smoke.txt` |

Clean-env deviations were required and are recorded here: `APP_ENV=test` was added because database guards require it; the Compose-defined disposable test DSN was used because `docker-compose.test.yml` and AGENT-POLICY specify different test passwords; a dummy test-only `AUTH_SECRET` was added because NextAuth fails closed without it. No `.env` file was read and no real secret was used.

### Why Z is blocked

Two local production-server attempts were made. `next start` forces production behavior, and instrumentation rejects a local `DATABASE_URL` even when `APP_ENV=test` is supplied. The second attempt used the production build with the isolated test environment and hit the same guard. Per the two-attempt limit, no bypass or guard edit was attempted. Both server logs end with the recorded termination code; the smoke run against the failed server reports 10 failed checks and EXIT:1. Owner should run the same smoke script against staging or provide a production-safe remote test database.

## Removed assertions

Command:

`git diff 6b04751..HEAD -- tests apps/mobile/tests | grep -E '^-' | grep -E 'assert|expect|it\(|test\('`

Diff output (empty):

```text
```

The evidence log contains only `EXIT:0`. New test files are present, but no removed assertion/test lines matched.

## Dependencies and npm audit

Changes since `6b04751`:

- Added `@sentry/nextjs` **11.10.0**.
- Added `brace-expansion` override **^1.1.21**.
- Pinned existing `next-auth` to exact **5.0.0-beta.32** (not a new dependency).
- Root and mobile lockfiles received non-breaking audit-fix updates; mobile `package.json` was unchanged.

Raw `r12-h-audit-summary.txt` counts:

| Workspace | Before | After |
|---|---|---|
| root | 32 total: 1 low, 10 moderate, 21 high | 30 total: 1 low, 21 moderate, 8 high |
| packages/shared | 1 high | 1 high; non-breaking fix unavailable |
| apps/mobile | 42 total: 6 low, 30 moderate, 6 high | 41 total: 6 low, 30 moderate, 5 high |

The later H state prose says root 29 total/7 high, but the preserved raw audit summary says 30 total/8 high. This packet follows the raw evidence; the discrepancy is unresolved.

## Uncertainties and owner decisions

1. **Z smoke:** local production smoke remains BLOCKED for the boot-guard reason above; this is why Z is not DONE and the ready tag was not created.
2. **Mobile failures:** four assertion failures and one hang remain. Proposals are documentation only; their fixes have not been applied or verified.
3. **Auth hang:** GC-timer root cause is a hypothesis, not a proven handle diagnosis.
4. **Alert policy:** owner must decide whether the single no-button informational success alert is an approved exception; do not broadly weaken confirmation checks.
5. **Deletion UX:** Settings uses queue-backed deletion while Profile exposes direct `deleteMe`. Owner must reconcile production behavior and retention disclosures.
6. **Data safety:** the Play document is a DRAFT; owner must verify vendor sharing, encryption, retention, actual production fields, and account-deletion behavior before submission. No store action was taken.
7. **EAS:** static config and release checks passed; no EAS build or store submission was performed.
8. **LFS:** CLI enumeration was unavailable; only the absence of tracked `.gitattributes` and normal file inventory were verified.
9. **Audit counts:** raw H audit totals conflict with later H state prose as noted above.
10. **Clean-env documentation:** AGENT-POLICY's test DSN and variable list do not match current Compose/test requirements; owner should align documentation deliberately rather than weakening guards.
11. **Fresh-clone SHA:** the clone predates only subsequent evidence/state commits; no product or test source changed after that SHA.
12. `data/form-submissions.json` was pre-existing untracked data and was left untouched and uncommitted.
