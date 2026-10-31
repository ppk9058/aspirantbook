#!/usr/bin/env bash
# Apply Prisma migrations using the NON-POOLED direct connection.
#
# Neon: DATABASE_URL is the pooled (pgbouncer) host used by the app;
#       DIRECT_URL is the direct host used by migrations.
#
# Prints only the database host. Never prints credentials.
#
# Usage: DIRECT_URL=postgresql://... scripts/ops/migrate-deploy.sh
set -euo pipefail

if [ -z "${DIRECT_URL:-}" ]; then
  echo "REFUSING: DIRECT_URL is empty. Set the non-pooled Postgres URL first." >&2
  exit 1
fi

HOST="$(node -e 'const u=new URL(process.argv[1]); if(!/^postgres(ql)?:$/.test(u.protocol)){console.error("REFUSING: DIRECT_URL must be a postgres URL");process.exit(1)} console.log(u.hostname)' "$DIRECT_URL")"

echo "migrate-deploy: host=${HOST}"
echo "migrate-deploy: running 'prisma migrate deploy' (direct connection)"

# Prisma reads both env names from schema.prisma. The CLI must not use the
# pooled host for migrations, so DATABASE_URL is pinned to DIRECT_URL for this
# command only.
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy

echo "migrate-deploy: running 'prisma migrate status'"
DATABASE_URL="$DIRECT_URL" npx prisma migrate status

echo "migrate-deploy: done"
