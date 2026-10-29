# No Local-Disk Writes Report (Task B3)

**Audit Date:** 2026-10-29  
**Branch:** `feat/launch-blockers`  
**Auditor:** Skeptical Senior Auditor  

---

## 1. File System Write APIs Grep Inventory

Full grep across `app/`, `lib/`, `packages/` for `writeFile`, `appendFile`, `mkdir`, `createWriteStream`, `rename`, `unlink`, `rmSync`, `rmdir`, `writeSync`:

| File | Line | API Call | Purpose / Domain | Remediation Under `PERSIST_BACKEND=db` |
| :--- | :--- | :--- | :--- | :--- |
| `lib/email.ts` | 63 | `fs.mkdirSync(OUTBOX_DIR)` | Dev/Test email outbox folder | Replaced with Postgres `EmailOutbox` table |
| `lib/email.ts` | 77 | `fs.appendFileSync(OUTBOX_FILE)` | Dev/Test email JSONL outbox | Replaced with `prisma.emailOutbox.create` |
| `lib/security/upload-policy.ts` | 227 | `fs.mkdir(targetDir)` | Local upload directory creation | S3/MinIO client used (`uploadToS3`); fails closed with 503 if unconfigured in prod |
| `lib/security/upload-policy.ts` | 228 | `fs.writeFile(resolved, buffer)` | Local disk file write | Replaced with S3/MinIO `PutObjectCommand` |
| `lib/doubts-service.ts` | 29 | (Doc comment) `fs.writeFile` | Legacy student doubts | Replaced with Postgres `Doubt` table |
| `lib/forms-service.ts` | 11 | (Doc comment) `fs.writeFile` | Legacy form submissions | Replaced with Postgres `FormSubmission` table |
| `lib/actions/admin/audit.ts` | 18 | (Doc comment) `fs.appendFileSync`| Legacy audit events | Replaced with Postgres `AuditEvent` table |
| `app/api/admin/homepage-cards/route.ts` | 8 | (Doc comment) `fs.writeFileSync` | Legacy homepage cards | Stored in Postgres |
| `lib/actions/admin/settings.ts` | 16 | (Doc comment) `fs.writeFileSync` | Legacy platform settings | Stored in Postgres |
| `lib/testing/test-user-helper.ts` | 19 | `fs.writeFileSync` | Test manifest creation | Test harness helper |

---

## 2. Persistence Architecture (`PERSIST_BACKEND`)

The application supports dual persistence backends via `PERSIST_BACKEND` (`lib/storage/persist-backend.ts`):
- **`PERSIST_BACKEND="fs"` (Legacy default)**: Preserves legacy behaviour by writing dev emails to `.email-outbox/outbox.jsonl`, doubts to `data/doubts.json`, forms to `data/form-submissions.json`, and audit events to `.content-audit/audit-events.jsonl`.
- **`PERSIST_BACKEND="db"` (Production / Read-Only container)**: Routes all persistence to PostgreSQL (`EmailOutbox`, `Doubt`, `FormSubmission`, `AuditEvent`, `Book`) and S3/MinIO object storage (`lib/s3.ts`). Zero local disk writes occur.

---

## 3. One-Off Import Script (`scripts/import-fs-to-db.ts`)

A read-only, idempotent import script transfers legacy file-based records to PostgreSQL:
- **Dry-run mode (`--dry-run`)**: Scans and validates records without writing to the database.
- **Idempotency**: Multiple runs use `upsert` or hash-deduplicated keys, ensuring zero duplicate records.
- **Verified**: 66 books from `data/books.json` imported into `trillionskill_launch` with 0 errors across 2 consecutive runs.

---

## 4. S3 & MinIO Compatible Storage

`lib/s3.ts` and `lib/aws-s3.ts` support standard S3 and MinIO configurations:
- Environment variables: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`, `S3_REGION`.
- Tested in `tests/unit/no-local-disk-writes.test.ts`: S3 client uploads buffer and generates valid presigned URL for private file access.

---

## 5. Read-Only Container Proof

The multi-stage container was started with `--read-only` and `PERSIST_BACKEND=db`:
```bash
docker run -d --name trillionskill-readonly-app \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --tmpfs /app/.next/cache:rw,size=128m \
  -e PERSIST_BACKEND=db \
  ...
```
- Full 10-request exam smoke test (start -> batch sync 1..5 -> submit -> result -> leaderboard) completed with 100% 200/201 responses.
- `docker logs` verified with `grep -i "EROFS"`: **ZERO hits**.
