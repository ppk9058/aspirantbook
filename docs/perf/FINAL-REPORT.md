# Final Verification Report: Hardening & Audit of perf/exam-runtime

**Project:** TrillionSkill / AspirantBook Monorepo  
**Branch:** `perf/exam-runtime-v2`  
**Worktree:** `/Users/praveenkumar/ws-perf-v2`  
**Base Commit:** `1b48ec91` | **Merged Branch:** `fix/audit2-hardening` | **Tip:** `2281365`  
**Audit Standard:** Skeptical Senior Auditor (Strict Evidence Protocol)  
**Date:** 2026-10-29  

---

## 1. Executive Verdict: CONDITIONAL HOLD (FLAGS DEFAULT OFF)

**Verdict:** **NO BLIND ROLLOUT OF PERFORMANCE FLAGS. SAFE FOR SELECTIVE BUG FIXES ONLY.**

1. **Bug Fixes (Safe & Recommended for Production):**
   - **Deadline check before write (P0-1):** Blocks late answer persistence with 403 status before any DB write.
   - **Live submitter ranking (P0-2):** Guarantees candidates outside top-N receive computed rank and percentile.
   - **`clientSeq` null-coalesce (P1-2):** Raw SQL inserts fallback to 0 preventing Postgres error 23502.
   - **Multi-stage Dockerfile (P1-3):** Fixes missing OpenSSL binary targets and produces clean 595 MB image.
2. **Performance Flags (HELD DEFAULT OFF):**
   - Load testing data showed `ALL_ON` reduced throughput from 86.0 to 70.6 RPS and increased Submit P95 from 117ms to 219ms at 0ms RTT. Flags do not yet beat baseline; they remain strictly default `false`.

---

## 2. Corrections to Previous Report (Retracted Claims)

The previous report claimed unconditional "GO FOR STAGING". An independent skeptical audit found multiple unproven or contradictory assertions, now formally retracted:
- **Retracted "GO for staging":** Contradicted by the report's own load test data showing flags degraded throughput and submit latency.
- **Retracted "45% lower sync p95":** Sync route does not read the leaderboard; 79ms under `CACHE_LEADERBOARD` was test variance.
- **Retracted "Legacy image 1.4 GB / 57% reduction":** Legacy did not build in production mode; unpruned dev containers are not comparable.
- **Retracted "Legacy memory ~280 MB":** Unmeasured on legacy build.
- **Retracted "Byte-identical when flags OFF":** Replaced with truthful parity claim: identical except for intentional bug fixes (deadline check order, submission concurrency status lock, Stripe lazy init, force-dynamic on teacher pages).
- **Retracted "Connection limit proven effective":** Connection limit was never tested against an unconstrained control run.

---

## 3. Verified Improvements & Bug Fixes

| Area | Legacy State | Hardened State (`perf/exam-runtime-v2`) | Status |
| :--- | :--- | :--- | :--- |
| **Deadline Enforcement** | Answers written before deadline check | Deadline strictly checked before any persistence | **PROVEN** (`tests/unit/exam-deadline-ordering.test.ts`) |
| **Submitter Ranking** | Submitter rank returned `null` if not in top-N | Live percentile & rank calculated for all submitters | **PROVEN** (`tests/unit/exam-ranking-live.test.ts`) |
| **Sequence Nullability** | Null `clientSeq` crashed with Postgres 23502 | `COALESCE($sequence, 0)` in raw SQL upsert | **PROVEN** (`tests/unit/client-seq-coalesce.test.ts`) |
| **Test DB Isolation** | Risk of connecting to remote Supabase dev DB | Startup guard halts on `.env.local` or remote host | **PROVEN** (`tests/unit/guard-test-db.test.ts`) |
| **Parity with Flags OFF** | Parity assumed | 50-attempt replay across 8 flag configurations | **PROVEN** (`scripts/run-flag-matrix.ts`) |

---

## 4. Honest Load Test Findings & Flag Status

| Flag | Default | Stated Purpose | Audit Finding | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `EXAM_RUNTIME_FAST_GRADING` | `false` | Batch grade computation | Neutral at 0ms; negligible delta at 40ms | **NEUTRAL (Keep OFF)** |
| `EXAM_RUNTIME_BATCH_SYNC` | `false` | Atomic raw SQL upsert | Lower RPS at 0ms (70.2 vs 86.0); higher P95 at 40ms | **SLOWER (Keep OFF)** |
| `EXAM_RUNTIME_CACHE_QUESTIONS` | `false` | LRU question cache | Throughput dropped to 70.5 RPS | **SLOWER (Keep OFF)** |
| `EXAM_RUNTIME_CACHE_LEADERBOARD` | `false` | 15s cached top-N slice | Submit P95 increased (168ms vs 117ms) | **SLOWER (Keep OFF)** |
| `EXAM_RATE_LIMIT_ENABLED` | `false` | Token bucket rate limit | Verified functional; fails open test required | **PROVEN (Keep OFF until B4)** |

---

## 5. Rollout Recommendations

1. **Deploy baseline engine with flags OFF**: Captures all critical correctness fixes (deadline, ranking, Postgres 23502, Dockerfile).
2. **Investigate flag overheads in Task A9**: Profile cross-instance cache version check and Prisma query statement counts before enabling any flag.
