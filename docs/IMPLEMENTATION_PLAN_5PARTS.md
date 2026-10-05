# Technical Implementation Plan: 5-Part Core Platform Fixes & E2E Verification

> **Date:** October 5, 2026  
> **Status:** Review & Approval Stage (NO CODE MODIFIED)  
> **Target Branch:** `main` tracking `origin/trillionskill-standalone`  

---

## 1. Safety Limits & Operational Protocols

1. **Git & Branching Integrity:**
   - Push destination strictly configured to tracked upstream (`origin/trillionskill-standalone`). Never push to `origin/main`.
   - No destructive git operations (`reset --hard`, `rebase`, `clean -fd`, branch deletions, or force pushes).
   - Before every commit: staged file scan (`.env*`, `server.log`, `dev.db`, `*.pem`, `*.key`, `*.patch`, `*.png`) and credential/secret scan (`sk_test_*`, `rzp_live_*`, private keys, full DB connection strings).
2. **Database Protection:**
   - Strictly additive DDL only (`CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
   - No `prisma migrate dev`, no `prisma migrate reset`, no `prisma db push`. Apply any required index via `prisma db execute` or isolated script followed by `npx prisma generate`.
   - Never drop or truncate existing data. Test suites create isolated, random test entities and clean them up upon test conclusion.
3. **Environment & Payment Constraints:**
   - Razorpay test keys only (`rzp_test_*`). Assert key prefix before any payment execution.
   - Server isolation: maximum of 1 server instance active at any time (`lsof -i :3000 -i :3001` checks before runs).
   - Mobile OTP bypass (`ALLOW_DEV_MOBILE_LOGIN=true`) enabled ONLY in process memory for test runs, never written to disk or committed.

---

## 2. Authentication Flow & Test Login Investigation Findings

### Current Architecture
- **OTP Length & Entry:** 6 numeric digits in `components/auth/MobileAuthModal.tsx`.
- **Bypass Mechanism:**
  - Client (`MobileAuthContext.tsx`): As soon as 6 digits are entered, calls `POST /api/auth/mobile-login` passing only `{ phoneNumber, courseId }` (the digits are not checked against SMS).
  - Server (`app/api/auth/mobile-login/route.ts` & `auth.ts`): Guarded by commit `8bac323`:
    ```typescript
    const isProduction = process.env.NODE_ENV === "production";
    const isDevBypassEnabled = process.env.ALLOW_DEV_MOBILE_LOGIN === "true" && !isProduction;
    ```
  - When enabled in test process environment, finds or auto-creates the user (`role: FREE`) and signs in via NextAuth `Credentials({ id: "mobile" })`.
- **E2E Test Execution Strategy:**
  - Real UI interaction in Playwright: open modal -> fill 10-digit random Indian mobile (`98xxxxxxxx`) -> fill 6 digits (`123456`) -> verify session established.
  - Zero mock bypasses or direct cookie/token injections.

---

## 3. Detailed Technical Plan by Part

---

### PART 1: Goal Auto-switching Bug Fix

#### Problem Statement
Learners report that their active goal unexpectedly reverts or changes to `"skills"` (Skill & Tech) automatically without an explicit user selection in `GoalModal`.

#### Root Cause Analysis
1. In `app/api/auth/mobile-login/route.ts` (lines 80–124) and `app/api/courses/enroll/route.ts` (lines 100–136):
   - Default initialization: `let goalId: string = "skills";`
   - When a user logs in or enrolls without a `courseId`, or when resolving a course whose title/slug does not match the regex in `lib/utils/course-goal-mapper.ts`, `goalId` falls back to `"skills"`.
   - The route sets the HTTP cookie `trillion_selected_goal = "skills"` and stores `"skills"` in server memory map `userGoalsMemoryMap`.
2. In `components/providers/GoalProvider.tsx`:
   - An idle callback `fetch("/api/user/goal")` runs on mount.
   - If the backend returns `"skills"`, `GoalProvider` overwrites the user's `localStorage` and React context with `"skills"`.
   - Furthermore, client pages and components dispatching `goalChange` events inadvertently broadcast the fallback goal.

#### Implementation Steps
1. **Preserve User Intent:**
   - In `app/api/auth/mobile-login/route.ts`, if no `courseId` is supplied or if course does not map to a recognized goal, do NOT set `goalId = "skills"`. Leave the existing user goal untouched.
   - In `app/api/user/goal/route.ts`:
     - If user has an existing cookie or memory goal, do not overwrite it with a default fallback.
     - Only update the goal if an explicit `POST /api/user/goal` is submitted by the user or an unambiguous course enrollment takes place.
2. **Provider Sync Guard:**
   - In `GoalProvider.tsx`, ensure `localStorage` selection is not overwritten by a default/fallback response unless the user explicitly switches goals.
3. **Verification:**
   - Add a dedicated Playwright test (`tests/e2e/goal-persistence.spec.ts`):
     - Log in as fresh user -> explicitly select "UPSC" in `GoalModal`.
     - Navigate through `/dashboard`, `/courses`, `/pyqs`, `/test-series`.
     - Perform a mobile login / session refresh.
     - Assert `selectedGoal` remains "UPSC" across all surfaces and reloads.

---

### PART 2: Test Status Source of Truth & Navigation Fixes

#### Problem Statement
Test statuses across `/test-series/[id]`, `/pyqs/[examId]`, `/pyqs`, and `/my-tests` are fragmented. PYQ buttons link to `/test-series/[id]/attempt` without required query parameters, causing immediate errors. `my-tests` links to nonexistent 3-segment URLs (`/test-series/[slug]/[id]/attempt`). Completed timed-out tests are omitted from `user-status`.

#### Root Cause Analysis
- `app/api/exam/attempt/user-status/route.ts` filters strictly by `status: "SUBMITTED"`, ignoring `"TIMED_OUT"`.
- `app/(dashboard)/pyqs/[examId]/page.tsx` hardcodes links to `/test-series/bpsc-72nd-2026/attempt` lacking `?testId=` and `?attemptId=`.
- `app/(dashboard)/my-tests/page.tsx` builds URLs as `/test-series/${slug}/${att.id}/attempt` instead of the standard App Router route `/test-series/${slug}/attempt?testId=...`.
- "View Report" calculation lacks optimal indexing, leading to slow queries on attempt aggregates.

#### Implementation Steps
1. **Bulk Status API Enhancement:**
   - Update `app/api/exam/attempt/user-status/route.ts` to include both `SUBMITTED` and `TIMED_OUT` statuses.
   - Support querying all attempts for a given user across series in a single request.
2. **Universal Action Button (`components/exam/TestActionButton.tsx`):**
   - Create a single, authoritative component used across `/test-series/[id]`, `/my-tests`, and `/pyqs`.
   - States:
     - `NOT_STARTED` -> "Start Now" -> links to `/test-series/${seriesId}/instructions?testId=${testId}`
     - `IN_PROGRESS` -> "Resume Test" -> links to `/test-series/${seriesId}/attempt?testId=${testId}&attemptId=${attemptId}`
     - `COMPLETED` (`SUBMITTED` / `TIMED_OUT`) -> "View Report" -> links to `/test-series/${seriesId}/result?testId=${testId}&attemptId=${attemptId}` and "Solutions" -> `/test-series/${seriesId}/solutions?testId=${testId}&attemptId=${attemptId}`.
3. **Fix PYQ and My-Tests Routes:**
   - Correct all link builders to pass proper query parameters (`?testId=${testId}`).
   - Update `app/(dashboard)/my-tests/page.tsx` to group completed attempts logically by test rather than fragmented rows.
4. **Performance & Index Optimization:**
   - Check if database index `@@index([testId, status, score])` and `@@index([submittedAt])` exist.
   - If missing, apply via safe additive SQL:
     ```sql
     CREATE INDEX IF NOT EXISTS "ExamAttempt_testId_status_score_idx" ON "ExamAttempt"("testId", "status", "score");
     CREATE INDEX IF NOT EXISTS "ExamAttempt_submittedAt_idx" ON "ExamAttempt"("submittedAt");
     ```
   - Ensure "View Report" loads under 1.5s with CPU throttling.

---

### PART 3: Test Series "Enroll" Button Fix (e.g. UPSC 2027)

#### Problem Statement
On `/test-series/upsc-2027` (and related test series), the Enroll button is reported non-responsive or failing to transition state.

#### Root Cause Analysis
- `components/test-series/EnrollButton.tsx` inspects `isFree={currentSeries.freeTests > 0}`:
  - If `!isFree`, it redirects to `/subscription` instead of the appropriate checkout or pass modal.
  - If `isFree`, it sends `POST /api/exam/series/enroll` with `{ enrollType: "FREE" }`.
  - For series identified by slug (e.g., `upsc-2027`) vs CUID, `app/api/exam/series/enroll/route.ts` may fail if the database lookup expects an ID or if the series is marked `isPro: true` with `freeTests: 0`.

#### Implementation Steps
1. **API Series Slug & ID Resolution:**
   - Ensure `app/api/exam/series/enroll/route.ts` resolves `seriesId` by both `id` AND `slug`.
2. **Button State & Click Handling:**
   - If free: trigger API enrollment -> transition button immediately to "My Tests" (`/my-tests`).
   - If paid/pro: trigger modal or navigate to `/checkout?seriesId=${series.id}` (or Pass checkout) with proper return URL.
3. **Verification:**
   - Playwright test verifying button click, state mutation, network 200 OK, and navigation.

---

### PART 4: End-to-End Paid Course Purchase (Razorpay Test Mode)

#### Flow & Architecture
1. **Pre-condition Validation:**
   - Assert `process.env.RAZORPAY_KEY_ID` starts with `rzp_test_`. Abort immediately if live.
2. **Test Steps:**
   - Launch Playwright browser at 1440x900 and 390x844.
   - Create isolated test student via mobile auth.
   - Navigate to paid course (e.g., `upsc-prelims-mains-comprehensive-batch`).
   - Verify locked lessons show paywall / locked indicators.
   - Click "Enroll" / "Buy Now" -> navigate to `/checkout`.
   - Initiate Razorpay order creation via `createRazorpayOrder`.
   - Complete checkout with Razorpay test payment handlers.
   - Verify `POST /api/verify-payment/razorpay` succeeds.
   - Verify redirect to `/my-learning`.
   - Verify lessons are now UNLOCKED in player (`/courses/[slug]/learn/[lessonId]`).
   - Cleanup: delete created test user, enrollment, and payment records.

---

### PART 5: End-to-End Free Course Enrollment & Playback

#### Flow & Architecture
1. **Test Steps:**
   - Fresh isolated student login.
   - Navigate to a free course (or free trial course).
   - Click "Enroll Free".
   - Verify enrollment record created and redirect to `/my-learning`.
   - Navigate to lesson player (`/courses/[slug]/learn/[lessonId]`).
   - Play video, verify progress tracking updates in database (`UserProgress` / `LessonProgress`).
   - Cleanup test user and progress records.

---

## 4. Verification & Testing Matrix

| Part | Verification Method | Viewports Checked | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Auth & Setup** | Playwright UI Mobile Login | 390x844 & 1440x900 | Real UI OTP flow succeeds without mock bypass |
| **Part 1: Goal** | Playwright Navigation Spec | 390x844 & 1440x900 | Selected goal persists across reloads and route navigation |
| **Part 2: Test Status** | Playwright Attempt & Report Spec | 390x844 & 1440x900 | Correct URLs (`?testId=`), unified button states, report < 1.5s |
| **Part 3: Enroll Button** | Playwright Series Spec | 390x844 & 1440x900 | UPSC 2027 button enrolls or redirects to checkout properly |
| **Part 4: Paid Course** | Razorpay Test E2E Script | 390x844 & 1440x900 | Locked -> Purchased -> Unlocked lifecycle fully verified |
| **Part 5: Free Course** | Free Course Playback Spec | 390x844 & 1440x900 | Zero-friction enrollment and lesson playback verified |

---

## 5. Review & Confirmation

No application code or database schema has been modified yet. Awaiting your approval to proceed with execution starting with **Part 1**.
