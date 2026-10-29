# Part C: Attempt Compaction Verification & Engineering Report

**Date:** 2026-10-29  
**Auditor:** Skeptical Senior Auditor  
**Branch:** `feat/attempt-compaction`  
**Test Database Container:** `trillionskill-compact-db` (`127.0.0.1:54345`)  
**Hardware Profile:** Apple Silicon (macOS), Docker PostgreSQL 16 Alpine

---

## 1. Executive Summary

Exam runtime storage in TrillionSkill is heavily dominated by `ExamAttemptAnswer` rows: each 100-question exam generates 100 individual database rows per attempt across 3 B-Tree indexes. At 10,000 attempts, `ExamAttemptAnswer` consumed **188.87 MB** (89 MB table + 91 MB indexes).

We implemented an additive compaction architecture:
1. **Schema:** Additive `ExamAttemptArchive` table storing submitted attempt answers as structured JSONB (`answersBlob`), linked by unique `attemptId`.
2. **Feature Flag:** `EXAM_ATTEMPT_COMPACTION_ENABLED` (default `false`). When `true`, student review (`GET /api/exam/attempt/:id/result`) queries the single archive row first, with transparent fallback to `ExamAttemptAnswer`.
3. **Batch Compactor:** `scripts/compact-attempts.ts` supporting `--dry-run`, `--batch-size`, `--days-old`, `--exam-id`, and `--purge`.
4. **Field Verifier:** `scripts/verify-compaction.ts` asserting 100% field-by-field parity between raw and archived rows.

---

## 2. Empirical Storage Measurements

Measurements captured on PostgreSQL 16 Alpine with 10,020 attempts (1,002,000 answers):

| Table / Relation | Metric | Baseline (Pre-Compaction) | Post-Compaction (After Purge + VACUUM FULL) | Absolute Delta | Relative Change |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ExamAttemptAnswer` Table** | Table Size | 89.04 MB (93,364,224 bytes) | 0 bytes (0 bytes) | -89.04 MB | **-100.0%** |
| **`ExamAttemptAnswer` Indexes** | Index Size | 91.03 MB (95,453,184 bytes) | 32 kB (32,768 bytes) | -91.00 MB | **-99.96%** |
| **`ExamAttemptArchive` Table** | Table Size | 0 bytes | 15.65 MB (16,408,576 bytes) | +15.65 MB | (New Table) |
| **`ExamAttemptArchive` Indexes**| Index Size | 0 bytes | 1.22 MB (1,277,952 bytes) | +1.22 MB | (New Indexes) |
| **`ExamAttempt` Table + Indexes**| Meta Size | 4.20 MB (4,407,296 bytes) | 4.20 MB (4,407,296 bytes) | 0 bytes | 0.0% |
| **Total Storage (Answers + Archive)** | **Total Disk** | **188.87 MB (188,817,408 bytes)** | **17.73 MB (17,735,680 bytes)** | **-171.14 MB** | **-90.62% Savings** |

### Per-Attempt Footprint
- **Pre-Compaction:** ~18.84 kB per attempt (188.4 bytes per answer row including 3 indexes).
- **Post-Compaction:** ~1.76 kB per attempt (17.6 bytes per answer equivalent).
- **Net Space Savings:** **90.62% reduction** in disk storage.

---

## 3. Query Latency Benchmarks (n=20 Runs Each)

All metrics report sample size $n=20$, minimum, maximum, median, interquartile range (IQR), and 95th percentile (p95):

| Query / Operation | Baseline Median (ms) | Baseline IQR (ms) | Baseline p95 (ms) | Compacted Median (ms) | Compacted IQR (ms) | Compacted p95 (ms) | Latency Delta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Student Review** | 1.96 ms | 0.47 ms | 5.43 ms | 5.35 ms | 1.56 ms | 19.81 ms | +3.39 ms |
| **Teacher Question Analytics** | **210.12 ms** | 85.35 ms | 311.38 ms | **439.82 ms** | 105.00 ms | 698.95 ms | **+229.70 ms (2.09x slower)** |
| **Live Exam Submit** | 12.74 ms | 2.47 ms | 61.44 ms | 12.20 ms | 1.66 ms | 21.88 ms | -0.54 ms (Identical) |

### Performance Analysis & The Engineering Tradeoff
1. **Student Review:** Remains under 6 ms median (5.35 ms) on 100-question reviews. While slightly higher than the raw unjoined query due to JSONB parsing in Node.js, it avoids scanning large multi-megabyte tables.
2. **Teacher Analytics Degradation:** As predicted in our C2 Reader/Writer Inventory, running cross-attempt question aggregations across 10,000 attempts via `jsonb_array_elements` took **439.82 ms** vs **210.12 ms** on normalized rows — a **2.09x slowdown**. This is the direct CPU cost of decompressing and parsing 10,000 JSON blobs in PostgreSQL.
3. **Live Exam Submit:** Completely unaffected (12.20 ms vs 12.74 ms). Live student autosave and submission continue to write to `ExamAttemptAnswer` without touching the archive.

---

## 4. Correctness, Parity & Crash Consistency Proofs

1. **Field-by-Field Parity Verifier (`scripts/verify-compaction.ts`):**
   - Sampled 1,000 attempts (100,000 individual answers).
   - Asserted `questionId`, `selectedOption`, `isCorrect`, `marksAwarded`, `timeSpentSecs`, `isMarked`, `score`, and `submittedAt`.
   - **Result:** 0 mismatches across all 100,000 answers (**100.00% match rate**).
   - Verified across 5 consecutive runs with 0 failures (`docs/evidence/raw/compaction-verification-5x.txt`).
2. **End-to-End API Byte Parity (`scripts/test-compaction-api-parity.ts`):**
   - Executed `GET /api/exam/attempt/:id/result` across 20 distinct attempts under both `EXAM_ATTEMPT_COMPACTION_ENABLED=false` and `true`.
   - Asserted byte-for-byte serialized JSON response equality.
   - **Result:** 20/20 attempts produced **100% byte-identical** responses.
   - Passed 5 consecutive test runs (`docs/evidence/raw/compaction-api-parity-5x.txt`).
3. **Crash Consistency (`scripts/test-compaction-crash-consistency.ts`):**
   - Terminated batch compactor mid-execution via `SIGKILL` (kill -9).
   - Database inspection proved 0 corrupted rows and 0 broken JSON blobs.
   - Re-running the compactor resumed cleanly and completed all 10,020 attempts with 0 duplicate rows (`docs/evidence/raw/compaction-crash-test.txt`).

---

## 5. Explicit Disclaimers & Rollout Recommendation

### Scope of Compaction
- Compaction applies **only** to submitted, graded attempts that are processed by the batch compaction job (`scripts/compact-attempts.ts`).
- Active in-flight attempts (`IN_PROGRESS`), questions (`ExamQuestion`), sections (`ExamSection`), tests (`ExamTest`), users, and enrollments remain completely untouched.

### Adoption Recommendation
- **Current State:** TrillionSkill's production database has fewer than 10,000 total lifetime attempts. At current scale, the uncompacted table occupies < 200 MB, well within standard Postgres free-tier / small instance limits.
- **Recommendation:**
  1. Keep `EXAM_ATTEMPT_COMPACTION_ENABLED=false` (OFF) in production initially.
  2. Merge the additive migration and compaction tools into `main`.
  3. Schedule the compaction batch job (`scripts/compact-attempts.ts --days-old 30 --purge`) only when `ExamAttemptAnswer` row count exceeds **5,000,000 rows** (~1 GB disk) or when storage limits dictate archiving older attempts.
  4. If real-time teacher cross-attempt question analytics are deployed in the future, build a dedicated aggregate table (`QuestionAnalyticsSummary`) updated at submit time, rather than relying on on-the-fly SQL `jsonb_array_elements` over millions of archive blobs.
