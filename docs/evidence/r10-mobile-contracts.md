# R10-4 — Mobile contract conflicts (owner decision required)

**Worktree:** `/Users/praveenkumar/ws-launch`
**Branch:** `feat/launch-blockers`
**Evidence:** `docs/evidence/raw/r10-3-mobile-tests-<sha>.txt`
**Command:** `cd apps/mobile && env -i ... CI=true npx tsx --test --test-force-exit --test-concurrency=1 tests/*.test.ts`

Per R10-4 no test file was edited. The failures below are **contract conflicts**
between the tests and the product code, not regressions in the restored
`cbt-sync` code. All three test files are byte-identical to
`r7e-green-2026-10-31` (verified by blob hash).

## Result at the R10-3 commit

```
# tests 267
# pass 263
# fail 4
# cancelled 0
```

Three failing suites / four failing subtests:

| # | Suite | Subtest | State at `r7e` | Cause |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `tests/account-and-search.test.ts` (Phase 7) | `profile and settings include session revocation and account deletion safeguards` | **already failing** | asserts `settings.tsx` contains the literal `deleteMe` |
| 2 | `tests/fake-data-scan.test.ts` (T9) | `app.config.ts has no hardcoded IP or localhost fallbacks` | **already failing** | asserts `app.config.ts` never contains `localhost` |
| 3 | `tests/alert-allowlist.test.ts` (T6) | both subtests | **already failing** | R10-3 restored the "Request submitted" `Alert.alert`; T6 allows exactly 8 button dialogs and forbids a button-less alert |

> Note: before R10-3, the T6 failure was masked because commit `6c1bce7`
> (R9-S1) had deleted the "Request submitted" confirmation. R10-3 deliberately
> restored it (the task forbids removing user-facing confirmations to satisfy
> tooling), so T6 is red again exactly as it was at `r7e`.

## 1. Phase 7 — `settings.tsx` must contain `deleteMe`

`apps/mobile/tests/account-and-search.test.ts:90-94`:

```ts
assert.equal(
  settingsContent.includes("deleteMe"),
  true,
  "Settings screen must support permanent account deletion"
);
```

- At `r7e`: `git show r7e-green-2026-10-31:apps/mobile/src/app/settings.tsx | grep -c deleteMe` = **0**.
- At HEAD: **0**. The G2/`20ff805` product change replaced the immediate
  `DELETE /api/v1/me` (`deleteMe`) with the queue-backed
  `POST /api/v1/data-deletion` request flow, which is the Play-Store-compliant
  contract and is covered by `tests/data-deletion-flow.test.ts` and
  `tests/data-deletion-module.test.ts`.
- **Conflict:** the G2 product contract (request, then admin processing) and the
  Phase 7 assertion (must call `deleteMe`) cannot both hold.

**Owner options**
1. Keep the G2 request flow and update the Phase 7 assertion to look for the
   deletion-request contract instead of `deleteMe` (test change, owner only).
2. Re-introduce a direct `deleteMe` call (would reverse G2 and the statutory
   deletion procedure).

**Executor recommendation:** option 1.

## 2. T9 — `app.config.ts` must not contain `localhost`

`apps/mobile/tests/fake-data-scan.test.ts:117-123`:

```ts
assert.ok(!content.includes("localhost"), "app.config.ts must not contain localhost fallback");
```

- At `r7e`: `git show r7e-green-2026-10-31:apps/mobile/app.config.ts | grep -c localhost` = **2**.
- At HEAD: **2**, both inside the B11 release guard:
  - the error message `"... Insecure HTTP or localhost is strictly disallowed."`
  - the rejection regex `/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i`
- **Conflict:** B11 requires the guard to *reject* localhost, so the word
  `localhost` must appear in the guard; T9 forbids the word anywhere in the file.
  `app.config.ts` has no actual localhost fallback (`EXPO_PUBLIC_API_URL`
  defaults to empty/derived, never `http://localhost`).

**Owner options**
1. Narrow the T9 assertion to reject localhost **fallback assignments** rather
   than the word inside the release guard (test change, owner only).
2. Move the rejection regex/message into a helper module so `app.config.ts`
   itself contains no `localhost` literal (product change; T9 would then scan
   only `src/` and miss the helper, so the test would need to include it).

**Executor recommendation:** option 1.

## 3. T6 — Alert allow-list vs the restored success confirmation

`apps/mobile/tests/alert-allowlist.test.ts`:

- `assert.equal(totalAlertCount, 8, "Expected exactly 8 approved 2-button confirmations")`
- every `Alert.alert` must have a literal array of `>= 2` buttons.

R10-3 restored (from `r7e`) the user-facing success confirmation in
`apps/mobile/src/app/settings.tsx`:

```ts
Alert.alert(
  "Request submitted",
  "Your account deletion request has been received. You can track its status in Settings > Security."
);
```

- With the confirmation: **9** `Alert.alert` calls; the success one has 0 buttons.
  T6 fails with `Expected exactly 8 approved 2-button confirmations, found 9` and
  `Alert.alert without a literal array of >=2 buttons`.
- Without the confirmation (R9-S1 `6c1bce7`): T6 passes, but the user gets no
  confirmation. R10-3 explicitly forbids that trade-off.

**Owner options**
1. Approve a 9th allow-list entry **and** decide the success-alert shape:
   a non-blocking 2-button alert (`OK`, `Track in Settings`) + update the exact
   count from 8 to 9 (test change, owner only), or
2. Keep the confirmation but render it as an inline success banner/toast instead
   of `Alert.alert` (no test change; deviates from R10-3's literal wording, but
   keeps T6 green and still shows the confirmation), or
3. Keep R10-3 exactly as written and accept T6 red until the guard is revised.

**Executor recommendation:** option 2 if the owner wants a green suite without
touching the guard; option 1 if `Alert.alert` is a hard product requirement.

## What the executor did

- Did **not** edit any of the three test files or any assertion.
- Did **not** edit the T6 allow-list.
- Restored the R10-3 confirmation as instructed and recorded the resulting T6
  conflict here.

## Note on `cbt-sync`

The R9-S1 restore of `cbt-sync` is not implicated: the mobile suite's
`cbt-*` tests all pass, and the three failures above are static source-content
assertions that were already red at `r7e` (T6 was red at `r7e` because the
confirmation existed then too).
