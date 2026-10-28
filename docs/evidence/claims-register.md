# Claims Register

**Audit Date:** 2026-10-29  
**Auditor:** Skeptical Senior Auditor  
**Scope:** `perf/exam-runtime-v2` (`docs/perf/FINAL-REPORT.md`, `RESULTS.md`, `RUNBOOK.md`, `OPEN-ISSUES.md`, Part-1 commits `c5311b0`..`2281365`)  

---

## 1. Classification Methodology

- **PROVEN:** Supported by verifiable, reproducible raw command execution in `docs/evidence/raw/` with exact exit codes and reproducible scripts.
- **DISPROVEN:** Contradicted by actual measurements, test failures, or internal contradictions in the submitted reports.
- **UNPROVEN:** Assertion made without sufficient comparative data, baseline run, or verifiable experimental evidence.

---

## 2. Master Claims Table

| ID | Claim Text | Source Document / Commit | Status | Evidence File | Reproduction Command | Date | Notes / Audit Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C-01** | "Verdict: GO FOR STAGING / CONTROLLED PRODUCTION ROLLOUT" | `docs/perf/FINAL-REPORT.md:10` | **DISPROVEN** | `docs/perf/RESULTS.md:27` | `npx tsx tools/loadtest/ablation-harness.ts` | 2026-10-29 | **Retracted.** The report's own load data showed ALL-ON lower throughput (86.0 -> 70.6 RPS) and higher submit P95 (117ms -> 219ms). Staging rollout contradicted by own data. |
| **C-02** | "TypeScript errors 121 -> 0 (-121 errors, 100% clean)" | `docs/perf/FINAL-REPORT.md:57`, `commit e178f9c` | **PROVEN (QUALIFIED)** | `docs/evidence/raw/tsc-truth-analysis.md` | `npx tsc --noEmit` | 2026-10-29 | Root project is genuine 0 errors after real bug fixes in exercises/batch-modal and prisma generate. Mobile workspace has 2 config errors. |
| **C-03** | "Docker image size ~1.4 GB (unpruned dev) -> 595 MB (57% reduction)" | `docs/perf/FINAL-REPORT.md:58` | **DISPROVEN / UNPROVEN** | `docs/evidence/raw/docker-baseline.txt` | `docker build -t legacy ...` | 2026-10-29 | **Retracted.** Report admits legacy failed during build prerender; unpruned 1.4 GB dev image was never an equivalent production artifact. A7 will build legacy with minimal patch. |
| **C-04** | "Legacy memory ~280 MB" | `docs/perf/FINAL-REPORT.md:65`, `RESULTS.md:27` | **UNPROVEN** | `docs/evidence/raw/docker-baseline.txt` | `docker stats` | 2026-10-29 | Baseline memory was recorded on current code with flags OFF, not genuine legacy container. |
| **C-05** | "45% lower sync p95 (144ms -> 79ms)" | `docs/perf/FINAL-REPORT.md:61`, `RESULTS.md:37` | **DISPROVEN** | `docs/perf/RESULTS.md:27` | `npx tsx tools/loadtest/ablation-harness.ts` | 2026-10-29 | **Retracted.** Sync route has no interaction with leaderboard cache; 79ms was noise under `CACHE_LEADERBOARD`. Under `BATCH_SYNC` at 40ms, sync p95 worsened (175ms -> 222ms). |
| **C-06** | "100x query reduction (102 queries -> 1 query via UNNEST raw SQL)" | `docs/perf/FINAL-REPORT.md:59`, `RESULTS.md:6` | **UNPROVEN** | `docs/evidence/raw/flag-overhead-analysis.txt` | Query logging in A9 | 2026-10-29 | The UNNEST upsert is a single statement, but statement counting vs Prisma query log and transaction overhead was not measured in isolation. |
| **C-07** | "When all flags are false, runtime is byte-identical to legacy behaviour" | `docs/perf/FINAL-REPORT.md:12`, `RUNBOOK.md:8` | **DISPROVEN** | `docs/evidence/raw/parity-diff.txt` | `git diff c603168..HEAD -- app/ lib/` | 2026-10-29 | **Retracted / Restated.** Intentional fixes exist with flags OFF: deadline-before-write, submission status lock, force-dynamic, Stripe lazy init. Parity holds except for listed intentional fixes. |
| **C-08** | "Max Active DB Conns: Uncontrolled -> 11–12 connections (connection limit proven effective)" | `docs/perf/FINAL-REPORT.md:64`, `RESULTS.md:39` | **UNPROVEN** | `docs/evidence/raw/connection-evidence.txt` | pg_stat_activity test in A12 | 2026-10-29 | Connection limit was set in every test run including Baseline. Max connections without `connection_limit` was never measured. |
| **C-09** | "Enforce exam deadline check before writes with concurrency submission lock" | `commit 0de90e2`, `FINAL-REPORT.md:21` | **PROVEN** | `docs/evidence/raw/exam-deadline-ordering.txt` | `npx tsx --test tests/unit/exam-deadline-ordering.test.ts` | 2026-10-29 | Unit test verifies late writes return 403 before any AttemptAnswer rows are persisted. |
| **C-10** | "Correct ranking design with live submitter calculation and composite index" | `commit d0542ea`, `FINAL-REPORT.md:25` | **PROVEN** | `docs/evidence/raw/exam-ranking-live.txt` | `npx tsx --test tests/unit/exam-ranking-live.test.ts` | 2026-10-29 | Unit test verifies submitter outside top-N receives calculated live rank and percentile. |
| **C-11** | "Ensure clientSeq coalesces to 0 in raw SQL preventing error 23502" | `commit 95fbc80`, `FINAL-REPORT.md:28` | **PROVEN** | `docs/evidence/raw/client-seq-coalesce.txt` | `npx tsx --test tests/unit/client-seq-coalesce.test.ts` | 2026-10-29 | Unit test confirms missing/null sequence does not trigger PostgreSQL NOT NULL constraint error. |
| **C-12** | "Multi-stage host-agnostic node:22 Dockerfile with binaryTargets and healthcheck" | `commit d40a1f1`, `FINAL-REPORT.md:68` | **PROVEN** | `docs/evidence/raw/docker-build-tip.txt` | `docker build -t test-build .` | 2026-10-29 | Container builds cleanly in standalone environment; image size 595 MB verified. |
| **C-13** | "Rate limit exam routes on web and mobile v1 behind EXAM_RATE_LIMIT_ENABLED" | `commit fd8736d`, `FINAL-REPORT.md:31` | **PROVEN** | `docs/evidence/raw/exam-rate-limiting.txt` | `npx tsx --test tests/unit/exam-rate-limiting.test.ts` | 2026-10-29 | Unit test proves 429 and Retry-After returned when bucket depleted. Fail-open and per-user hardening in A13. |
| **C-14** | "Port FAST_GRADING and batch raw-SQL sync to mobile v1 exam.service.ts" | `commit 4867445`, `FINAL-REPORT.md:43` | **PROVEN** | `docs/evidence/raw/mobile-v1-exam-service-perf.txt` | `npx tsx --test tests/unit/mobile-v1-exam-service-perf.test.ts` | 2026-10-29 | Unit tests verify parity between web and mobile v1 services under feature flags. |
| **C-15** | "Test DB and environment guards rejecting remote Supabase and .env.local" | `commit c5311b0`, `FINAL-REPORT.md:39` | **PROVEN** | `docs/evidence/raw/guard-test-db.txt` | `npx tsx --test tests/unit/guard-test-db.test.ts` | 2026-10-29 | Guard rejects remote Supabase hostnames, non-test ports, and presence of .env.local. |
| **C-16** | "Cross-instance cache invalidation with version checks and AI translation hook" | `commit be2dc0e`, `FINAL-REPORT.md:41` | **PROVEN** | `docs/evidence/raw/cache-invalidation-versioning.txt` | `npx tsx --test tests/unit/cache-invalidation-versioning.test.ts` | 2026-10-29 | Invalidation updates DB version stamp; in-memory cache drops stale entries. |
| **C-17** | "Golden parity 50-attempt replay across 8 flag configurations" | `commit 6cc8396`, `FINAL-REPORT.md:45` | **PROVEN** | `docs/evidence/raw/flag-matrix.txt` | `npx tsx scripts/run-flag-matrix.ts` | 2026-10-29 | All 8 flag combinations produce consistent score, section breakdowns, and submission status. |
| **C-18** | "10-request Docker smoke test: 100% 200/201 responses" | `commit 8951110`, `FINAL-REPORT.md:14` | **PROVEN** | `docs/evidence/raw/smoke-test.txt` | `npx tsx tools/loadtest/smoke-test.ts` | 2026-10-29 | Full exam flow (start -> sync -> submit -> result -> leaderboard) completes successfully against container. |

---

## 3. Retracted Claims Summary

The following claims from previous reports are formally retracted:
1. **"GO FOR STAGING"**: Retracted. Replaced with **CONDITIONAL HOLD / ROLLOUT ONLY OF VERIFIED FIXES**. Performance flags that degrade throughput or increase latency stay default-OFF.
2. **"45% lower sync p95"**: Retracted. Sync p95 improvement was test variance under unrelated flag (`CACHE_LEADERBOARD`).
3. **"Legacy Docker image 1.4 GB / 57% reduction"**: Retracted. Unpruned development image is not a valid baseline against production multi-stage build.
4. **"Legacy memory ~280 MB"**: Retracted. Unmeasured on real legacy container.
5. **"Byte-identical when flags OFF"**: Retracted. Must explicitly state intentional bug fixes and behaviour differences.
6. **"Connection limit proven effective"**: Retracted. Lack of comparative baseline without connection limit means the bound was unproven.
