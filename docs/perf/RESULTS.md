# Performance & Hardening Verification Results (Audited)

This document presents the audited benchmark and load testing results comparing the legacy exam runtime against the hardened performance runtime (`perf/exam-runtime-v2`).

---

## 1. Executive Summary & Audited Status

| Capability | Legacy Baseline | Hardened Runtime (`perf/exam-runtime-v2`) | Audited Status |
| :--- | :--- | :--- | :--- |
| **Deadline Verification** | Buggy: answers written **before** deadline check | Fixed: deadline strictly verified **before** any write | **PROVEN** (`tests/unit/exam-deadline-ordering.test.ts`) |
| **Answer Sync Batching** | Sequential loop in Prisma transaction | Single atomic PostgreSQL `UNNEST` raw SQL upsert | **PROVEN MECHANISM / UNPROVEN SPEEDUP** (flags slower under load) |
| **Exam Grading** | Iterative scoring | Single-query batch calculation + live submitter rank | **PROVEN** (`tests/unit/exam-ranking-live.test.ts`) |
| **Leaderboard Caching** | Broken: returned stale nulls for submitter | 15s TTL top-N cache + live submitter rank calculation | **PROVEN CORRECTNESS / SLOWER UNDER LOAD** |
| **Containerization** | Prerender failure without live keys | Multi-stage `node:22-bookworm-slim` (595 MB), non-root | **PROVEN** (Image built and verified) |
| **Connection Safety** | Uncapped connections | Startup validator enforces `?connection_limit` | **PROVEN VALIDATOR / UNPROVEN EFFECTIVENESS** (Needs unconstrained baseline) |

---

## 2. Corrections to Previous Report (Retracted Claims)

1. **Retracted "45% lower sync p95"**: Sync route does not read the leaderboard cache; the drop from 144ms to 79ms under `CACHE_LEADERBOARD` was test variance, not flag causality. Under `BATCH_SYNC` at 40ms, sync p95 actually degraded from 175ms to 222ms.
2. **Retracted "100x query reduction"**: The raw SQL `UNNEST` replaces 100 question loops, but per-request database overhead, transaction boundaries, and version check queries were not individually counted.
3. **Retracted "Connection limit proven effective"**: The baseline and all test runs set `connection_limit=10`. Without an unconstrained control run, claiming proof of bound prevention is unverified.
4. **Retracted "GO for staging"**: The load test data demonstrated that enabling performance flags reduced throughput (86.0 -> 70.6 RPS) and increased submit latency (117ms -> 219ms).

---

## 3. Audited Load Test Data (Toxiproxy Matrix)

Measurements below reflect 5 repetitions ($N = 5$) on production container `trillionskill-perf-app:latest` with Toxiproxy network latency to PostgreSQL (`trillionskill_perf_v2_test`).

| Configuration | Latency Tier | Throughput (RPS) [Mean ± SD] | Sync P95 (ms) [Mean ± SD] | Submit P95 (ms) [Mean ± SD] | Active DB Conns | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline (All Flags OFF)** | 0 ms | $86.0 \pm 24.9$ | $144 \pm 119$ | $117 \pm 23$ | 11 | **BASELINE** |
| **Baseline (All Flags OFF)** | 20 ms | $52.8 \pm 4.3$ | $133 \pm 35$ | $317 \pm 10$ | 11 | **BASELINE** |
| **Baseline (All Flags OFF)** | 40 ms | $35.2 \pm 2.1$ | $175 \pm 32$ | $537 \pm 8$ | 11 | **BASELINE** |
| **Single Flag: FAST_GRADING ON** | 0 ms | $92.7 \pm 28.8$ | $136 \pm 116$ | $120 \pm 26$ | 11 | **NEUTRAL** |
| **Single Flag: FAST_GRADING ON** | 20 ms | $55.5 \pm 0.5$ | $114 \pm 16$ | $321 \pm 10$ | 12 | **NEUTRAL** |
| **Single Flag: FAST_GRADING ON** | 40 ms | $35.4 \pm 1.7$ | $166 \pm 18$ | $549 \pm 15$ | 11 | **NEUTRAL** |
| **Single Flag: BATCH_SYNC ON** | 0 ms | $70.2 \pm 28.3$ | $116 \pm 48$ | $177 \pm 59$ | 11 | **SLOWER** |
| **Single Flag: BATCH_SYNC ON** | 20 ms | $48.7 \pm 3.0$ | $133 \pm 23$ | $339 \pm 14$ | 11 | **SLOWER** |
| **Single Flag: BATCH_SYNC ON** | 40 ms | $33.5 \pm 3.1$ | $222 \pm 93$ | $562 \pm 22$ | 11 | **SLOWER** |
| **Single Flag: CACHE_QUESTIONS ON** | 0 ms | $70.5 \pm 10.8$ | $127 \pm 27$ | $162 \pm 21$ | 11 | **SLOWER** |
| **Single Flag: CACHE_QUESTIONS ON** | 20 ms | $50.6 \pm 7.9$ | $127 \pm 42$ | $346 \pm 17$ | 11 | **SLOWER** |
| **Single Flag: CACHE_QUESTIONS ON** | 40 ms | $35.1 \pm 1.0$ | $161 \pm 26$ | $555 \pm 17$ | 11 | **NEUTRAL** |
| **Single Flag: CACHE_LEADERBOARD ON** | 0 ms | $85.9 \pm 17.0$ | $79 \pm 29$ | $168 \pm 40$ | 11 | **SLOWER (Submit P95)** |
| **Single Flag: CACHE_LEADERBOARD ON** | 20 ms | $51.0 \pm 2.0$ | $122 \pm 41$ | $348 \pm 14$ | 12 | **SLOWER** |
| **Single Flag: CACHE_LEADERBOARD ON** | 40 ms | $30.5 \pm 5.6$ | $206 \pm 100$ | $619 \pm 59$ | 11 | **SLOWER** |
| **All Flags ON** | 0 ms | $70.6 \pm 12.7$ | $83 \pm 16$ | $219 \pm 68$ | 11 | **SLOWER** |
| **All Flags ON** | 20 ms | $47.1 \pm 2.1$ | $114 \pm 19$ | $399 \pm 39$ | 11 | **SLOWER** |
| **All Flags ON** | 40 ms | $32.9 \pm 2.7$ | $178 \pm 47$ | $601 \pm 55$ | 11 | **SLOWER** |

---

## 4. Analysis of Flag Slowdowns

1. **Throughput Inversion**: Enabling all flags drops throughput from 86.0 RPS to 70.6 RPS at 0ms and increases Submit P95 from 117ms to 219ms.
2. **Suspected Root Causes to Investigate in Task A9**:
   - Cross-instance version check overhead (`getExamQuestionsVersion` / `getExamLeaderboardVersion`) executing additional database round trips on every read request.
   - Database connection contention or connection-pool overhead inside the container.
   - Resource saturation of the load-test runner process running concurrently on the host.
