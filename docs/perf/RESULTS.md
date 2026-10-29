# Performance & Hardening Verification Results (Audited)

**Hardware Benchmark Environment:**  
- **Processor:** Apple M1 (8 cores)  
- **Host Memory:** 8 GB Unified RAM  
- **Host Operating System:** macOS 26.4 (Darwin 25E246)  
- **Containerization Engine:** Docker Desktop Engine (containerd runtime)  
- **Container Sizing / Limits:** Multi-stage image `trillionskill-perf-app:latest` (595 MB), non-root execution  
- **Isolated Database:** PostgreSQL 16 Alpine via Toxiproxy (`postgres_proxy` upstream on 54336)  

This document presents the audited benchmark and load testing results comparing the legacy exam runtime against the hardened performance runtime (`perf/exam-runtime-v2`).

---

## 1. Executive Summary & Audited Status

| Capability | Legacy Baseline | Hardened Runtime (`perf/exam-runtime-v2`) | Audited Status |
| :--- | :--- | :--- | :--- |
| **Deadline Verification** | Buggy: answers written **before** deadline check | Fixed: deadline strictly verified **before** any write | **PROVEN** (`tests/unit/exam-deadline-ordering.test.ts`) |
| **Answer Sync Batching** | Sequential loop in Prisma transaction | Single atomic PostgreSQL `UNNEST` raw SQL upsert | **PROVEN MECHANISM / NO PROVEN BENEFIT UNDER LOAD** (flags stay OFF) |
| **Exam Grading** | Iterative scoring | Single-query batch calculation + live submitter rank | **PROVEN** (`tests/unit/exam-ranking-live.test.ts`) |
| **Leaderboard Caching** | Broken: returned stale nulls for submitter | 15s TTL top-N cache + live submitter rank calculation | **PROVEN CORRECTNESS / NO BENEFIT UNDER BURST** |
| **Containerization** | Prerender failure without live keys | Multi-stage `node:22-bookworm-slim` (595 MB), non-root | **PROVEN** (Image built and verified) |
| **Connection Safety** | Uncapped connections | Startup validator enforces `?connection_limit` | **PROVEN VALIDATOR** (`lib/prisma.ts`) |

---

## 2. Corrections to Previous Report (Retracted Claims)

1. **Retracted "45% lower sync p95"**: Sync route does not read the leaderboard cache; the drop from 144ms to 79ms under `CACHE_LEADERBOARD` was test variance, not flag causality. Under `BATCH_SYNC` at 40ms, sync p95 actually degraded from 175ms to 222ms.
2. **Retracted "100x query reduction"**: The raw SQL `UNNEST` replaces 100 question loops, but per-request database overhead, transaction boundaries, and version check queries were not individually counted.
3. **Retracted "Connection limit proven effective"**: The baseline and all test runs set `connection_limit=10`. Without an unconstrained control run, claiming proof of bound prevention is unverified.
4. **Retracted "GO for staging"**: The load test data demonstrated that enabling performance flags does not show statistically significant improvement in throughput or latency across real-world herd and burst scenarios.

---

## 3. Audited Rigorous Load Matrix Data (Tasks A10 & A11)

Workload specifications: 300 VUs, 100-Question Exam Paper, Real NextAuth Sessions, 5 Repetitions per cell ($N=5$). Every single run passed all 6 correctness invariants with 0 errors.

| Scenario | Latency Tier | Config | Throughput (RPS) [Median, IQR, [Min, Max]] | P95 Latency (ms) [Median, IQR, [Min, Max]] | Active DB Conns | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **start_herd** | 0 ms | **ALL-OFF** | 59.2 RPS (IQR 0.6) [56.7, 60] | 816 ms (IQR 298) [307, 880] | 10–11 | **BASELINE** |
| **start_herd** | 0 ms | **FAST_GRADING** | 58.2 RPS (IQR 1) [57.6, 59.5] | 439 ms (IQR 340) [311, 781] | 10–11 | NEUTRAL |
| **start_herd** | 0 ms | **ALL-ON** | 59.6 RPS (IQR 0.8) [58.9, 60.1] | 548 ms (IQR 139) [289, 712] | 10–11 | **NO PROVEN BENEFIT** |
| **start_herd** | 40 ms | **ALL-OFF** | 34.1 RPS (IQR 0.9) [32.5, 34.2] | 4391 ms (IQR 581) [4133, 4780] | 10–11 | **BASELINE** |
| **start_herd** | 40 ms | **FAST_GRADING** | 34.2 RPS (IQR 0.2) [33.7, 34.5] | 4256 ms (IQR 60) [4190, 4551] | 10–11 | NEUTRAL |
| **start_herd** | 40 ms | **ALL-ON** | 33.4 RPS (IQR 0.5) [32.9, 33.8] | 4373 ms (IQR 202) [4167, 4434] | 10–11 | **NO PROVEN BENEFIT** |
| **submit_burst** | 0 ms | **ALL-OFF** | 57.4 RPS (IQR 1.2) [56.7, 63.6] | 2585 ms (IQR 95) [2098, 2823] | 10–11 | **BASELINE** |
| **submit_burst** | 0 ms | **FAST_GRADING** | 59.6 RPS (IQR 2.2) [53.5, 63.8] | 2456 ms (IQR 135) [2258, 3096] | 10–11 | NEUTRAL |
| **submit_burst** | 0 ms | **ALL-ON** | 60.8 RPS (IQR 2.4) [54, 62.8] | 2586 ms (IQR 481) [2134, 2809] | 10–11 | **NEUTRAL/FASTER** |
| **submit_burst** | 40 ms | **ALL-OFF** | 21.1 RPS (IQR 0) [20.9, 21.2] | 11469 ms (IQR 163) [11355, 11635] | 10–11 | **BASELINE** |
| **submit_burst** | 40 ms | **FAST_GRADING** | 21 RPS (IQR 0.2) [20.7, 21.2] | 11746 ms (IQR 209) [11424, 11973] | 10–11 | NEUTRAL |
| **submit_burst** | 40 ms | **ALL-ON** | 21.1 RPS (IQR 0.1) [20.9, 21.1] | 11514 ms (IQR 200) [11392, 11644] | 10–11 | **NO PROVEN BENEFIT** |
| **steady** | 0 ms | **ALL-OFF** | 142.8 RPS (IQR 1.6) [133, 146] | 1385 ms (IQR 213) [1023, 1615] | 10–11 | **BASELINE** |
| **steady** | 0 ms | **FAST_GRADING** | 142.3 RPS (IQR 19.5) [96.8, 148.2] | 1148 ms (IQR 1197) [1030, 3086] | 10–11 | NEUTRAL |
| **steady** | 0 ms | **ALL-ON** | 146.3 RPS (IQR 0.4) [137.8, 146.7] | 1118 ms (IQR 159) [984, 1582] | 10–11 | **NEUTRAL/FASTER** |
| **steady** | 40 ms | **ALL-OFF** | 95.9 RPS (IQR 20.8) [64, 104.1] | 3223 ms (IQR 2819) [2199, 13227] | 10–11 | **BASELINE** |
| **steady** | 40 ms | **FAST_GRADING** | 105.5 RPS (IQR 0.7) [94.3, 105.9] | 2364 ms (IQR 216) [2234, 5485] | 10–11 | NEUTRAL |
| **steady** | 40 ms | **ALL-ON** | 102.2 RPS (IQR 4.1) [97.4, 104.1] | 2522 ms (IQR 138) [2174, 2759] | 10–11 | **NEUTRAL/FASTER** |

---

## 4. Bootstrap 95% Confidence Intervals (2,000 Resamples)

| Scenario | Latency Tier | Median $\Delta$ Throughput | Bootstrap 95% CI (Throughput) | Median $\Delta$ P95 Latency | Bootstrap 95% CI (Latency) | Final Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **start_herd** | 0 ms | +0.4 RPS | [-0.8, 2.9] | -268 ms | [-527, 241] | **NO PROVEN BENEFIT** |
| **start_herd** | 40 ms | -0.7 RPS | [-1.2, 0.9] | -18 ms | [-577, 268] | **NO PROVEN BENEFIT** |
| **submit_burst** | 0 ms | +3.4 RPS | [-4.6, 5.4] | +1 ms | [-455, 488] | **NEUTRAL/FASTER** |
| **submit_burst** | 40 ms | 0 RPS | [-0.2, 0.2] | +45 ms | [-184, 231] | **NO PROVEN BENEFIT** |
| **steady** | 0 ms | +3.5 RPS | [-5, 13.3] | -267 ms | [-497, 197] | **NEUTRAL/FASTER** |
| **steady** | 40 ms | +6.3 RPS | [-4.6, 38.2] | -701 ms | [-10705, 336] | **NEUTRAL/FASTER** |

---

## 5. Correctness Invariants Verification (Task A11)

After every load run, the automated invariant verification script executed against the database.
- **zero_double_grading**: 0 duplicate pairs (PASS)
- **score_regrade_parity**: 0 mismatches between recorded score and re-graded answer items (PASS)
- **percentile_monotonicity**: 0 rank/percentile inversions (PASS)
- **no_orphaned_answers**: 0 orphaned answer records (PASS)
- **client_seq_monotonic**: 0 negative/stale sequence violations (PASS)
- **answers_stored_integrity**: 0 missing answer records (PASS)

**Overall Correctness Verdict:** 100% PASS across all scenarios.

---

## 4. Analysis of Flag Slowdowns

1. **Throughput Inversion**: Enabling all flags drops throughput from 86.0 RPS to 70.6 RPS at 0ms and increases Submit P95 from 117ms to 219ms.
2. **Suspected Root Causes to Investigate in Task A9**:
   - Cross-instance version check overhead (`getExamQuestionsVersion` / `getExamLeaderboardVersion`) executing additional database round trips on every read request.
   - Database connection contention or connection-pool overhead inside the container.
   - Resource saturation of the load-test runner process running concurrently on the host.
