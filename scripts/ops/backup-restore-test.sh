#!/usr/bin/env bash
# Backup/restore verification: pg_dump -> restore into a throwaway database ->
# compare the row count of EVERY table in the public schema.
#
# Exits non-zero on any mismatch (or on any missing/extra table).
# Prints hosts and counts only, never credentials.
#
# Requires pg_dump/pg_restore/psql of the same major version as the server.
# Usage: SOURCE_URL=postgresql://... scripts/ops/backup-restore-test.sh
set -euo pipefail

: "${SOURCE_URL:?SOURCE_URL is required (local source database)}"

STAMP="$(date +%s)"
TARGET_DB="r9_restore_${STAMP}"
DUMP_FILE="$(mktemp "${TMPDIR:-/tmp}/r9-backup-XXXXXX.dump")"

# Split off any query string (e.g. ?sslmode=require) before swapping the DB name.
case "$SOURCE_URL" in
  *\?*) URL_NO_QS="${SOURCE_URL%%\?*}"; QS="?${SOURCE_URL#*\?}" ;;
  *)    URL_NO_QS="$SOURCE_URL"; QS="" ;;
esac
BASE="${URL_NO_QS%/*}"
ADMIN_URL="${BASE}/postgres${QS}"
TARGET_URL="${BASE}/${TARGET_DB}${QS}"
SOURCE_HOST="$(printf '%s' "$URL_NO_QS" | sed -E 's#^[a-zA-Z0-9+.-]+://([^@/]*@)?([^/]+)/.*#\2#')"

cleanup() {
  psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$TARGET_DB\"" >/dev/null 2>&1 || true
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

echo "backup-restore-test: source_host=${SOURCE_HOST} throwaway_db=${TARGET_DB}"

psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$TARGET_DB\""
echo "backup-restore-test: dump"
pg_dump "$SOURCE_URL" --format=custom --no-owner --no-acl --file="$DUMP_FILE"
echo "backup-restore-test: dump_bytes=$(wc -c < "$DUMP_FILE" | tr -d ' ')"
echo "backup-restore-test: restore"
pg_restore --no-owner --no-acl --exit-on-error --dbname="$TARGET_URL" "$DUMP_FILE"

TABLES=()
while IFS= read -r line; do
  [ -n "$line" ] && TABLES+=("$line")
done < <(psql "$SOURCE_URL" -At -c "select format('%I.%I', schemaname, tablename) from pg_tables where schemaname='public' order by 1")

if [ "${#TABLES[@]}" -eq 0 ]; then
  echo "backup-restore-test: FAIL no tables found in source public schema" >&2
  exit 1
fi

MISMATCHES=0
TOTAL_ROWS=0
for t in "${TABLES[@]}"; do
  src="$(psql "$SOURCE_URL" -At -c "select count(*) from $t")"
  dst="$(psql "$TARGET_URL" -At -c "select count(*) from $t")"
  TOTAL_ROWS=$((TOTAL_ROWS + src))
  if [ "$src" != "$dst" ]; then
    echo "MISMATCH $t source=$src restored=$dst"
    MISMATCHES=$((MISMATCHES + 1))
  fi
done

RESTORED_TABLES="$(psql "$TARGET_URL" -At -c "select count(*) from pg_tables where schemaname='public'")"

echo "backup-restore-test: tables_compared=${#TABLES[@]} restored_tables=${RESTORED_TABLES} total_source_rows=${TOTAL_ROWS} mismatches=${MISMATCHES}"

if [ "$MISMATCHES" -ne 0 ] || [ "${#TABLES[@]}" != "$RESTORED_TABLES" ]; then
  echo "backup-restore-test: FAIL" >&2
  exit 1
fi

echo "backup-restore-test: PASS"
