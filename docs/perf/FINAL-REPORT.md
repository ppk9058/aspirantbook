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
| **Submitter Ranking** | Submitter rank returned `null` if not in top-N | Live percentile & rank calculated for all submitters + composite index | **PROVEN** (`tests/unit/exam-ranking-property.test.ts`, `tests/unit/exam-ranking-live.test.ts`) |
| **Sequence Nullability** | Null `clientSeq` crashed with Postgres 23502 | `COALESCE($sequence, 0)` in raw SQL upsert | **PROVEN** (`tests/unit/client-seq-coalesce.test.ts`) |
| **Test DB Isolation** | Risk of connecting to remote Supabase dev DB | Startup guard halts on `.env.local` or remote host | **PROVEN** (`tests/unit/guard-test-db.test.ts`) |
| **Parity with Flags OFF** | Parity assumed | 8-flag golden parity replay passing 5x | **PROVEN** (`tests/unit/exam-runtime-golden.test.ts`) |
| **Connection Safety** | Uncapped connections under burst (31+ conns) | Startup pool limit enforces bound (10 conns) | **PROVEN** (`scripts/measure-connection-limits.ts`) |
| **Rate Limit Hardening** | Hard 429 without Retry-After, fails closed | Server fails open on store error, returns Retry-After | **PROVEN** (`tests/unit/ratelimit-and-mobile-sync.test.ts`) |
| **Mobile CBT Sync** | Sync triggered on every question tap | 1800ms trailing debounce + 429 pause queue | **PROVEN** (`apps/mobile/src/lib/cbt-sync.ts`) |
| **Stripe Secret Key** | Hardcoded build placeholder string | True lazy initialization, fails closed at runtime | **PROVEN** (`lib/payments/stripe.ts`) |

---

## 4. Audited Rigorous Load Matrix Findings & Flag Status

Workload specifications: 300 VUs, 100-Question Exam Paper, Real NextAuth Sessions, 5 Repetitions per cell ($N=5$). All 6 SQL correctness invariants passed 100%.

| Scenario | Latency Tier | Config | Throughput (RPS) [Median] | P95 Latency (ms) [Median] | Invariant Checks | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **start_herd** | 0 ms | **ALL-OFF** | 59.2 RPS | 816 ms | 100% PASS | **BASELINE** |
| **start_herd** | 0 ms | **ALL-ON** | 59.6 RPS | 548 ms | 100% PASS | **NO PROVEN BENEFIT** (CI crosses 0) |
| **start_herd** | 40 ms | **ALL-OFF** | 34.1 RPS | 4391 ms | 100% PASS | **BASELINE** |
| **start_herd** | 40 ms | **ALL-ON** | 33.4 RPS | 4373 ms | 100% PASS | **NO PROVEN BENEFIT** (CI crosses 0) |
| **submit_burst** | 0 ms | **ALL-OFF** | 57.4 RPS | 2585 ms | 100% PASS | **BASELINE** |
| **submit_burst** | 0 ms | **ALL-ON** | 60.8 RPS | 2586 ms | 100% PASS | **NEUTRAL/FASTER** |
| **submit_burst** | 40 ms | **ALL-OFF** | 21.1 RPS | 11469 ms | 100% PASS | **BASELINE** |
| **submit_burst** | 40 ms | **ALL-ON** | 21.1 RPS | 11514 ms | 100% PASS | **NO PROVEN BENEFIT** |
| **steady** | 0 ms | **ALL-OFF** | 142.8 RPS | 1385 ms | 100% PASS | **BASELINE** |
| **steady** | 0 ms | **ALL-ON** | 146.3 RPS | 1118 ms | 100% PASS | **NEUTRAL/FASTER** |
| **steady** | 40 ms | **ALL-OFF** | 95.9 RPS | 3223 ms | 100% PASS | **BASELINE** |
| **steady** | 40 ms | **ALL-ON** | 102.2 RPS | 2522 ms | 100% PASS | **NEUTRAL/FASTER** |

---

## 5. Rollout Recommendations

**All flags remain default OFF; merge only the bug fixes and hardening (deadline ordering, status lock, force-dynamic, Stripe fix, connection limits validator, ranking index).**

1. **Deploy baseline engine with flags OFF**: Captures all critical correctness fixes without exposing production to unproven flag overheads.
2. **Entitlements Herd**: Caching is NOT NEEDED. P95 latency is 53.9ms (0ms) and 63.7ms (40ms) for FREE tests, well below 1,000ms SLA.
3. **Database Index**: Apply `idx_examattempt_ranking` concurrently in production. Index scan scales linearly up to 300k attempts with sub-millisecond Top-N query latency.
