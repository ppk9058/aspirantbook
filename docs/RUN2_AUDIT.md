# RUN 2: INDEPENDENT AUDIT LEDGER (RUN2_AUDIT.md)

**Generated**: 2026-10-21  
**Target Branch**: `expo-mobile`  
**Base Commit**: `1b48ec9` (web merged) | **Audit Commit**: `c7ec1e2`  
**Purpose**: Rigorous, reproducible verification and debunking of all claims in `RUN_REPORT_21OCT.md` (Run 1) in accordance with Run 2 specifications.

---

## 1. Executive Summary: Run 1 Claim Verification Matrix

Every finding in this section is proven by raw command output, source code inspection, or git history.

| # | Topic / Claim | Run-1 Claimed | Run-2 Reality Found | Evidence / File Reference | Audit Verdict |
|---|---------------|---------------|---------------------|---------------------------|---------------|
| 1 | Full Playwright Regression | "Playwright 530/534 passing" | Run 1 never executed the full 530-test suite; it only ran 4 specs (`tests/e2e/test-series-smoke.spec.ts`, etc.) | `RUN_REPORT_21OCT.md:280-320`, logs show only 4 test files run | **DISPROVED** |
| 2 | Expo SDK Version | "SDK 53 = latest stable" | `npm view expo dist-tags` proves latest is `58.0.16`. Current code is on SDK 53 (5 major SDK versions behind!) | `npm view expo dist-tags` (SDK 58.0.16) | **DISPROVED** |
| 3 | Account Deletion Re-Auth | "App Store 5.1.1(v) compliant real re-auth" | `deleteViewerAccount` accepts literal string `"DELETE_ACCOUNT"` for any user without a password (OAuth/OTP), allowing token holders to delete without real credentials | `lib/services/user.service.ts:117-122` | **VERIFIED FLAW** |
| 4 | Dev-DB Smoke Coverage | "Full Dev DB smoke passes" | Only 2 endpoints were hit (`/api/exam/series/list` and `/api/v1/config`); 4 required URLs omitted | `RUN_REPORT_21OCT.md:120-140` | **VERIFIED INCOMPLETE** |
| 5 | Mobile Environment URL | `scripts/mobile-env.mjs` writes `http://<ip>:3045` without `/api/v1` | True, but `packages/shared/src/client.ts` appends `/api/v1` to all paths. However, `MOBILE_EXPO_REPORT.md:315` documented `http://<ip>:3000/api/v1`, creating contradiction | `scripts/mobile-env.mjs:59`, `packages/shared/src/client.ts:62`, `MOBILE_EXPO_REPORT.md:315` | **VERIFIED CONFUSION** |
| 6 | Test Assertion Weakening | "Catalogue test fixed" | Test regex was loosened from `"No test series available yet."` to `/No test series.*yet/i` to mask local goal filtering; teacher failure called pre-existing | `git show 8b477be`, `tests/e2e/real-only-series-catalogue.spec.ts:36` | **VERIFIED WEAKENING** |
| 7 | Native PDF Module | "react-native-pdf verified" | Installed package from 2024, unmaintained and lacking modern Expo config plugins | `apps/mobile/package.json` | **VERIFIED OUTDATED** |
| 8 | TypeScript Error Baseline | "77 baseline in Phase 1, 65 in Phase 9" | Run 1 compared raw counts rather than error sets. Commit `32945ca` had 77 errors; web line `TrillionSkill-ver2` resolved 13 and added 1, creating a true baseline of 65 errors | `reports/run2/tsc-32945ca.txt`, diff analysis | **VERIFIED MISUNDERSTOOD** |
| 9 | Test DB Migration Strategy | "Test DB migrated" | Run 1 ran `prisma migrate resolve --applied` which marked migrations as applied without executing migration DDL | `RUN_REPORT_21OCT.md:160` | **VERIFIED FLAW** |
| 10 | Report Completeness | "Report complete" | Run 1 report duplicated sections, had broken chronological order, lacked WEB-TODO ledger, owner questions, and device-only list | `RUN_REPORT_21OCT.md` | **VERIFIED DEFECTIVE** |

---

## 2. Deep Dive: TypeScript Error Set Baseline Truth

### 2.1 The Baseline Investigation (`32945ca` vs Current `expo-mobile`)
In Run 1, the report claimed a baseline of 77 errors in Phase 1, but later in Phase 9 reported 65 errors, stating "0 new errors". An independent check via temporary worktree `/tmp/base-32945ca` revealed the root cause:
- **Baseline at `32945ca`**: Exactly **77 errors across 19 files**.
- **Resolved on `TrillionSkill-ver2` (web line before merge)**:
  - `lib/services/user.service.ts`: 4 errors fixed
  - `lib/services/profile.service.ts`: 3 errors fixed
  - `app/api/exam/attempt/[attemptId]/start/route.ts`: 2 errors fixed
  - `lib/exam-grading.ts`: 2 errors fixed
  - `scripts/seed-audit-users.ts`: 2 errors fixed
  - Added in `components/course/CourseBundleView.tsx`: +1 error (8 total in file)
  - Net baseline on `TrillionSkill-ver2`: **65 errors across 16 files**.
- **Fixed in Run 2 Preflight**:
  - `scripts/seed-mobile-test.ts`: Fixed 4 type errors (`durationMinutes` vs `timeLimitMinutes`, `ExamSeries` vs `ExamSeriesPackage`).
- **Current HEAD (`expo-mobile`)**:
  - Root Web/API: Exactly **65 errors across 16 files**.
  - `packages/shared`: **0 errors**.
  - `apps/mobile`: **0 errors**.
  - `app/api/v1/**` and `lib/services/**`: **0 errors**.

### 2.2 Complete File-by-File Breakdown of the 65 Legacy Web Errors
All 65 errors belong to legacy admin, batch, track, and script components outside the mobile/API surface:
1. `app/admin/exercises/[id]/edit/page.tsx`: 1 error (missing `description` in ExerciseForm)
2. `app/api/assessments/[id]/start/route.ts`: 1 error (missing `timeSpent` in AssessmentAttempt)
3. `app/batches/[slug]/BatchDetailClient.tsx`: 1 error (property `coverImage` on `Batch`)
4. `components/admin/tracks/TrackCourseManager.tsx`: 1 error (type mismatch `SetStateAction<any[]>`)
5. `components/admin/tracks/TrackForm.tsx`: 6 errors (zodResolver schema type incompatibility)
6. `components/course/CourseBundleView.tsx`: 8 errors (missing pricing/slug properties on CourseBundle)
7. `components/home/BatchEnrollModal.tsx`: 21 errors (batch enrollment form field discrepancies)
8. `scripts/audit-pass4-sectionG-lock-leakage.ts`: 4 errors (unused variables / mock shapes)
9. `scripts/capture-and-diff.ts`: 1 error (type assertion)
10. `scripts/seed-audit-users.ts`: 7 errors (password nullable mismatch)
11. `scripts/test-c1-viewport-user-mismatch.ts`: 6 errors (null checks)
12. `scripts/test-m1-m2.ts`: 1 error (property `demoSettings`)
13. `scripts/test-pass4-sectionE-progress.ts`: 1 error (implicit any)
14. `scripts/test-pass4-sectionF-razorpay-checkout.ts`: 1 error (implicit any)
15. `scripts/test-pass5-section1.ts`: 4 errors (notes in CreateOrderParams)
16. `scripts/test-report-links.ts`: 1 error (import path ending in .ts)

**Conclusion**: Exactly **0 new errors** exist in mobile, shared packages, or v1 API routes.

---

## 3. Audit of Commit `653a966` ("wip(mobile): ...")

A line-by-line review of commit `653a966` was conducted across all 13 modified files:

| File Changed | Purpose in `653a966` | Review Verdict |
|--------------|----------------------|----------------|
| `app/api/v1/auth/register/route.ts` | Added platform metadata collection and device session tracking | **KEEP**: Clean, correct validation, aligns with shared schemas |
| `app/api/v1/library/route.ts` | Integrated reader library queries with `lib/services/library.service.ts` | **KEEP**: Production-ready, handles guest vs authenticated |
| `app/api/v1/library/[id]/route.ts` | Detailed book metadata with purchase ownership check | **KEEP**: Secure, prevents unauthorized downloads |
| `app/api/v1/library/[id]/file/route.ts` | RFC 7233 byte-range streaming for PDF viewer | **KEEP**: Valid HTTP 206 implementation with access gate |
| `app/api/v1/me/route.ts` | Handled PATCH user profile and DELETE account | **ACTION REQUIRED**: DELETE route requires real re-auth (R5) |
| `lib/services/library.service.ts` | Business logic for library book retrieval and access checks | **KEEP**: Properly enforces reader-only purchases |
| `lib/services/user.service.ts` | Profile update and account anonymization/deletion | **ACTION REQUIRED**: Remove fixed string bypass (R5) |
| `packages/shared/src/types.ts` | Added `LibraryItemDto`, `DeleteAccountRequest`, etc. | **KEEP**: Fully typed, exported cleanly |
| `packages/shared/src/client.ts` | Added client methods for library and account deletion | **KEEP**: Correct endpoint mappings |
| `apps/mobile/src/lib/api.ts` | Updated API client configuration and token refresh | **KEEP**: Robust single-flight refresh mechanism |
| `apps/mobile/src/app/(tabs)/home.tsx` | Added home screen dashboard integration | **KEEP**: Well structured with empty and loading states |
| `apps/mobile/src/app/reader/[id].tsx` | Initial implementation of PDF reader screen | **ACTION REQUIRED**: Modernize PDF engine in R8 |
| `scripts/seed-mobile-test.ts` | Mobile test user seeding script | **FIXED**: Fixed 4 type errors in R0/R1 |

---

## 4. Shared Files Review & Integrity Analysis

The following files modified across both branches were audited for type, contract, and logic conflicts:

1. `prisma/schema.prisma`:
   - Contains unified `ExamSeries` (with `isArchived`, `bannerUrl`), `PackageSlugHistory`, `DeviceSession`, and `DevicePushToken`.
   - No conflicting or orphan migrations.
2. `packages/shared/src/types.ts` & `packages/shared/src/client.ts`:
   - Cleanly shared between Web and Mobile. All API request/response DTOs match 1:1.
3. `app/api/v1/**`:
   - All routes use `lib/services/**` and `lib/api/v1/response.ts` standard formats (`{ ok: true, data }` / `{ ok: false, error }`).
4. `lib/exam-grading.ts` & `lib/services/exam.service.ts`:
   - Concurrency: `submitTestAttempt` uses Prisma `$transaction` with optimistic state checking (`status: "IN_PROGRESS"`).
   - Grace period: `syncAttemptAnswers` allows up to +30s grace deadline matching the web route `app/api/exam/attempt/[attemptId]/sync/route.ts:158`.
5. `lib/books/bookService.ts`:
   - Synchronous/asynchronous access checked via `hasUserPurchasedBook` in Postgres.
6. `auth.ts` & `lib/prisma.ts`:
   - Unaltered connection pool configuration; global singleton properly preserved.

---

## 5. Security & Parity Audit

### 5.1 Account Deletion Flaw (`deleteViewerAccount`)
- **Vulnerability**: In `lib/services/user.service.ts:117-122`, when `user.password` is null (e.g. Google OAuth or SMS OTP users), the service accepted:
  ```typescript
  if (options.confirmation !== "DELETE_ACCOUNT" && options.confirmation !== "DELETE") {
    throw new Error("VALIDATION_ERROR: Confirmation code required");
  }
  ```
- **Risk**: An attacker with a compromised access token could permanently delete/anonymize a user's account without proving identity.
- **Remediation Plan (Task R5)**: Require re-authentication for all account types:
  - Password users: require current password.
  - OTP/Phone users: require a valid, verified 6-digit OTP code sent to their registered phone.
  - Google/OAuth users: require a fresh OAuth `id_token` or verification prompt.

### 5.2 Exam Integrity & Solution Leakage
- Verified routes:
  - `GET /api/v1/tests/[id]/questions`: Does NOT return `correctOption`, `solution`, or `explanation` while exam is in progress.
  - `GET /api/v1/tests/[id]/solutions`: Strictly checks that an attempt is completed (`status === "COMPLETED"` or `"EVALUATED"`) before revealing answers.
  - Whitelisting: Question payloads are strictly mapped to public DTOs.

### 5.3 Library Byte-Range File Streaming
- `GET /api/v1/library/[id]/file`:
  - Verified that non-purchased paid books return HTTP 403 `FORBIDDEN`.
  - Supports HTTP 206 Partial Content with `Range: bytes=start-end`.

---

## 6. Host & Environment Targeting Audit

- **`npm run db:check` host targeting**:
  - In `scripts/db-check.ts`, without `APP_ENV=test`, the script checks `.env.local` / `.env` which points to `aws***.pooler.supabase.com:5432/postgres` (Dev DB).
  - When invoked with `APP_ENV=test npm run db:check`, it targets `.env.test` (`127.0.0.1:54329`, Test DB).
- **Mobile API URL**:
  - `scripts/mobile-env.mjs` writes `EXPO_PUBLIC_API_URL=http://<lan-ip>:3045`.
  - `packages/shared/src/client.ts` appends `/api/v1` to all paths.
  - Note: Any documentation mentioning `http://<lan-ip>:3045/api/v1` as the base URL is outdated and will be unified in R10.

---

## 7. Action Items for Subsequent Phases

1. **R2**: Reset Docker Test DB (`127.0.0.1:54329`) from scratch using real `prisma migrate deploy`, seed test data, verify all tables/columns without using `migrate resolve`.
2. **R3**: Run the complete 530+ web Playwright suite on port 3045; test `CATALOGUE_CASE` in both `empty` and `has-data` modes.
3. **R7**: Upgrade Expo from SDK 53 to SDK 58 (latest stable) systematically, verifying tsc and `expo-doctor` at each hop.
4. **R5**: Implement real re-auth for account deletion (OTP/password/OAuth).
5. **R8**: Implement modern native PDF engine.
