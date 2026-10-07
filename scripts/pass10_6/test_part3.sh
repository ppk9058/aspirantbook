#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 3: B1 ON 8748475 WORKTREE vs CURRENT HEAD ==="
echo "Current HEAD: ${HEAD}"
echo "Pre-Pass-10 Commit: 8748475"
echo "Date: $(date -u)"
echo ""

WORKTREE_DIR="/tmp/trillionskill-8748475"

echo "--- 3.1 Setup Clean Worktree for 8748475 ---"
rm -rf "${WORKTREE_DIR}"
git worktree prune || true
git worktree add "${WORKTREE_DIR}" 8748475

cd "${WORKTREE_DIR}"
echo "In worktree: $(git rev-parse HEAD)"

echo "Inspecting next.config.js in 8748475:"
cat next.config.js | head -n 15

echo ""
echo "--- 3.2 Inspect Middleware & Auth Config in 8748475 ---"
echo ">>> auth.config.ts authorized callback in 8748475:"
grep -n -C 5 "isOnDashboard" auth.config.ts || true

echo ""
echo "--- 3.3 Test Hypotheses H1-H5 on 8748475 Worktree ---"
echo "H1: middleware rewrite vs redirect in 8748475"
grep -n -C 5 "NextResponse.redirect" middleware.ts || true
grep -n -C 5 "NextResponse.rewrite" middleware.ts || true

echo ""
echo "H2: isOnDashboard route match definition in 8748475 auth.config.ts"
grep -n -C 10 "isOnDashboard" auth.config.ts || true

echo ""
echo "H3: Origin host determination in 8748475 middleware / auth"
grep -n -C 5 "AUTH_URL" auth.config.ts || true
grep -n -C 5 "NEXTAUTH_URL" auth.config.ts || true

echo ""
echo "--- 3.4 Cleanup Worktree ---"
cd /Users/praveenkumar/TrillionSkill
git worktree remove --force "${WORKTREE_DIR}"
echo "Worktree cleaned up successfully."
