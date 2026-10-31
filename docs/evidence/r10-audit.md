# R10-0 — Read-only audit (2026-10-31)

**Worktree:** `/Users/praveenkumar/ws-launch`
**Branch:** `feat/launch-blockers`
**HEAD at audit:** `777fbca89892b9b62482d1391439704a4b20ab49`
**Tags:** `r7e-green-2026-10-31` = `a8b3b4a40de9d340194fcef6a434c08f541c09e2`,
`r9-ready-2026-10-31` = `777fbca89892b9b62482d1391439704a4b20ab49` (== HEAD).

This document is read-only evidence. No source, test or workflow file was changed
before this audit was committed.

---

## 1. `git status`

```
## feat/launch-blockers
?? data/form-submissions.json
```

Only one untracked path: `data/form-submissions.json` (runtime data written by an
older `PERSIST_BACKEND=fs` run). It is **not** tracked and will not be committed.

## 2. Commit count since `r7e-green-2026-10-31`

`git rev-list --count r7e-green-2026-10-31..HEAD` = **10** commits.

| # | SHA | Subject |
| :-- | :-- | :-- |
| 1 | `baba31a` | R9-S0: record read-only preflight inventory and documented 10-minute gate override |
| 2 | `6c1bce7` | R9-S1: restore cbt-sync queue API lost in 700e4ad and fix mobile typecheck |
| 3 | `186af4b` | R9-S2: production PERSIST_BACKEND guard, instrumentation boot check, single dev-bypass policy |
| 4 | `53f75b3` | R9-S2: record 5x test logs, B-001 prod smoke, fs refusal and PROGRESS rows S0-S2 |
| 5 | `b61845a` | R9-S3: document CORS decision (no headers) and lock it with a policy test |
| 6 | `0839f38` | R9-S4: read-only container verification, health/B-001 checks and 5x exam flow against the image |
| 7 | `216abf2` | R9-S5: database ops scripts, local backup/restore proof, size report and Neon staging runbook |
| 8 | `e415ae0` | R9-S6: add Render + Cloudflare production hosting runbook |
| 9 | `8171ec4` | R9-S7: CI simulation fixes and push-readiness report |
| 10 | `777fbca` | R9-S7: record final S6/S7 commit SHAs in PROGRESS |

## 3. Removed test / assertion lines since `r7e-green-2026-10-31`

```
git diff --name-status r7e-green-2026-10-31..HEAD -- tests apps/mobile/tests
A tests/unit/boot-guard-wiring.test.ts
A tests/unit/cors-policy.test.ts
A tests/unit/persist-backend-production.test.ts
```

- Files changed: **3, all added** (240 insertions, **0 deletions**).
- `git diff r7e..HEAD -- tests apps/mobile/tests | grep '^-' | grep -E '(assert|expect|it\(|test\()'`
  returned **no matches**.
- `git diff --diff-filter=D r7e..HEAD -- tests apps/mobile/tests` returned nothing.

**Removed `assert` / `expect` / `it(` / `test(` lines: NONE.**
No test was skipped, quarantined, deleted or weakened in R9.

## 4. `apps/mobile/src/app/settings.tsx` — "Request submitted" Alert

**Still missing at HEAD. Confirmed removed by `6c1bce7` (R9-S1).**

`git log -S'Request submitted' -- apps/mobile/src/app/settings.tsx` shows the
string was introduced by `20ff805` (G2/R4) and removed by `6c1bce7`.

Diff `r7e..HEAD`:

```diff
       setDeletionStatus(res.data?.status || "PENDING");
       setDeleteModalVisible(false);
-      Alert.alert(
-        "Request submitted",
-        "Your account deletion request has been received. You can track its status in Settings > Security."
-      );
```

The success path (`handleDeleteAccount`) now closes the modal and sets the status
chip without any user-facing confirmation. **R10-3 applies.**

## 5. `.github/dependabot.yml` and `.gitleaksignore`

| Path | Exists at HEAD | Changed since `r7e` | Notes |
| :-- | :-- | :-- | :-- |
| `.github/dependabot.yml` | **yes** (657 bytes) | **no** | 4 ecosystems (root, `packages/shared`, `apps/mobile`, docker); weekly; `open-pull-requests-limit: 5`; **no** `ignore` rules, **no** `groups`, **no** semver-major policy. |
| `.gitleaksignore` | **no** | n/a | Never existed in any commit (`git log --all -- .gitleaksignore` empty). |

**R10-5 applies** (dependabot config is below the required policy) and
**R10-6 applies** (`.gitleaksignore` absent).

## 6. Hardcoded secret-like literals in `scripts/` and `tests/e2e/`

Scan pattern: `(AUTH_SECRET|NEXTAUTH_SECRET|RAZORPAY_KEY_SECRET|RAZORPAY_KEY_ID|WEBHOOK_SECRET|SECRET)`
immediately assigned a quoted literal. Only **file names and counts** are recorded
here; no value was printed.

- Matching files: **40 total** — **39** under `scripts/`, **1** under `tests/e2e/`
  (`tests/e2e/razorpay-webhook-idempotency.spec.ts`).
- Files (names only):

```
scripts/test-part-a-b1-repro.ts
scripts/test-pass9-real-payment-path.ts
scripts/start-test-server-3045.sh
scripts/pass10_5/test_part_a.ts
scripts/pass10_5/test_part_e.ts
scripts/pass10_5/test_part_c.ts
scripts/pass10_5/test_part_i.ts
scripts/test-cookie-cross-host.ts
scripts/test-p0-2-p0-3-leftovers.ts
scripts/test-step5-complete-http-suite.ts
scripts/run-pass9-qa-matrix.ts
scripts/test-part8-sidebar-dashboard.ts
scripts/measure-connection-limits.ts
scripts/test-part7-dashboard-cta.ts
scripts/test-part2-b1-proof.ts
scripts/test-b3-home-nav.ts
scripts/test-b2-session-ux.ts
scripts/setup-stripe-webhook.sh
scripts/r9-run-container.sh
scripts/test-pass6-webhook.ts
scripts/test-rate-limit-proof.ts
scripts/test-part4-landing-nav-proof.ts
scripts/pass10_8/test_part5.sh
scripts/pass10_8/test_part1.sh
scripts/pass10_8/test_part4.sh
scripts/pass10_8/test_part10.sh
scripts/pass10_8/test_part11.sh
scripts/pass10_8/test_part2.sh
scripts/test-landing-nav-proof.ts
scripts/test-pass10-logout-every-layout.ts
scripts/pass10_7/test_part8.sh
scripts/test-part9-dashboard-links.ts
scripts/test-browser-b1-repro.ts
scripts/test-part-a-regressions.ts
scripts/test-part-a-precise-b1.ts
scripts/test-pass5-section1.ts
scripts/test-part1-redirect-origin.ts
scripts/test-step4-real-http-suite.ts
scripts/test-c1-viewport-user-mismatch.ts
tests/e2e/razorpay-webhook-idempotency.spec.ts
```

- Literal lengths (length only, no values): most `SECRET`/`AUTH_SECRET`/`NEXTAUTH_SECRET`
  literals are **65** characters; a small number are 16, 21, 23, 26, 32, 42, 44, 46,
  47, 50; exactly **one** is **9** (`scripts/setup-stripe-webhook.sh`, and it is
  inside a commented example line).
- No hardcoded secret-like literal is imported by the unit suite: the only
  `scripts/` module imported by `tests/unit/*.test.ts` is `scripts/guard-test-db.ts`,
  which contains none of these literals.

## 7. Test count change 460 → 470 → 473

The web unit suite (`tests/unit/*.test.ts`, `npx tsx --test`) reports these totals:

| Ref | Commit | Tests | Evidence |
| :-- | :-- | --: | :-- |
| `r7e-green-2026-10-31` | `a8b3b4a` (tip `708efb7`) | **460** | `raw/r7d-unit-suite-5x-708efb7.txt` |
| R9-S1 | `6c1bce7` / log at `baba31a` | **460** | `raw/r9-s1-web-unit-1x.txt` (`# tests 460`) |
| R9-S2 | `186af4b` | **470** | +10 from two new files: `persist-backend-production.test.ts` (5 tests) + `boot-guard-wiring.test.ts` (5 tests). `raw/r9-s2-tests-1of5.txt` runs exactly those 10. |
| R9-S3 | `b61845a` | **473** | +3 from `cors-policy.test.ts` (`raw/r9-s3-cors-test.txt`: 3 tests). |
| HEAD | `777fbca` | **473** | `raw/r9-s7-final-gates.txt`, `raw/r9-s7-ci-sim.txt` |

**Note on the PROGRESS claim:** `PROGRESS.md` line 253 says R9-S1 produced
"web unit 470/470". That attribution is a documentation error. S1 changed product
code only (restored `cbt-sync` exports) and added no test files; its own log
`raw/r9-s1-web-unit-1x.txt` records **460**. The +10 landed in S2 (`186af4b`) and
the +3 in S3 (`b61845a`). There is no log anywhere under `docs/evidence/raw/`
containing `# tests 470`; the only 470 arithmetic is 460 + 10. The total 473 is
independently confirmed twice at the tip.

## 8. Local verification-link token from S1 evidence (R10-6 pre-check)

`raw/r9-s7-gitleaks.txt` records one token introduced by R9 at
`docs/evidence/raw/r9-s1-web-unit-1x.txt:3298`: a local `DevEmailOutbox`
verification-link token, hex64, generated against the throwaway
`127.0.0.1` test database, marked **expired**. Names/status only: it is a
test-generated token for a local database, not a live credential; status
**expired / not usable**. No value is reproduced here.

---

## Summary of R10 work items unlocked by this audit

| Item | State | Action |
| :-- | :-- | :-- |
| R10-1 connection-limit URL | still appends `?connection_limit=3` to an already-parameterised URL | fix |
| R10-2 course-metadata seed | CI test job has no seed step after migrations | add seed |
| R10-3 settings Alert | removed in `6c1bce7` | restore |
| R10-4 mobile 2 failures | present at `r7e` too (see below) | investigate / document |
| R10-5 dependabot | exists but no ignores/groups/limit-3 | update |
| R10-6 secrets hygiene | 40 files, `.gitleaksignore` absent | replace + create ignore |

### R10-4 pre-check (both mobile failures pre-exist `r7e`)

`git show r7e-green-2026-10-31:apps/mobile/src/app/settings.tsx | grep -c deleteMe`
= **0**; `git show r7e-green-2026-10-31:apps/mobile/app.config.ts | grep -c localhost`
= **2**. The two test files are unchanged since `r7e`
(`git diff --stat r7e..HEAD` for both = empty). Therefore both mobile failures
are **pre-existing at `r7e-green-2026-10-31`**, not regressions introduced by the
R9 `cbt-sync` restore.
