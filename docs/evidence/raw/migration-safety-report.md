# Migration Safety & Ranking Index Production Runbook (Task A6)

**Audit Date:** 2026-10-29  
**Branch:** `perf/exam-runtime-v2`  
**Auditor:** Skeptical Senior Auditor  

---

## 1. Verification Summary

| Check | Tool / Command | Exit Code | Result |
| :--- | :--- | :--- | :--- |
| **Prisma Migration Status** | `npx prisma migrate status` | 0 | Clean. 29 migrations applied; database schema is up to date. |
| **Prisma Schema Drift** | `npx prisma migrate diff` | 0 | Clean. Zero drift detected between datamodel and live database. |
| **Additive Migration Check** | `./scripts/check-migrations-additive` | 0 | Clean. All 30 migration folders scanned with zero unallowlisted violations. |
| **Index Creation Idempotency** | `CREATE INDEX IF NOT EXISTS` | 0 | Verified in migration SQL `20261029000000_add_exam_attempt_ranking_index`. |

---

## 2. Table Sizing & Index Build Benchmark (100k Attempts)

Measured on PostgreSQL 16 test database (`trillionskill_perf_v2_test`) on port 54329:

- **Row Count:** 100,027 attempts
- **Table Size (Heap):** 16 MB
- **Total Existing Indexes Size:** 40 MB
- **Total Relation Size:** 56 MB
- **`idx_examattempt_ranking` Index Size:** 6,640 kB (~6.5 MB)
- **Standard Index Build Time:** **187.79 ms**

---

## 3. Lock Behavior & Production-Safe Deployment Procedure

### Lock Behavior
- Standard `CREATE INDEX` acquires a **`ShareLock`** on `ExamAttempt`. This allows concurrent `SELECT` queries but blocks concurrent data modifications (`INSERT`, `UPDATE`, `DELETE`) until index construction completes.
- On a 100k-row table, the lock duration is under 200 ms. However, under high-throughput live exam conditions (e.g. a burst of autosaves or submissions), even a 200 ms lock may queue connection requests.
- `CREATE INDEX CONCURRENTLY` acquires a weaker **`ShareUpdateExclusiveLock`**, permitting concurrent reads and writes (`INSERT`, `UPDATE`, `DELETE`).
- **Prisma Limitation:** `prisma migrate deploy` wraps each migration file in a transaction block. PostgreSQL rejects `CREATE INDEX CONCURRENTLY` inside transactions (`ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`).

### Production-Safe Execution Procedure

#### Procedure A: Zero-Downtime Concurrent Pre-Indexing (Recommended for High Traffic)
1. **Prior to deploying the code**, execute the concurrent index creation statement directly in PostgreSQL (via `psql` or Supabase SQL Editor outside a transaction block):
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_examattempt_ranking"
   ON "ExamAttempt"("testId", "score" DESC, "timeTakenSecs" ASC, "submittedAt" ASC);
   ```
2. **Deploy the application and run Prisma migrations**:
   ```bash
   npx prisma migrate deploy
   ```
   Because migration `20261029000000_add_exam_attempt_ranking_index` specifies `CREATE INDEX IF NOT EXISTS`, PostgreSQL detects that the index is already present and returns immediately (0 ms execution time, zero locking).

#### Procedure B: Off-Peak Automated Deployment
If deploying during an off-peak maintenance window:
1. Run `npx prisma migrate deploy`.
2. The index builds in ~188 ms per 100,000 attempts with standard `CREATE INDEX IF NOT EXISTS`.
