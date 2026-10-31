# Staging on Neon — owner runbook

Status: **owner steps only**. Nothing in this repo connects to a remote database.
Do not paste real URLs or passwords into tickets, chat, commits or logs.

## 1. Owner inputs (values never committed)

| Variable NAME | Where it comes from | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon dashboard → **pooled** connection string | Append `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `DIRECT_URL` | Neon dashboard → **direct** (non-pooled) connection string | Used only by migrations; same `sslmode=require` |
| `NEXTAUTH_SECRET` | generate locally (`openssl rand -base64 32`) | required |
| `NEXTAUTH_URL` | staging hostname | `https://staging.aspirantbook.com` |
| `PERSIST_BACKEND` | literal `db` | REQUIRED in production; boot refuses `fs` |
| `HEALTH_DETAILS_TOKEN` | generate locally | enables detailed `/api/health` |

`DATABASE_URL` (pooled) is what the app uses at runtime. `DIRECT_URL` must
**not** point at the `-pooler` host: Prisma migrations need a session-level
connection.

## 2. Apply migrations (owner)

```bash
# DIRECT_URL is the non-pooled Neon host. The script prints only the host.
DIRECT_URL='postgresql://...' scripts/ops/migrate-deploy.sh
```

Expected: `prisma migrate deploy` applies pending migrations, then
`prisma migrate status` prints `Database schema is up to date!`.
The script refuses to run when `DIRECT_URL` is empty and never echoes
credentials.

## 3. Restore verification (owner, against staging)

Run from a machine with `pg_dump`/`pg_restore` matching the server major
version (Neon is 16/17). The script creates a throwaway database on the same
server, restores the dump, compares the row count of every table and drops the
throwaway database.

```bash
SOURCE_URL='postgresql://...direct.../staging_db' scripts/ops/backup-restore-test.sh
```

Expected final line: `backup-restore-test: PASS`. Any mismatch exits non-zero.

## 4. Size baseline (owner)

```bash
psql "$DIRECT_URL" -f scripts/ops/db-size-report.sql
```

Local reference measurement (2026-10-31, `trillionskill_test`): 19 MB total,
`ExamAttempt` 1992 kB / 1122 rows, `ExamAttemptAnswer` 1632 kB / 1022 rows.
That database is tiny; treat it as a shape check, not a capacity forecast.

## 5. Smoke checks (owner)

Run the automated staging smoke test script:

```bash
# Automated smoke suite against staging (refuses non-https unless localhost)
BASE_URL=https://staging.aspirantbook.com scripts/ops/staging-smoke.sh
```

Checks verified automatically:
1. `GET /api/health` → 200, status ok, and payload verified free of secret/credential leaks.
2. B-001 guards: `/admin` 307 redirect, `/api/admin` 401, `/api/auth/role` 404, `POST /api/exam/test/bulk` 401.
3. Public pages: `/login` 200, `/register` 200, `/robots.txt` 200, `/sitemap.xml` 200.
4. Security headers: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `Content-Security-Policy`.
5. Response latency budget verification.

Additional manual checks:
- Detailed health: `curl -H "x-health-details-token: <HEALTH_DETAILS_TOKEN>" https://staging.aspirantbook.com/api/health`
  → 200, `migrations.applied > 0`, `migrations.pending: 0`, `storageBackend: "db"`.
- Exam flow: `R9_BASE_URL=https://staging.aspirantbook.com npx tsx scripts/r9-container-exam-flow.ts`
  → `EXAM_FLOW_PASS`.

## 6. Rules

- Never run `prisma db push`.
- Never point staging tooling at production.
- Keep `DATABASE_URL` pooled and `DIRECT_URL` direct; swapping them causes
  pgbouncer prepared-statement errors or migration timeouts.
- Rotate any URL that was ever pasted into a log.
