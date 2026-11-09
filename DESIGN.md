# DESIGN: Exam-Taking Runtime Architecture

**Author**: Principal Engineer  
**Scope**: AspirantBook Exam Subsystem  
**Target Concurrency**: 300 concurrent users today $\to$ 1,000 $\to$ 5,000 users  
**Target Infrastructure**: Supabase Postgres Free Tier (pooler, 15–20 backend connections, 500MB cap), optional Redis (`REDIS_URL`), Cloudflare edge proxy, Docker-capable Node host (standalone Next.js).

---

## 1. Executive Summary & Problem Statement

AspirantBook operates high-stakes Computer-Based Tests (CBT) for civil services and state exams. Tests typically comprise 100 to 150 questions with 60 to 120-minute durations.
Under Phase 0 tracing against real database queries, the existing baseline exhibits three structural flaws that cause outage under even modest concurrency (300 users):
1. **Submit Thundering Herd**: `gradeExamAttempt` executes 100 sequential `UPDATE` queries inside a single PostgreSQL transaction loop, holding connection pool slots for 1.5–2.5 seconds. At 300 concurrent submitters, connection demand reaches ~19 connections, saturating Supabase's 15–20 backend pooler limit and crashing at 1,000 users.
2. **$O(N^2)$ Peer Attempt Scans**: `getTestRankings` runs an unbounded `findMany` across all submitted attempts of the test without caching. At 5,000 users, 5,000 submissions trigger 25,000,000 row parses in Node memory.
3. **Uncached Question Sets & N+1 Answer Syncs**: Full test and question structures are queried dynamically on every exam start; answer syncs execute separate `findUnique` and `upsert` queries per question.

---

## 2. Design Constraints & Invariants

1. **Behavioral Invariant**: Zero feature degradation. Exam start, answer sync, mark-for-review, server timer with 30s grace, compare-and-set submit, grading formulas (positive/negative marks), ranking tie-breakers, leaderboard sanitization, and mobile offline queue must remain strictly byte- and logic-equivalent.
2. **Zero Leakage**: `correctOption`, `explanationEn`, and `explanationHi` must NEVER be exposed in any pre-submission question delivery or cached test payload.
3. **Additive & Flag-Gated**: Every optimization must sit behind an explicit feature flag defaulting to `false` (`OFF`). Merging onto the branch modifies zero runtime behavior until activated.
4. **Free-Tier Infrastructure Bounds**:
   - Supabase connection pooler: $\le 15$ concurrent transactions.
   - Supabase disk: 500 MB limit.
   - Redis: Optional; system must function identically (with graceful in-memory fallback) when `REDIS_URL` is omitted or unavailable.

---

## 3. Architecture & Detailed Component Design

### (a) Answer-Sync Coalescing & Idempotent Multi-Row Upsert
- **Client Policy**:
  - *Mobile*: Retain the durable SQLite storage driver (`apps/mobile/src/lib/cbt-sync.ts`). In online mode, coalescing debounce of 5s or 5 answers; on app backgrounding, tab switch, or submit, flush synchronously.
  - *Web*: Buffer answer changes in memory / localStorage. Flush on 5s idle debounce, or immediately on blur, `visibilitychange` (hidden), or test submit.
- **Server Multi-Row Upsert (`EXAM_RUNTIME_BATCH_SYNC=true`)**:
  - Replace the N+1 loop with a single parameterized PostgreSQL query using `UNNEST`:
  ```sql
  INSERT INTO "ExamAttemptAnswer" (
    "id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs", "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    $1,
    v.question_id,
    v.selected_option,
    v.is_marked,
    v.client_seq,
    v.time_spent_secs,
    NOW()
  FROM UNNEST($2::text[], $3::text[], $4::boolean[], $5::int[], $6::int[])
    AS v(question_id, selected_option, is_marked, client_seq, time_spent_secs)
  ON CONFLICT ("attemptId", "questionId")
  DO UPDATE SET
    "selectedOption" = EXCLUDED."selectedOption",
    "isMarked" = EXCLUDED."isMarked",
    "clientSeq" = EXCLUDED."clientSeq",
    "timeSpentSecs" = EXCLUDED."timeSpentSecs",
    "updatedAt" = NOW()
  WHERE "ExamAttemptAnswer"."clientSeq" IS NULL
     OR EXCLUDED."clientSeq" >= "ExamAttemptAnswer"."clientSeq";
  ```
  - **Proof of Equivalence**: Monotonic sequence guard (`EXCLUDED.clientSeq >= existing.clientSeq`) guarantees that delayed out-of-order network packets can never overwrite newer user choices.
  - Query count reduced from $2N + 1$ to exactly $1$ DB query per sync.

---

### (b) Question-Set Delivery & Sanitized Caching
- **Endpoint**: `/api/exam/questions/:testId` or cached start payload (`EXAM_RUNTIME_CACHE_QUESTIONS=true`).
- **Data Transformation**:
  - Project only: `id`, `sectionId`, `order`, `questionEn`, `questionHi`, `optionAEn..DEn`, `optionAHi..DHi`, `positiveMarks`, `negativeMarks`, `questionType`, `subject`.
  - Strip completely: `correctOption`, `explanationEn`, `explanationHi`.
- **Two-Tier Cache**:
  - *Tier 1 (Redis)*: Key `exam:test-questions:v1:<testId>`, TTL 300 seconds (5 minutes).
  - *Tier 2 (In-Memory LRU)*: Bounded LRU (max 100 tests, 5-minute TTL).
- **HTTP Cache**: SHA-256 hash of JSON string returned as `ETag`. Supports `If-None-Match` returning `304 Not Modified`.
- **Zero-Leakage Assurance**: Verified by automated test suites asserting that no question payload contains `correctOption` or `explanation` substrings.

---

### (c) Result, Rank & Leaderboard Optimization
- **Batched Grading Updates (`EXAM_RUNTIME_FAST_GRADING=true`)**:
  - Replace 100 sequential `UPDATE` queries with a single atomic raw SQL update:
  ```sql
  UPDATE "ExamAttemptAnswer" as a
  SET
    "isCorrect" = v.is_correct,
    "marksAwarded" = v.marks_awarded,
    "updatedAt" = NOW()
  FROM (
    SELECT UNNEST($1::text[]) as question_id,
           UNNEST($2::boolean[]) as is_correct,
           UNNEST($3::double precision[]) as marks_awarded
  ) as v
  WHERE a."attemptId" = $4 AND a."questionId" = v.question_id;
  ```
  - Reduces grading transaction duration from $\sim 2,000\text{ms}$ to $< 15\text{ms}$, freeing pooler connections instantly.
- **Short-TTL Cache for Rankings & Leaderboard (`EXAM_RUNTIME_CACHE_LEADERBOARD=true`)**:
  - During the submit herd, 700 submitters hit within 20s.
  - Compute `getTestRankings` once and cache in Redis / In-Memory with TTL = 10 seconds.
  - Subsequent submissions within the 10s window reuse the cached leaderboard/percentile map, reducing database scan frequency by 99%.
- **Precomputed Rank on Attempt**:
  - Write computed `percentile` and `allIndiaRank` onto `ExamAttempt` row during finalization.
  - Subsequent GET `/api/exam/attempt/:id/result` returns the stored rank directly with 0 peer attempt queries!

---

### (d) Rate Limiter Store Abstraction
- Unified interface: `checkRateLimit(key: string, limit: number, windowSecs: number): Promise<{ allowed: boolean, remaining: number, resetAt: number }>`.
- When `REDIS_URL` is set: Redis atomic sliding window or fixed window counter (`INCR` + `EXPIRE`).
- Fallback: PostgreSQL `RateLimit` table as implemented today.
- Client IP Resolution: When `TRUST_PROXY=true`, extract `CF-Connecting-IP`, falling back to first IP in `x-forwarded-for`.

---

### (e) Smoothing the Exam-Start Herd
- Client initiates background question-set prefetch on the instructions/lobby screen before the exam begins with a randomized jitter between 0 and 5,000ms.
- When the user clicks "Start Test", questions are already cached in client memory. The start API call only needs to verify access and create the attempt record (1 query, $\sim 5\text{ms}$).

---

### (f) Connection Pool Settings for Supabase Pooler
- Supabase PgBouncer runs in Transaction Mode on port 6543 (or Supavisor on 5432).
- Node container pool limit: `connection_limit = 5` per instance. For 3 Node replicas, total client connections = 15, matching the Supabase backend limit exactly.
- Connection string parameters: `?pgbouncer=true&connection_limit=5&pool_timeout=10`.
- Prepared statements disabled for pooler compatibility (`statement_cache_size=0`).

---

### (g) Graceful Degradation Strategy
- **Redis Slow or Unavailable**: Catch Redis errors, log a warning, and fall back transparently to in-memory LRU cache or direct DB query. No user request fails due to Redis downtime.
- **Database Connection Pool Saturated**: If transaction acquisition times out, `gradeExamAttempt` returns `{ retryable: true, status: 202 }`. The client retries after an exponential backoff jitter (500ms, 1500ms), preventing cascading crash.

---

### (h) Host-Agnostic Production Build
- `next.config.mjs`: `output: "standalone"`.
- Multi-stage Dockerfile (`Dockerfile.production`) producing an optimized $\sim 180\text{MB}$ container with non-root security.
- Healthcheck endpoint: `/api/health` providing readiness/liveness status with lightweight DB ping.
- Zero local disk dependency: No exam state written to disk; serverless/container read-only filesystem compliant.

---

## 4. Rollback Plan & Feature Flags

All optimizations default to `false` and can be toggled independently:
- `EXAM_RUNTIME_BATCH_SYNC`: Enable single-query multi-row answer upserts.
- `EXAM_RUNTIME_FAST_GRADING`: Enable single-query multi-row grading answer update.
- `EXAM_RUNTIME_CACHE_QUESTIONS`: Enable question-set sanitization & Redis/LRU caching.
- `EXAM_RUNTIME_CACHE_LEADERBOARD`: Enable 10s caching of test rankings and leaderboard.
- `EXAM_RUNTIME_REDIS_RATELIMIT`: Enable Redis-backed rate limiting.

**Rollback**: Set the corresponding env flag to `false` (or unset) and restart the application container. The system immediately reverts to the legacy 1-by-1 Prisma execution path without schema rollback or downtime.
