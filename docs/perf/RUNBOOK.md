# Operations Runbook: Exam Runtime & Infrastructure (Audited)

This runbook documents operations, deployment, testing, monitoring, and rollback procedures for the TrillionSkill exam runtime (`perf/exam-runtime-v2`).

---

## 1. Feature Flag Model & Rollout Status

All new performance optimizations are isolated behind environment feature flags that default to **OFF (`false`)**.

### 1.1 Flag Status & Rollout Eligibility

| Flag | Default | Stated Purpose | Rollout Eligibility | Current Setting |
| :--- | :--- | :--- | :--- | :--- |
| `EXAM_RUNTIME_FAST_GRADING` | `false` | Single-query grading with pre-aggregated marks | **HOLD** (Neutral benefit) | `false` |
| `EXAM_RUNTIME_BATCH_SYNC` | `false` | Monotonic raw SQL `UNNEST` batch upsert | **HOLD** (Measured slower under load) | `false` |
| `EXAM_RUNTIME_CACHE_QUESTIONS` | `false` | In-memory LRU sanitised question set cache | **HOLD** (Measured slower under load) | `false` |
| `EXAM_RUNTIME_CACHE_LEADERBOARD` | `false` | 15s TTL top-N cached leaderboard | **HOLD** (Submit P95 degradation) | `false` |
| `EXAM_RUNTIME_REDIS_RATELIMIT` | `false` | Redis atomic INCR+EXPIRE limiter | **HOLD** (Requires fail-open proof) | `false` |
| `EXAM_RATE_LIMIT_ENABLED` | `false` | Token bucket rate limiting on exam routes | **HOLD** (Keep OFF until TRUST_PROXY hardened) | `false` |
| `EXAM_REQUIRE_POOL_LIMIT` | `false` | Aborts server boot if `DATABASE_URL` lacks limit | **ENABLED FOR STAGING/PROD** | `true` (Staging/Prod) |

> **IMPORTANT RULE:** All flags remain default OFF; merge only the bug fixes and hardening (deadline ordering, status lock, force-dynamic, Stripe fix, connection limits validator, ranking index). Only flags proven faster by rigorous load testing (bootstrap 95% CI excluding 0 in the improving direction) without correctness regressions will ever be considered for activation. All flags with no proven benefit stay default `OFF`.

---

## 2. Corrections to Previous Report (Retracted Claims)

1. **Retracted "Immediate Staging Rollout of All Flags"**: The previous runbook advised enabling performance flags. All flags are now set to stay strictly `false` until overheads are investigated and resolved.
2. **Retracted "Byte-identical when flags OFF"**: Parity is qualified: identical for all inputs except intentional bug fixes (deadline check before write, concurrency submission lock, force-dynamic on teacher pages, lazy Stripe initialization).

---

## 3. Docker & Deployment Operations

### 3.1 Multi-Stage Container Build
```bash
docker build -t trillionskill-perf-app:latest .
```
- **Base image**: `node:22-bookworm-slim`
- **Output size**: ~595 MB
- **Security**: Runs as non-root `nextjs:nodejs` (UID 1001)
- **Healthcheck**: Built-in `CMD-SHELL curl -f http://localhost:3000/api/health || exit 1`

### 3.2 Safe Production / Staging Environment Configuration
Deploy with flags **OFF** to safely receive bug fixes:
```env
EXAM_RUNTIME_FAST_GRADING=false
EXAM_RUNTIME_BATCH_SYNC=false
EXAM_RUNTIME_CACHE_QUESTIONS=false
EXAM_RUNTIME_CACHE_LEADERBOARD=false
EXAM_RATE_LIMIT_ENABLED=false
EXAM_REQUIRE_POOL_LIMIT=true
DATABASE_URL="postgresql://user:password@host:port/dbname?connection_limit=5&pool_timeout=10"
```

---

## 4. Rollback Procedures

All schema migrations are **strictly additive** (composite index `idx_examattempt_ranking` on `ExamAttempt`). Rolling back requires **zero migration rollback and zero database downtime**:

1. **Feature Rollback**:
   Verify all `EXAM_RUNTIME_*` and `EXAM_RATE_LIMIT_ENABLED` variables are `false`.
2. **Container Image Rollback**:
   Redeploy previous container tag. The database schema is 100% backward-compatible.
