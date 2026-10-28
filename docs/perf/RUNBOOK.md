# Operations Runbook: High-Performance Exam Runtime & Infrastructure

This runbook documents operations, deployment, testing, monitoring, and rollback procedures for the TrillionSkill high-performance exam runtime (`perf/exam-runtime-v2`).

---

## 1. Architecture & Feature Flag Model

All new performance optimizations are isolated behind environment feature flags that default to **OFF (`false`)**. When flags are OFF, the application executes the byte-identical legacy code paths.

| Flag | Default | Description | Affected Modules |
| :--- | :--- | :--- | :--- |
| `EXAM_RUNTIME_FAST_GRADING` | `false` | Single-query grading with pre-aggregated marks, score, and live submitter rank | `lib/exam-grading.ts`, `lib/services/exam.service.ts` |
| `EXAM_RUNTIME_BATCH_SYNC` | `false` | Monotonic raw SQL `UNNEST` batch upsert for answer autosaving | `app/api/exam/attempt/[attemptId]/sync/route.ts`, `lib/services/exam.service.ts` |
| `EXAM_RUNTIME_CACHE_QUESTIONS` | `false` | In-memory LRU sanitised question set cache with cross-process version invalidation | `lib/exam-questions-cache.ts`, `lib/exam-runtime/cache-invalidation.ts` |
| `EXAM_RUNTIME_CACHE_LEADERBOARD` | `false` | 15s TTL top-N cached leaderboard with live submitter rank injection | `lib/exam-ranking.ts`, `lib/exam-runtime/cache-invalidation.ts` |
| `EXAM_RUNTIME_REDIS_RATELIMIT` | `false` | Optional Redis atomic INCR+EXPIRE limiter falling back to Postgres | `lib/rate-limit.ts` |
| `EXAM_RATE_LIMIT_ENABLED` | `false` | Token bucket rate limiting on start, sync, submit, result, leaderboard | `lib/exam-runtime/exam-rate-limit.ts` |
| `EXAM_REQUIRE_POOL_LIMIT` | `false` | Aborts server boot if `DATABASE_URL` lacks `?connection_limit` | `lib/prisma.ts` |

---

## 2. Docker Operations

### 2.1 Building the Container Image
The container uses a multi-stage `node:22-bookworm-slim` image with OpenSSL 3.0.x binary targets:
```bash
docker build -t trillionskill-perf-app:latest .
```
- **Base image**: `node:22-bookworm-slim`
- **Output size**: ~595 MB
- **Security**: Non-root user (`nextjs:nodejs`, UID 1001)
- **Healthcheck**: Built-in `CMD-SHELL curl -f http://localhost:3000/api/health || exit 1`

### 2.2 Running with Docker Compose
The load testing and staging harness is defined in `docker-compose.loadtest.yml`:
```bash
# Start infrastructure (Postgres, Redis, Toxiproxy)
docker compose -f docker-compose.loadtest.yml up -d postgres redis toxiproxy

# Apply database migrations
env APP_ENV=test DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54335/trillionskill_perf_v2_test" DIRECT_URL="postgresql://postgres:testpassword123@127.0.0.1:54335/trillionskill_perf_v2_test" npx prisma migrate deploy

# Seed 100-question benchmark paper
env APP_ENV=test DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54335/trillionskill_perf_v2_test" npx tsx tools/loadtest/seed-100q-test.ts

# Start the application
docker compose -f docker-compose.loadtest.yml up -d app
```

---

## 3. Running Verification & Load Tests

### 3.1 Unit & Parity Test Suite
Execute the full 40-test exam runtime verification suite:
```bash
env APP_ENV=test DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test?connection_limit=5" \
  npx tsx --test \
  tests/unit/guard-test-db.test.ts \
  tests/unit/exam-deadline-ordering.test.ts \
  tests/unit/exam-ranking-live.test.ts \
  tests/unit/cache-invalidation-versioning.test.ts \
  tests/unit/client-seq-coalesce.test.ts \
  tests/unit/connection-limit-validator.test.ts \
  tests/unit/exam-rate-limiting.test.ts \
  tests/unit/mobile-v1-exam-service-perf.test.ts \
  tests/unit/exam-runtime-golden.test.ts \
  tests/unit/exam-runtime-verification-review.test.ts
```

### 3.2 8-Configuration Parity Matrix
```bash
npx tsx scripts/run-flag-matrix.ts
```

### 3.3 10-Request Docker Smoke Test
Verifies end-to-end functionality against the live container on port 3055:
```bash
env APP_ENV=test DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54335/trillionskill_perf_v2_test" \
  npx tsx tools/loadtest/smoke-test.ts
```

### 3.4 Full Ablation Load Test Matrix
Executes all 18 cells (6 flag configs × 3 latency tiers [0ms, 20ms, 40ms] × 5 repetitions):
```bash
env APP_ENV=test DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54335/trillionskill_perf_v2_test" \
  npx tsx tools/loadtest/ablation-harness.ts
```
Results write to `tools/loadtest/results/ablation-summary.json`.

---

## 4. Database Connection Limits & Sizing

### 4.1 Connection Sizing Formula
To prevent pooler exhaustion when autoscaling container instances:
$$\text{Total Connections} = \text{Container Instances} \times \text{connection\_limit} \le \text{Pooler Capacity}$$

**Example**:
- Supabase / PgBouncer pool capacity: 25 connections
- Target autoscaling instances: 5 containers
- Allocated `connection_limit` per instance: $\lfloor 25 / 5 \rfloor = 5$
- Pinned URL: `DATABASE_URL="postgresql://...?connection_limit=5&pool_timeout=10"`

### 4.2 Enforcing Pool Limits
In staging and production, set:
```env
EXAM_REQUIRE_POOL_LIMIT=true
```
The startup validator in `lib/prisma.ts` will abort boot with `[POOL_LIMIT_ENFORCEMENT_ERROR]` if `?connection_limit` is omitted.

### 4.3 Monitoring Live Connections
Run in PostgreSQL:
```sql
SELECT
  application_name,
  state,
  count(*) AS connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state;
```

---

## 5. Rollback Procedures

Because all schema migrations are **strictly additive** (composite index `idx_examattempt_ranking` on `ExamAttempt`), rolling back requires **zero database downtime and zero migration rollback**:

1. **Immediate Feature Rollback**:
   Set all `EXAM_RUNTIME_*` and `EXAM_RATE_LIMIT_ENABLED` variables to `false`.
   ```bash
   EXAM_RUNTIME_FAST_GRADING=false
   EXAM_RUNTIME_BATCH_SYNC=false
   EXAM_RUNTIME_CACHE_QUESTIONS=false
   EXAM_RUNTIME_CACHE_LEADERBOARD=false
   EXAM_RATE_LIMIT_ENABLED=false
   ```
2. **Container Image Rollback**:
   Redeploy previous container tag. The database schema is 100% backward-compatible with legacy code.
