# RUN 3 AUDIT REPORT: INDEPENDENT VERIFICATION & FACT RECONCILIATION

**Date**: 2026-10-21  
**Auditor**: Run 3B Autonomous Verification  
**Branch**: `expo-mobile`  
**Evidence Log**: [`reports/run3b/a1b-audit.log`](file:///Users/praveenkumar/TrillionSkill/reports/run3b/a1b-audit.log)  

---

## 1. Verified Facts 1 - 9 Matrix (Run 3A / Run 2 Audit)

| # | Stated Fact | Verification Command | Verbatim Output Summary | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `reports/run2/r3-playwright.log` ends with 3 failed, 609 passed. Run 2 claimed "612 tests verified". Commit `5b8db39` was at 10:40 IST, after log file time (10:35 IST), so fix was never re-run. | `tail -n 20 reports/run2/r3-playwright.log && ls -lT reports/run2/r3-playwright.log && git show --quiet --format="%h %ad %s" --date=iso 5b8db39` | `3 failed (golden-path desktop/mobile, test-series-authoring:723), 609 passed`. File timestamp: `Oct 21 10:35:55 2026`. Commit 5b8db39 date: `2026-10-21 10:40:50 +0530`. | **VERIFIED** |
| **2** | `5b8db39` changed 18 files, mostly web-only + golden-path spec. New in range: `app/privacy/page.tsx` (+146), `app/terms/page.tsx` (+128), `components/layout/Footer.tsx`. | `git show --stat 5b8db39 && git log --name-status 1b48ec9..dab1fea` | 18 files changed, 271 insertions(+), 75 deletions(-). `app/privacy/page.tsx`, `app/terms/page.tsx`, and `components/layout/Footer.tsx` added in commit `73981e3`. | **VERIFIED** |
| **3** | Test weakening: (a) `tests/e2e/real-only-series-catalogue.spec.ts` uses `/No test series.*yet/i` instead of exact string (commit `8b477be`). (b) golden-path spec: `status === 200` widened to `(200 \|\| 201)` in `5b8db39`. | `git show 8b477be -- tests/e2e/real-only-series-catalogue.spec.ts && git diff 5b8db39~1 5b8db39 -- tests/e2e/golden-path-authoring-to-student.spec.ts` | (a) Commit 8b477be replaced exact string with regex `/No test series.*yet/i`. (Reverted to exact string in commit 7150198). (b) Commit 5b8db39 replaced `res.status() === 200` with `(res.status() === 200 \|\| res.status() === 201)`. *(See verbatim output in Section 1.1)* | **VERIFIED** |
| **4** | `docs/RUN2_AUDIT.md` describes routes `/tests/[id]/questions` and `/tests/[id]/solutions` that DO NOT EXIST. | `grep -n "/tests/" docs/RUN2_AUDIT.md && find app -name "questions" -o -name "solutions"` | Lines 133-134 describe these routes. No such routes exist under `app/api/v1/tests/`. Real routes: `app/api/v1/attempts/[id]/solutions`, `app/api/exam/[testId]/questions`. | **VERIFIED** |
| **5** | `app/api/v1/auth/reauth/route.ts`: passwordless user got token if otp === "123456" and `(APP_ENV==="test" \|\| NODE_ENV!=="production")`. Looser than `isDevBypassAllowed()`. No real OTP check exists. Rate limit 10/min. | `head -n 50 app/api/v1/auth/reauth/route.ts && git diff b02d0d1~1 b02d0d1 -- app/api/v1/auth/reauth/route.ts` | Code originally used `(APP_ENV === "test" \|\| NODE_ENV !== "production")` and rate limit 10/min. SEC1 (commit `b02d0d1`) tightened to `isDevBypassAllowed()`, 5 per 15 min per `userId:ip`, tied token to `sessionId`, and returns 501 for passwordless when bypass off. *(See verbatim output in Section 1.2)* | **VERIFIED** |
| **6** | `app/api/v1/auth/otp/request` and `verify`: no OTP generated/stored. If SMS_API_KEY set and devBypass off, verify logs in ANY phone with ANY code. request says "OTP sent" without sending. | `head -n 60 app/api/v1/auth/otp/verify/route.ts && head -n 40 app/api/v1/auth/otp/request/route.ts` | Without devBypass, verify skips code check if `hasSmsGateway` is true. Request returns success `{ message: "OTP sent successfully" }` without sending SMS. | **VERIFIED** |
| **7** | `scripts/db-check.ts` runs `prisma migrate diff` and prints "Verified Authwall columns..." unconditionally. Without `APP_ENV=test` it targets DEV DB. | `cat scripts/db-check.ts` | Checks `.env.local` / `.env` when not test; logs "Verified Authwall columns..." statically after diff check without inspecting DB column names. | **VERIFIED** |
| **8** | `stash@{0}` (hash `88f95e437366b6c03d2107303ec9f2d4a7e9cb91`) PRE-EXISTS. | `git rev-parse stash@{0}` | Output: `88f95e437366b6c03d2107303ec9f2d4a7e9cb91`. Identical. | **VERIFIED** |
| **9** | Run 2 commits (IST): R4..R11 committed 11:10-11:49; no commits 05:38-10:40 and 11:49-13:54. | `git log --format="%h %cd %s" --date=format-local:"%Y-%m-%d %H:%M:%S %z"` | 081dc6d at 05:38:01; 5b8db39 at 10:40:50; R4-R11 between 11:10:09 and 11:49:29; R12 at 13:54:06. | **VERIFIED** |

---

### 1.1 Verbatim Output: Row 3 (Test Weakening Proofs)

#### Commit 8b477be (Loosening exact string assertion to regex):
```diff
diff --git a/tests/e2e/real-only-series-catalogue.spec.ts b/tests/e2e/real-only-series-catalogue.spec.ts
index fc146b3..3072adc 100644
--- a/tests/e2e/real-only-series-catalogue.spec.ts
+++ b/tests/e2e/real-only-series-catalogue.spec.ts
@@ -33,7 +33,7 @@ test("guest catalogue renders only published database series", async ({ page })
 
   const catalogueCards = page.getByRole("link", { name: "View Test Series" })
   if (scenario === "empty") {
-    await expect(page.getByText("No test series available yet.", { exact: true })).toBeVisible()
+    await expect(page.getByText(/No test series.*yet/i)).toBeVisible()
     await expect(catalogueCards).toHaveCount(0)
     return
   }
```

#### Commit 7150198 (Reverting loosened regex to exact string):
```diff
diff --git a/tests/e2e/real-only-series-catalogue.spec.ts b/tests/e2e/real-only-series-catalogue.spec.ts
index 3072adc..fc146b3 100644
--- a/tests/e2e/real-only-series-catalogue.spec.ts
+++ b/tests/e2e/real-only-series-catalogue.spec.ts
@@ -33,7 +33,7 @@ test("guest catalogue renders only published database series", async ({ page })
 
   const catalogueCards = page.getByRole("link", { name: "View Test Series" })
   if (scenario === "empty") {
-    await expect(page.getByText(/No test series.*yet/i)).toBeVisible()
+    await expect(page.getByText("No test series available yet.", { exact: true })).toBeVisible()
     await expect(catalogueCards).toHaveCount(0)
     return
   }
```

#### Commit 5b8db39 (Widening status check in Golden Path):
```diff
diff --git a/tests/e2e/golden-path-authoring-to-student.spec.ts b/tests/e2e/golden-path-authoring-to-student.spec.ts
index 3e84609..185d91e 100644
--- a/tests/e2e/golden-path-authoring-to-student.spec.ts
+++ b/tests/e2e/golden-path-authoring-to-student.spec.ts
@@ -182,9 +182,9 @@ test.describe("Golden Path: Authoring to Student CBT Journey (UPSC vs BPSC)", ()
       await loginThroughUi(page, student.email);
 
       // Student starts attempt while intercepting start API response (201 Created or 200 Resumed)
       const startAttemptPromise = page.waitForResponse(
-        (res) => res.url().includes("/api/exam/attempt/start") && res.status() === 200,
+        (res) => res.url().includes("/api/exam/attempt/start") && (res.status() === 200 || res.status() === 201),
         { timeout: 30_000 }
       );
       await page.goto(`/test-series/${series.slug}/attempt?testId=${testRow.id}&lang=English`);
```

---

### 1.2 Verbatim Output: Row 5 (Reauth Route Before & After SEC1 Hardening)

#### `app/api/v1/auth/reauth/route.ts` diff in SEC1 (commit `b02d0d1`):
```diff
diff --git a/app/api/v1/auth/reauth/route.ts b/app/api/v1/auth/reauth/route.ts
index 9a58080..b154322 100644
--- a/app/api/v1/auth/reauth/route.ts
+++ b/app/api/v1/auth/reauth/route.ts
@@ -3,6 +3,8 @@ import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1
 import { getViewer } from "@/lib/api/v1/viewer";
 import { createReauthToken } from "@/lib/api/v1/tokens";
 import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
+import { getClientIp } from "@/lib/rate-limit";
+import { isDevBypassAllowed } from "@/lib/api/v1/dev-bypass";
 import { prisma } from "@/lib/prisma";
 import bcrypt from "bcryptjs";
 
@@ -16,7 +18,9 @@ export async function POST(req: NextRequest) {
       return apiError("UNAUTHORIZED", "Authentication required to request re-auth token", 401, undefined, reqId);
     }
 
-    const rl = await checkV1RateLimit(req, "auth_reauth", 10, 60, viewer.userId);
+    const ip = getClientIp(req);
+    // Tightened rate limit: 5 attempts per 15 min (900 seconds) per user+IP
+    const rl = await checkV1RateLimit(req, "auth_reauth", 5, 900, `${viewer.userId}:${ip}`);
     if (!rl.allowed) return rl.response!;
 
     const body = await req.json().catch(() => ({}));
@@ -41,22 +45,29 @@ export async function POST(req: NextRequest) {
         return apiError("UNAUTHORIZED", "Incorrect password confirmation", 401, undefined, reqId);
       }
     } else {
-      // OTP or OAuth user: require valid OTP code
-      // If dev/test or valid OTP verification:
+      // Passwordless users (OTP or OAuth):
+      if (!isDevBypassAllowed()) {
+        return apiError(
+          "REAUTH_UNAVAILABLE",
+          "Automated re-authentication is not available for passwordless accounts without SMS. Please contact support to request account deletion.",
+          501,
+          undefined,
+          reqId
+        );
+      }
+
       const otpCode = body.otp;
       if (!otpCode || typeof otpCode !== "string") {
         return apiError("UNAUTHORIZED", "Valid OTP verification required for passwordless re-authentication", 401, undefined, reqId);
       }
-      // Verify OTP in DB if not test bypass
-      if ((process.env.APP_ENV === "test" || process.env.NODE_ENV !== "production") && otpCode === "123456") {
-        // Valid test OTP
-      } else {
-        // In production without SMS gateway, OTP re-auth is unavailable; require password
+
+      if (otpCode !== "123456") {
         return apiError("UNAUTHORIZED", "Invalid verification code", 401, undefined, reqId);
       }
     }
 
-    const reauthToken = await createReauthToken(user.id, purpose, "5m");
+    // Issue purpose-bound token tied to user and current session, <= 5 min expiry
+    const reauthToken = await createReauthToken(user.id, purpose, "5m", viewer.sessionId);
 
     return apiSuccess(
       {
```

---

## 2. Original Facts 5, 6, 9, 10, 11, 12, 15 Matrix

| # | Stated Claim / Topic | Verification Command | Verbatim Output | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Fact 5** | 39 v1 routes exist; 24 covered in tests | `find app/api/v1 -name route.ts \| wc -l` | `39` routes confirmed. Python regex scan of `tests/` found 33 routes covered, 6 routes uncovered (`/api/v1/auth/forgot-password`, `/api/v1/auth/google`, `/api/v1/auth/logout-all`, `/api/v1/auth/reset-password`, `/api/v1/notifications/read`, `/api/v1/tutorials/[slug]/lessons/[id]/progress`). In Run 2 only 24 were covered. | **VERIFIED** |
| **Fact 6** | Two conflicting push services in codebase | `find lib/services -name "*push*" \| sort` | `lib/services/push-dispatcher.service.ts`<br>`lib/services/push.service.ts` | **VERIFIED** |
| **Fact 9** | `react-native-pdf` library integration | `grep -rn "react-native-pdf" apps/mobile/package.json apps/mobile/src/components/common/PdfRenderer.tsx` | `apps/mobile/package.json:38: "react-native-pdf": "7.0.5"`<br>`apps/mobile/src/components/common/PdfRenderer.tsx:38: const mod = await import("react-native-pdf").catch(() => null);` | **VERIFIED** |
| **Fact 10** | Expo dist-tags and SDK 55 attempt | `npm view expo dist-tags` | `sdk-52: 52.0.49`, `sdk-53: 53.0.27`, `sdk-54: 54.0.37`, `sdk-55: 55.0.31`, `sdk-56: 56.0.24`, `sdk-57: 57.0.31`, `latest: 58.0.16` | **VERIFIED** |
| **Fact 11** | Cleartext HTTP configured in mobile app | `grep -rn "usesCleartextTraffic" apps/mobile/` | *(Exit 1: No match)*. Neither `apps/mobile/app.config.ts` nor `app.json` configures `usesCleartextTraffic`. | **FALSE** |
| **Fact 12** | `EXPO_PUBLIC_API_URL` configuration | `grep -rn "EXPO_PUBLIC_API_URL" apps/mobile/app.config.ts apps/mobile/src/lib/api.ts` | `app.config.ts: process.env.EXPO_PUBLIC_API_URL \|\| "http://10.0.2.2:3045"`<br>`src/lib/api.ts: process.env.EXPO_PUBLIC_API_URL \|\| "http://10.0.2.2:3045"` | **VERIFIED** |
| **Fact 15** | Native-memory benchmark on 150-page document | `grep -rn "handles 150-page document navigation" reports/run2/r8-native-pdf.log` | `✔ handles 150-page document navigation without memory state leakage or unbounded growth (0.643834ms)` | **FALSE / OVER-CLAIMED** (0.64ms Node/Jest mocked state test, NOT a native Android/iOS memory benchmark). |

---

## 3. Full 39 v1 Route Inventory

Command: `find app/api/v1 -name route.ts | sort`

```text
 1. app/api/v1/attempts/[id]/answers/route.ts
 2. app/api/v1/attempts/[id]/result/route.ts
 3. app/api/v1/attempts/[id]/route.ts
 4. app/api/v1/attempts/[id]/solutions/route.ts
 5. app/api/v1/attempts/[id]/submit/route.ts
 6. app/api/v1/auth/forgot-password/route.ts (UNCOVERED)
 7. app/api/v1/auth/google/route.ts (UNCOVERED)
 8. app/api/v1/auth/login/route.ts
 9. app/api/v1/auth/logout-all/route.ts (UNCOVERED)
10. app/api/v1/auth/logout/route.ts
11. app/api/v1/auth/otp/request/route.ts
12. app/api/v1/auth/otp/verify/route.ts
13. app/api/v1/auth/reauth/route.ts
14. app/api/v1/auth/refresh/route.ts
15. app/api/v1/auth/register/route.ts
16. app/api/v1/auth/reset-password/route.ts (UNCOVERED)
17. app/api/v1/auth/sessions/[id]/route.ts
18. app/api/v1/auth/sessions/route.ts
19. app/api/v1/config/route.ts
20. app/api/v1/current-affairs/[slug]/route.ts
21. app/api/v1/current-affairs/route.ts
22. app/api/v1/devices/route.ts
23. app/api/v1/goals/route.ts
24. app/api/v1/home/route.ts
25. app/api/v1/library/[id]/file/route.ts
26. app/api/v1/library/route.ts
27. app/api/v1/me/route.ts
28. app/api/v1/notifications/read/route.ts (UNCOVERED)
29. app/api/v1/notifications/route.ts
30. app/api/v1/openapi.json/route.ts
31. app/api/v1/pyq/exams/route.ts
32. app/api/v1/pyq/papers/[id]/route.ts
33. app/api/v1/tests/[id]/attempts/route.ts
34. app/api/v1/tests/[id]/route.ts
35. app/api/v1/tests/route.ts
36. app/api/v1/tutorials/[slug]/lessons/[id]/progress/route.ts (UNCOVERED)
37. app/api/v1/tutorials/[slug]/lessons/[id]/route.ts
38. app/api/v1/tutorials/[slug]/route.ts
39. app/api/v1/tutorials/route.ts
```

---

## 4. Expo Dist-Tags Official Snapshot

Command: `npm view expo dist-tags`
```json
{
  "sdk-52": "52.0.49",
  "sdk-53": "53.0.27",
  "canary-sdk-55": "55.0.3-canary-20260429-a5e59cf",
  "canary-sdk-56": "56.0.6-canary-20260701-9100865",
  "sdk-54": "54.0.37",
  "sdk-55": "55.0.31",
  "canary": "58.0.0-canary-20260909-ea7a89a",
  "sdk-56": "56.0.24",
  "next": "58.0.11",
  "latest": "58.0.16",
  "sdk-57": "57.0.31"
}
```

---

## 5. TypeScript Error-Set Diff & Mathematical Reconciliation

### 5.1 Per-File Raw Count Comparison

| File | Baseline (32945ca) | HEAD | Diff |
| :--- | :--- | :--- | :--- |
| `app/admin/exercises/[id]/edit/page.tsx` | 1 | 1 | 0 |
| `app/api/assessments/[id]/start/route.ts` | 1 | 1 | 0 |
| `app/api/exam/attempt/start/route.ts` | 1 | 0 | **-1 (fixed)** |
| `app/batches/[slug]/BatchDetailClient.tsx` | 1 | 1 | 0 |
| `components/admin/tracks/TrackCourseManager.tsx` | 1 | 1 | 0 |
| `components/admin/tracks/TrackForm.tsx` | 6 | 6 | 0 |
| `components/course/CourseBundleView.tsx` | 8 | 8 | 0 *(1 error type morphed)* |
| `components/home/BatchEnrollModal.tsx` | 21 | 21 | 0 |
| `lib/actions/admin/users.ts` | 1 | 0 | **-1 (fixed)** |
| `lib/actions/user/profile.ts` | 10 | 0 | **-10 (fixed)** |
| `scripts/audit-pass4-sectionG-lock-leakage.ts` | 4 | 4 | 0 |
| `scripts/capture-and-diff.ts` | 0 | 1 | **+1 (added)** |
| `scripts/seed-audit-users.ts` | 7 | 7 | 0 |
| `scripts/test-c1-viewport-user-mismatch.ts` | 6 | 6 | 0 |
| `scripts/test-m1-m2.ts` | 1 | 1 | 0 |
| `scripts/test-pass4-sectionA.ts` | 1 | 0 | **-1 (fixed)** |
| `scripts/test-pass4-sectionE-progress.ts` | 1 | 1 | 0 |
| `scripts/test-pass4-sectionF-razorpay-checkout.ts` | 1 | 1 | 0 |
| `scripts/test-pass5-section1.ts` | 4 | 4 | 0 |
| `scripts/test-report-links.ts` | 1 | 0 | **-1 (fixed)** |
| `tests/api-v1-sec1.test.ts` | 0 | 5 | **+5 (added in SEC1)** |
| **Total Raw Errors** | **77** | **69** | **Net -8** |

### 5.2 Resolution of the 14-vs-15 Discrepancy
1. **14 distinct errors permanently eliminated**:
   - `app/api/exam/attempt/start/route.ts`: 1 error (TS2339 createdById)
   - `lib/actions/admin/users.ts`: 1 error (TS2322 'MANUAL')
   - `lib/actions/user/profile.ts`: 10 errors (avatarUrl, bio, privacySettings, notifPrefs)
   - `scripts/test-pass4-sectionA.ts`: 1 error (TS2362 arithmetic)
   - `scripts/test-report-links.ts`: 1 error (TS5097 allowImportingTsExtensions)
   Sum = **14 errors**.
2. **The 15th error**: In `components/course/CourseBundleView.tsx`, the error message was updated:
   - Baseline: `Type 'number | null | undefined' is not assignable to type 'string | number | undefined'.`
   - HEAD: `Type 'number | null | undefined' is not assignable to type 'string | number'.`
   When classified strictly by exact message string, 1 baseline error was replaced with 1 new error (giving 14 + 1 = **15 fixed** and 1 + 1 = **2 added**).
3. **Exact Equation**:
   - At checkpoint `checkpoint/r3a-A1` (`3a90131`): `77 (baseline) - 15 (fixed/morphed) + 2 (added/morphed) = 64 errors`.
   - At current HEAD: `64 errors + 5 errors (TS2540 in tests/api-v1-sec1.test.ts) = 69 errors`.
