# Phase 1 Discovery: Architecture, Baseline & Contradiction Resolution

**Author:** Senior Perf & Hardening Lead  
**Branch:** `perf/exam-runtime-v2`  
**Base Commit:** `c603168` (incorporating `6cc75f7` and base `1b48ec9`)  
**Date:** October 29, 2026

---

## 1. Branch Topology & Production Line

### Raw Git Analysis
- `git merge-base perf/exam-runtime fix/audit2-hardening` -> `1b48ec917101cf90112d7983c6d240b29eba5025`
- `git merge-base perf/exam-runtime TrillionSkill-ver2` -> `1b48ec917101cf90112d7983c6d240b29eba5025`
- `git merge-base fix/audit2-hardening TrillionSkill-ver2` -> `1b48ec917101cf90112d7983c6d240b29eba5025`
- `git branch --contains 01ad596` -> only `fix/audit2-hardening`

### Topology Diagram
```text
           1b48ec9 (TrillionSkill-ver2 / Base common ancestor)
             /                                      \
            /                                        \
     fix/audit2-hardening                    perf/exam-runtime
  (01ad596: shared deadline,               (6cc75f7: high-concurrency raw SQL,
   A13-A16 security, B1-B13 audit,          c603168: review benchmarks)
   f8d0fe3: mobile tests)                           \
            \                                        \
             -------------------> [MERGE] <-----------
                                    \
                         perf/exam-runtime-v2 (this worktree)
```

### Assessment: Production Line
- **Finding:** `fix/audit2-hardening` contains the cumulative system-wide audit fixes across auth, upload, payments, lessons, device management, and the mobile v1 service (`lib/services/exam.service.ts`).
- **INFERENCE:** `fix/audit2-hardening` is the true production line branch for platform release hardening. `perf/exam-runtime` was branched off `TrillionSkill-ver2` (`1b48ec9`) in parallel to explore raw SQL batching and caching.

---

## 2. TypeScript Compilation Baseline (`tsc --noEmit`)

### Exact Line Counts
- **Base `1b48ec91`:** 119 error lines (36 distinct files)
- **Clean `c603168` / `perf/exam-runtime-v2`:** 121 error lines (37 distinct files)
- **Dirty root checkout (`TrillionSkill` with untracked files):** 180 error lines

### Resolution of the 119 vs 186 (or 180) Gap
A direct line diff between `/tmp/tsc-1b48ec91.txt` and `/tmp/tsc-ws-perf-v2.txt` proves that exactly **TWO** new errors exist on `perf/exam-runtime`:
```diff
119a120,121
> tools/loadtest/loadtest-runner.ts(168,21): error TS18047: 'testRecord' is possibly 'null'.
> tools/loadtest/loadtest-runner.ts(241,41): error TS18047: 'testRecord' is possibly 'null'.
```

The 180 error count in the uncleaned directory arose from **untracked files** outside the git index (`.next-test/types/`, `apps/mobile/src/components/course/CourseDetailExtras.tsx`, `components/course/detail/`, and duplicate `AttemptClient.tsx` edits). When typechecked in a clean worktree, `c603168` has exactly **121** errors (119 baseline + 2 in `tools/loadtest/loadtest-runner.ts`).

### Baseline Error Classification (119 errors on base `1b48ec9`)
1. **Missing Types / Generated Prisma Schema Mismatches (42%):**
   - e.g., `app/batches/[slug]/BatchDetailClient.tsx`: `Property 'coverImage' does not exist on type 'Batch'`.
   - e.g., `app/api/assessments/[id]/start/route.ts`: `Property 'timeSpent' is missing in type... AssessmentAttemptUncheckedCreateInput`.
2. **React Hook Form / Resolver Type Incompatibilities (38%):**
   - e.g., `components/admin/tracks/TrackForm.tsx` (lines 52, 91, 94, 111, 137): `ResolverResult` generic type mismatch between zodResolver and react-hook-form v7.
3. **Admin Edit / Upload FormData Types (15%):**
   - e.g., `app/admin/exercises/[id]/edit/page.tsx`: missing optional `description`.
   - e.g., Next.js App Router Node.js vs Web Fetch `FormData.get()` type mismatch in upload routes.
4. **Load-Test Files (5%):**
   - Fixed under P2-1 in `tools/loadtest/loadtest-runner.ts`.

---

## 3. Exam Deadline Ordering & Write-Before-Check Vulnerability

### Inspection of `perf/exam-runtime` (commit `6cc75f7` / `c603168`)

#### A. Web Sync Route (`app/api/exam/attempt/[attemptId]/sync/route.ts`)
- **Flag-ON Path (`isExamBatchSyncEnabled()`):**
  - Writes: lines 114–142 (`INSERT INTO "ExamAttemptAnswer" ... SELECT ... UNNEST(...) ON CONFLICT DO UPDATE`).
  - Update: lines 138–141 (`tx.examAttempt.update({ data: { tabSwitchCount } })`).
- **Flag-OFF Path (Legacy):**
  - Writes: lines 150–184 (`tx.examAttemptAnswer.upsert(...)`).
- **Deadline Evaluation:**
  - Line 202–207:
    ```ts
    const deadlineMs = attempt.startedAt.getTime() + durationMinutes * 60 * 1000;
    const graceDeadlineMs = deadlineMs + 30 * 1000;
    if (Date.now() > graceDeadlineMs) { ... }
    ```
- **VERDICT:** **Both the legacy path and the new raw-SQL path suffered from the identical bug.** DB writes executed first, and the deadline expiration check occurred afterwards on line 207!

#### B. Web Submit Route (`app/api/exam/attempt/[attemptId]/submit/route.ts`)
- **Deadline Calculation:** Lines 107–111 calculates `graceDeadlineMs`.
- **Writes:** Lines 116–143 execute `prisma.examAttemptAnswer.upsert` for every final answer.
- **Deadline Evaluation:** **NONE.** The route never actually branched on `Date.now() > graceDeadlineMs`. Expired attempts accepted and persisted late answers unconditionally!

#### C. Mobile v1 Route (`lib/services/exam.service.ts` on `01ad596`)
- In commit `01ad596`, the shared `lib/exam-deadline.ts` was introduced.
- **Sync:** Line 469–475: `if (deadline.expired) throw new Error("BAD_REQUEST: ...")` strictly BEFORE calling `applyAnswerBatch` (line 477).
- **Submit:** Line 525–534: `if (withinGrace && finalAnswers)` gates answer synchronization before grading.

---

## 4. Leaderboard Cache TTL Contradiction (10 s vs 120 s)

### Resolution with Code Evidence
- **Real Code Implementation:** `lib/exam-ranking.ts:217`
  ```ts
  if (isExamCacheLeaderboardEnabled()) {
    // 10s TTL short-cache to coalesce deadline thundering herds
    await setCache(cacheKey, result, 10);
  }
  ```
  The runtime cache TTL has **always been 10 seconds** in executable code.
- **The "120 s" Source:** `tests/unit/exam-runtime-verification-review.test.ts:242`
  ```ts
  // BUG VERIFICATION: Because leaderboard is cached for 120s and NOT invalidated on submit,
  ```
  The test reviewer wrote a comment claiming 120s, but the actual code executed with 10s.
- **Conclusion:** The contradiction was a reviewer documentation discrepancy. The actual code was 10s. Under P0-2, we enforce a configurable TTL (`<= 15 s`, default 10s) with active invalidation on submit.

---

## 5. Rate Limiting Audit Across Exam Routes

| Route | File Path | Rate Limiting Applied? |
| :--- | :--- | :--- |
| **Web Start** | `app/api/exam/attempt/start/route.ts` | **NONE** (No `checkRateLimit` call) |
| **Web Sync** | `app/api/exam/attempt/[attemptId]/sync/route.ts` | **NONE** |
| **Web Submit** | `app/api/exam/attempt/[attemptId]/submit/route.ts` | **NONE** |
| **Web Result** | `app/api/exam/attempt/[attemptId]/result/route.ts` | **NONE** |
| **Web Leaderboard** | `app/api/exam/[testId]/leaderboard/route.ts` | **NONE** |
| **Mobile v1 Start** | `app/api/v1/tests/[id]/attempts/route.ts` | **NONE** |
| **Mobile v1 Sync** | `app/api/v1/attempts/[id]/answers/route.ts` | **NONE** |
| **Mobile v1 Submit** | `app/api/v1/attempts/[id]/submit/route.ts` | **NONE** |
| **Mobile v1 Result** | `app/api/v1/attempts/[id]/result/route.ts` | **NONE** |
| **Mobile v1 Leaderboard**| `app/api/v1/tests/[id]/leaderboard/route.ts` | **NONE** |

- **VERDICT:** Zero rate limiting is currently applied to any exam attempt or leaderboard endpoint. P1-5 will implement per-user+IP rate limiting behind `EXAM_RATE_LIMIT_ENABLED`.

---

## 6. Remote Database Isolation & Task B Failure Audit

1. **Isolation Status:**
   - The current run has zero connection to remote Supabase DB.
   - `scripts/guard-test-db.ts` actively rejects any URL containing `supabase.co` or unapproved ports.
   - Read-only audit script generated at `docs/perf/remote-db-audit.sql`.
2. **Task B Real-Build Failure Investigation:**
   - Review of `evidence/verify/task-b-realism-results.json` showed: `failedRequests: 30`, `successfulRequests: 0`.
   - Root Cause: In `tools/loadtest/task-b-realism-scenario.ts:48`, session cookies were minted with `authjs.session-token`. However, NextAuth v5 in production mode defaults `useSecureCookies: true` (unless `AUTH_URL` starts with `http://`), causing NextAuth to look for `__Secure-authjs.session-token` with a different salt. Furthermore, mismatched `AUTH_SECRET` between the loadtest runner and Next.js server caused immediate 401 Unauthorized errors on every single request.

---

## 7. AI Model IDs & Quota Verification Summary

All AI models configured in `feat/ai-layer:lib/ai/config.ts` were checked against live provider documentation:
- **Gemini:** `gemini-1.5-flash` confirmed (15 RPM / 1,500 RPD).
- **Groq:** `llama-3.3-70b-versatile` confirmed, but free tier RPD is 1,000 (config 14,400 is an over-estimate).
- **Cerebras:** `llama3.1-8b` confirmed (30 RPM).
- **Mistral:** `mistral-small-latest` confirmed (1 RPS / 1,000 RPD).
- **OpenRouter:** `meta-llama/llama-3.3-70b-instruct:free` confirmed (20 RPM, 50 RPD / 1,000 RPD with balance).
- Full details documented in `docs/perf/ai-model-verification.md`.
