-- ==============================================================================
-- REMOTE SUPABASE DATABASE AUDIT PACK (READ-ONLY)
-- Purpose: Detect whether any writes occurred on remote Supabase DB during Task B / loadtests
-- Usage: Run in the Supabase SQL Editor as a project owner.
-- Safe: Performs ONLY SELECT queries (no writes, no drops, no state changes).
-- ==============================================================================

-- 1. Table Mutation Counters from PostgreSQL Statistics
-- Inspect total inserts, updates, and deletes recorded by Postgres on key tables.
SELECT
    relname AS table_name,
    seq_scan,
    idx_scan,
    n_tup_ins AS total_inserts,
    n_tup_upd AS total_updates,
    n_tup_del AS total_deletes,
    n_live_tup AS estimated_live_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN (
    'User',
    'Account',
    'ExamAttempt',
    'ExamAttemptAnswer',
    'AuditLog',
    'DeviceSession',
    'DemoStageSession',
    'Payment'
)
ORDER BY relname ASC;

-- 2. Activity in the Last 48 Hours Across Core Models
-- Checks if any rows were created or modified within the 48-hour window.
WITH window_metrics AS (
    SELECT
        'User' AS entity,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '48 hours') AS created_last_48h,
        COUNT(*) FILTER (WHERE "updatedAt" >= NOW() - INTERVAL '48 hours') AS updated_last_48h,
        MAX("createdAt") AS latest_created_at,
        MAX("updatedAt") AS latest_updated_at
    FROM "User"

    UNION ALL

    SELECT
        'Account' AS entity,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '48 hours') AS created_last_48h,
        COUNT(*) FILTER (WHERE "updatedAt" >= NOW() - INTERVAL '48 hours') AS updated_last_48h,
        MAX("createdAt") AS latest_created_at,
        MAX("updatedAt") AS latest_updated_at
    FROM "Account"

    UNION ALL

    SELECT
        'ExamAttempt' AS entity,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE "startedAt" >= NOW() - INTERVAL '48 hours') AS created_last_48h,
        COUNT(*) FILTER (WHERE "submittedAt" >= NOW() - INTERVAL '48 hours') AS updated_last_48h,
        MAX("startedAt") AS latest_created_at,
        MAX("submittedAt") AS latest_updated_at
    FROM "ExamAttempt"

    UNION ALL

    SELECT
        'ExamAttemptAnswer' AS entity,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '48 hours') AS created_last_48h,
        COUNT(*) FILTER (WHERE "updatedAt" >= NOW() - INTERVAL '48 hours') AS updated_last_48h,
        MAX("createdAt") AS latest_created_at,
        MAX("updatedAt") AS latest_updated_at
    FROM "ExamAttemptAnswer"

    UNION ALL

    SELECT
        'AuditLog' AS entity,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '48 hours') AS created_last_48h,
        0 AS updated_last_48h,
        MAX("createdAt") AS latest_created_at,
        NULL AS latest_updated_at
    FROM "AuditLog"
)
SELECT * FROM window_metrics
ORDER BY created_last_48h DESC, updated_last_48h DESC;

-- 3. Detailed Audit for Suspect Synthetic / Load Test Exam Attempts (Last 48 Hours)
SELECT
    id,
    "userId",
    "testId",
    status,
    score,
    "startedAt",
    "submittedAt"
FROM "ExamAttempt"
WHERE "startedAt" >= NOW() - INTERVAL '48 hours'
   OR "submittedAt" >= NOW() - INTERVAL '48 hours'
ORDER BY "startedAt" DESC
LIMIT 50;

-- 4. Recent Users / Accounts Created in Last 48 Hours
SELECT
    id,
    email,
    name,
    role,
    "createdAt"
FROM "User"
WHERE "createdAt" >= NOW() - INTERVAL '48 hours'
   OR email LIKE '%test%'
   OR email LIKE '%perf%'
   OR email LIKE '%loadtest%'
ORDER BY "createdAt" DESC
LIMIT 50;

-- ==============================================================================
-- INSTRUCTIONS FOR READING RESULTS:
-- 1. Query 1 (pg_stat_user_tables): Look at total_inserts and total_updates.
--    If these are stable or low single digits corresponding to manual admin actions,
--    no high-volume synthetic load touched remote DB.
-- 2. Query 2 (window_metrics): If `created_last_48h` or `updated_last_48h` is 0
--    (or matches known manual testing), remote DB is completely clean.
-- 3. Queries 3 & 4: Ensure no test users (`verify_u%`, `loadtest_%`, `@trillionskill.test`)
--    or unexpected ExamAttempt rows exist.
-- ==============================================================================
