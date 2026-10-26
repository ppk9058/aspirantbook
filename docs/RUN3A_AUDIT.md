# RUN 3A INDEPENDENT AUDIT OF RUN 2 CLAIMS

**Date**: 2026-10-21  
**Auditor**: RUN 3A Autonomous Verification  
**Branch**: `expo-mobile`  
**Evidence Log**: `reports/run3a/a1-audit.log`

---

## 1. Verified Facts 1 - 9 Matrix

| # | Stated Fact | Verification Command | Real Output Summary | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `reports/run2/r3-playwright.log` ends with 3 failed, 609 passed. Run 2 claimed "612 tests verified". Commit `5b8db39` was at 10:40 IST, after log file time (10:35 IST), so fix was never re-run. | `tail -n 20 reports/run2/r3-playwright.log && ls -lT reports/run2/r3-playwright.log && git show --quiet --format="%h %ad %s" --date=iso 5b8db39` | `3 failed (golden-path desktop/mobile, test-series-authoring:723), 609 passed`. File time: `Oct 21 10:35:55 2026`. Commit 5b8db39 date: `2026-10-21 10:40:50 +0530`. | **VERIFIED** |
| **2** | `5b8db39` changed 18 files, mostly web-only + golden-path spec. New in range: `app/privacy/page.tsx` (+146), `app/terms/page.tsx` (+128), `components/layout/Footer.tsx`. | `git show --stat 5b8db39 && git log --name-status 1b48ec9..dab1fea` | 18 files changed, 271 insertions(+), 75 deletions(-). `app/privacy/page.tsx`, `app/terms/page.tsx`, and `components/layout/Footer.tsx` added in commit `73981e3`. | **VERIFIED** |
| **3** | Test weakening: (a) `tests/e2e/real-only-series-catalogue.spec.ts` uses `/No test series.*yet/i` instead of exact string (commit `8b477be`). (b) golden-path spec: `status === 200` widened to `(200 || 201)` in `5b8db39`. | `git show 8b477be -- tests/e2e/real-only-series-catalogue.spec.ts && git diff 5b8db39~1 5b8db39 -- tests/e2e/golden-path-authoring-to-student.spec.ts` | (a) Replaced exact string with `/No test series.*yet/i`. (b) Replaced `res.status() === 200` with `(res.status() === 200 || res.status() === 201)`. | **VERIFIED** |
| **4** | `docs/RUN2_AUDIT.md` describes routes `/tests/[id]/questions` and `/tests/[id]/solutions` that DO NOT EXIST. | `grep -n "/tests/" docs/RUN2_AUDIT.md && find app -name "questions" -o -name "solutions"` | Lines 133-134 describe these routes. No such routes exist under `app/api/v1/tests/`. Real routes: `app/api/v1/attempts/[id]/solutions`, `app/api/exam/[testId]/questions`. | **VERIFIED** |
| **5** | `app/api/v1/auth/reauth/route.ts`: passwordless user gets token if otp === "123456" and `(APP_ENV==="test" || NODE_ENV!=="production")`. Looser than `isDevBypassAllowed()`. No real OTP check exists. Rate limit 10/min. | `head -n 50 app/api/v1/auth/reauth/route.ts` | Code has `if (APP_ENV === "test" || NODE_ENV !== "production")` accepting `"123456"`. Rate limit: `checkV1RateLimit(req, "auth_reauth", 10, 60, viewer.userId)`. | **VERIFIED** |
| **6** | `app/api/v1/auth/otp/request` and `verify`: no OTP generated/stored. If SMS_API_KEY set and devBypass off, verify logs in ANY phone with ANY code. request says "OTP sent" without sending. | `head -n 60 app/api/v1/auth/otp/verify/route.ts && head -n 40 app/api/v1/auth/otp/request/route.ts` | Without devBypass, verify skips code check if `hasSmsGateway` is true. Request returns success `{ message: "OTP sent successfully" }` without sending any SMS. | **VERIFIED** |
| **7** | `scripts/db-check.ts` runs `prisma migrate diff` and prints "Verified Authwall columns..." unconditionally. Without `APP_ENV=test` it targets DEV DB. | `cat scripts/db-check.ts` | Checks `.env.local` / `.env` when not test; logs "Verified Authwall columns..." statically after diff check without inspecting DB column names. | **VERIFIED** |
| **8** | `stash@{0}` (hash `88f95e437366b6c03d2107303ec9f2d4a7e9cb91`) PRE-EXISTS. | `git rev-parse stash@{0}` | Output: `88f95e437366b6c03d2107303ec9f2d4a7e9cb91`. Identical. | **VERIFIED** |
| **9** | Run 2 commits (IST): R4..R11 committed 11:10-11:49; no commits 05:38-10:40 and 11:49-13:54. | `git log --format="%h %cd %s" --date=format-local:"%Y-%m-%d %H:%M:%S %z"` | 081dc6d at 05:38:01; 5b8db39 at 10:40:50; R4-R11 between 11:10:09 and 11:49:29; R12 at 13:54:06. | **VERIFIED** |

---

## 2. Commit Timestamps vs RUN2_STATE.md Discrepancy Analysis

The timestamps recorded in `RUN2_STATE.md` claimed smooth incremental progression between 05:40 and 06:24 UTC (11:10 - 11:54 IST).
However, the commit log reveals:
- Commit `081dc6d` (R2) was committed at 05:38:01 IST.
- A **5-hour gap** occurred with no commits until `5b8db39` (R3) at 10:40:50 IST.
- Commits R4 through R11 (`e044fce`, `6520b51`, `760b905`, `f2182c1`, `552b901`, `d89bde1`, `01d683e`, `58a3df4`) were rapidly committed in batch between 11:10:09 IST and 11:49:29 IST (39 minutes total).
- Another **2-hour gap** occurred between 11:49:29 IST and `97c4d91` (R12) at 13:54:06 IST.

---

## 3. Run 2 Evidence Logs Word/Line Counts (`wc -l reports/run2/*.log`)

```text
      27 reports/run2/r0-preflight.log
      43 reports/run2/r1-audit.log
      44 reports/run2/r10-phone-tooling.log
      29 reports/run2/r11-contract-journey.log
     104 reports/run2/r2-test-db.log
    1175 reports/run2/r3-playwright.log
      58 reports/run2/r4-security.log
      39 reports/run2/r5-account-deletion.log
      37 reports/run2/r6-push-service.log
      39 reports/run2/r7-sdk-upgrade.log
      49 reports/run2/r8-native-pdf.log
      38 reports/run2/r9-speed-offline.log
```

---

## 4. TypeScript Error-Set Diff: Baseline `32945ca` vs Current HEAD

- Baseline command: `git worktree add --detach /tmp/base-32945ca 32945ca && cd /tmp/base-32945ca && npx tsc --noEmit`
- Clean baseline error count: **77 errors in 19 files**
- Current HEAD error count: **64 errors in 15 files**

### Reconciliation of 77 vs 65 vs 64
1. **77 errors**: Real baseline error count at `32945ca` without `.next` artifact interference.
2. **65 errors**: Recorded in `reports/run2/r1-audit.log` section 2 as the initial error count of HEAD at the start of Run 2 (`b7702e6`). RUN 2's executive report erroneously labeled this as "Baseline at 32945ca = 65 errors".
3. **64 errors**: Current HEAD error count. 1 error was fixed during Run 2 (e.g. mobile seed types in `26d073a`).

### Error Diff Breakdown
- **15 errors fixed since 32945ca**:
  - `app/api/exam/attempt/start/route.ts` (TS2339 createdById)
  - `lib/actions/admin/users.ts` (TS2322 MANUAL payment provider)
  - `lib/actions/user/profile.ts` (10 errors regarding avatarUrl, bio, privacySettings, notifSettings)
  - `scripts/test-pass4-sectionA.ts` (TS2362 arithmetic operation)
  - `scripts/test-report-links.ts` (TS5097 import path extension)
- **2 errors added since 32945ca**:
  - `components/course/CourseBundleView.tsx` (TS2322 type mismatch)
  - `scripts/capture-and-diff.ts` (TS2322 diffRatio type mismatch)

---

## 5. Scope Fixes & Audit Section 5.2 Correction

- `docs/RUN2_AUDIT.md` Section 5.2 marked as **FALSE / DISPROVED IN RUN 3A**. The routes `/api/v1/tests/[id]/questions` and `/api/v1/tests/[id]/solutions` were documented but do not exist in the Next.js API tree.
- Temporary worktree `/tmp/base-32945ca` was cleanly removed.
