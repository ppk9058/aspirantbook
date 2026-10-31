#!/usr/bin/env bash
# scripts/ops/db-backup-to-s3.sh
# Production / Staging PostgreSQL backup utility.
# Dumps DIRECT_URL (or DATABASE_URL) using custom compressed pg_dump format.
# Uploads to S3/R2-compatible bucket or stores in local target directory.
# Implements retention pruning. Never echoes URLs, passwords or secret keys.
set -euo pipefail

DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "FAIL: DIRECT_URL is required (or DATABASE_URL for local testing)" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILENAME="db_backup_${STAMP}.dump"
TMP_DUMP="$(mktemp "${TMPDIR:-/tmp}/pgbackup-XXXXXX.dump")"

cleanup() {
  rm -f "$TMP_DUMP"
}
trap cleanup EXIT

# Extract host safely without credentials
DB_HOST="$(printf '%s' "$DB_URL" | sed -E 's#^[a-zA-Z0-9+.-]+://([^@/]*@)?([^/]+)/.*#\2#' || echo "database")"
echo "db-backup-to-s3: starting dump from host=${DB_HOST}"

# Strip Prisma-specific query parameters (e.g. schema=public) which libpq/pg_dump rejects
CLEAN_DB_URL="$(printf '%s' "$DB_URL" | sed -E 's/[?&]schema=[^&]+//g; s/\?&/?/; s/\?$//')"

# Resolve pg_dump binary: check PG_DUMP_BIN, newer libpq, or fallback to system pg_dump
PG_DUMP="${PG_DUMP_BIN:-}"
if [[ -z "$PG_DUMP" ]]; then
  for candidate in /opt/homebrew/opt/libpq/bin/pg_dump /opt/homebrew/Cellar/libpq/*/bin/pg_dump /usr/local/opt/libpq/bin/pg_dump; do
    if [[ -x "$candidate" ]]; then
      PG_DUMP="$candidate"
      break
    fi
  done
  PG_DUMP="${PG_DUMP:-pg_dump}"
fi

# Execute pg_dump using custom format (built-in zlib compression)
"$PG_DUMP" "$CLEAN_DB_URL" --format=custom --no-owner --no-acl --file="$TMP_DUMP"
DUMP_BYTES="$(wc -c < "$TMP_DUMP" | tr -d ' ')"
echo "db-backup-to-s3: dump created successfully, size=${DUMP_BYTES} bytes"

# Target 1: Local directory target (for testing or on-premise storage)
LOCAL_TARGET="${BACKUP_LOCAL_TARGET:-${BACKUP_DIR:-}}"
if [[ -n "$LOCAL_TARGET" ]]; then
  mkdir -p "$LOCAL_TARGET"
  DEST_FILE="${LOCAL_TARGET}/${DUMP_FILENAME}"
  cp "$TMP_DUMP" "$DEST_FILE"
  echo "db-backup-to-s3: stored backup at ${DEST_FILE}"

  # Retention prune for local target (default keep last 10 backups)
  RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-10}"
  BACKUP_COUNT=$(ls -1 "${LOCAL_TARGET}"/db_backup_*.dump 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$BACKUP_COUNT" -gt "$RETENTION_COUNT" ]]; then
    EXCESS=$((BACKUP_COUNT - RETENTION_COUNT))
    echo "db-backup-to-s3: pruning ${EXCESS} old local backups (retention count: ${RETENTION_COUNT})"
    ls -1t "${LOCAL_TARGET}"/db_backup_*.dump | tail -n "$EXCESS" | xargs rm -f
  fi
fi

# Target 2: S3 / Cloudflare R2 / MinIO bucket upload
BUCKET="${S3_BUCKET:-${AWS_S3_BUCKET_NAME:-}}"
if [[ -n "$BUCKET" ]]; then
  ENDPOINT="${S3_ENDPOINT:-${AWS_ENDPOINT:-}}"
  S3_URI="s3://${BUCKET}/backups/${DUMP_FILENAME}"
  echo "db-backup-to-s3: uploading to bucket=${BUCKET}"

  if command -v aws >/dev/null 2>&1; then
    if [[ -n "$ENDPOINT" ]]; then
      aws s3 cp --endpoint-url "$ENDPOINT" "$TMP_DUMP" "$S3_URI"
    else
      aws s3 cp "$TMP_DUMP" "$S3_URI"
    fi
    echo "db-backup-to-s3: uploaded to ${S3_URI}"
  else
    echo "WARN: aws CLI not installed; skipped S3 upload"
  fi
fi

echo "db-backup-to-s3: PASS"
