#!/usr/bin/env bash
# R9-S4: run the production image with a read-only root filesystem.
#
# Safety: refuses to run unless the database host is local
# (localhost / 127.0.0.1 / host.docker.internal). Never prints credentials.
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host.docker.internal:54329/db \
#   IMAGE=trillionskill:<sha> scripts/r9-run-container.sh
set -euo pipefail

IMAGE="${IMAGE:?IMAGE is required}"
NAME="${NAME:-r9-app}"
PORT="${PORT:-3050}"

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET is required}"

HOST="$(node -e 'const u=new URL(process.argv[1]);console.log(u.hostname)' "$DATABASE_URL")"
case "$HOST" in
  localhost|127.0.0.1|host.docker.internal) ;;
  *)
    echo "REFUSING: database host '$HOST' is not local (localhost/127.0.0.1/host.docker.internal)" >&2
    exit 1
    ;;
esac

echo "image=$IMAGE db_host=$HOST port=$PORT read_only=true"

docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d --name "$NAME" \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  --tmpfs /app/.next/cache:rw,size=64m \
  -p "127.0.0.1:${PORT}:3000" \
  -e NODE_ENV=production \
  -e PERSIST_BACKEND=db \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e DIRECT_URL="$DATABASE_URL" \
  -e NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  -e AUTH_SECRET="${AUTH_SECRET:-$NEXTAUTH_SECRET}" \
  -e NEXTAUTH_URL="http://127.0.0.1:${PORT}" \
  -e AUTH_TRUST_HOST=true \
  -e HEALTH_DETAILS_TOKEN="${HEALTH_DETAILS_TOKEN:-}" \
  "$IMAGE"

for i in $(seq 1 40); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/health" || true)"
  if [ "$code" = "200" ]; then
    echo "ready after ${i}s (health 200)"
    exit 0
  fi
  sleep 1
done

echo "container did not become healthy; last health code: ${code:-none}" >&2
docker logs --tail 40 "$NAME" >&2 || true
exit 1
