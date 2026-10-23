#!/usr/bin/env bash
set -euo pipefail

# Helper to run a command with a strict 2-second timeout
run_with_timeout() {
  python3 -c "
import subprocess, sys
try:
    res = subprocess.run(sys.argv[1:], capture_output=True, text=True, timeout=2)
    sys.stdout.write(res.stdout)
    sys.exit(res.returncode)
except Exception:
    sys.exit(124)
" "$@" 2>/dev/null || true
}

# 1. Resolve Mac LAN IP dynamically (no hardcoded IPs)
MAC_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ipconfig getifaddr en7 2>/dev/null || echo "127.0.0.1")
echo "=========================================================="
echo "  TrillionSkill Mobile Dev Environment Helper"
echo "=========================================================="
echo "Resolved Mac LAN IP: ${MAC_IP}"

# 2. Check Docker Test DB
echo ""
echo "--- Checking Docker Test Database ---"
if command -v docker >/dev/null 2>&1; then
  DB_RUNNING=$(run_with_timeout docker ps --filter "name=trillionskill-test-db" --filter "status=running" --format '{{.Names}}')
  if [ -n "$DB_RUNNING" ]; then
    echo "✔ Docker test database (trillionskill-test-db) is RUNNING."
  else
    DB_EXISTS=$(run_with_timeout docker ps -a --filter "name=trillionskill-test-db" --format '{{.Names}}')
    if [ -n "$DB_EXISTS" ]; then
      echo "Starting existing stopped container trillionskill-test-db..."
      run_with_timeout docker start trillionskill-test-db >/dev/null || true
      echo "✔ Docker test database start attempted."
    else
      echo "ℹ Docker test DB check: If required, start container with 'npm run test:db:up'."
    fi
  fi
else
  echo "ℹ Docker is not installed or not in PATH."
fi

# 3. Port Occupancy & Owner Process Protection
# Ports: 3045 (Next.js API server), 8083 (Metro bundler)
echo ""
echo "--- Checking Port Availability ---"
PID_3045=$(lsof -nP -iTCP:3045 -sTCP:LISTEN -t 2>/dev/null || true)
PID_8083=$(lsof -nP -iTCP:8083 -sTCP:LISTEN -t 2>/dev/null || true)

OCCUPIED=0
if [ -n "$PID_3045" ]; then
  echo "⚠ Port 3045 is ALREADY OCCUPIED by PID: ${PID_3045}. Refusing to start duplicate API server."
  OCCUPIED=1
else
  echo "✔ Port 3045 is FREE."
fi

if [ -n "$PID_8083" ]; then
  echo "⚠ Port 8083 is ALREADY OCCUPIED by PID: ${PID_8083}. Refusing to start duplicate Metro bundler."
  OCCUPIED=1
else
  echo "✔ Port 8083 is FREE."
fi

# 4. Summary & Connection Instructions
echo ""
echo "=========================================================="
echo "  Connection & Verification URLs for Phone"
echo "=========================================================="
echo "1. Chrome / Safari Verification URL (test in phone browser first):"
echo "   http://${MAC_IP}:3045/api/v1/courses"
echo ""
echo "2. Expo Go Target URL:"
echo "   exp://${MAC_IP}:8083"
echo "=========================================================="

if [ "$OCCUPIED" -eq 1 ]; then
  echo ""
  echo "Note: One or more target ports are already running by the owner. No duplicate services were launched."
  exit 0
fi

echo ""
echo "To start services:"
echo "  Backend API:  npm run dev:mobile-api"
echo "  Metro Bundler: cd apps/mobile && npx expo start --clear --lan --port 8083"
