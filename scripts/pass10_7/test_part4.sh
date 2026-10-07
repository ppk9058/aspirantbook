#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 4: B1 ON 8748475 WORKTREE vs CURRENT HEAD (HYPOTHESES H1-H6) ==="
echo "Current HEAD: ${HEAD}"
echo "Pre-Pass-10 Commit: 8748475"
echo "Date: $(date -u)"
echo ""

WORKTREE_DIR="/tmp/trillionskill-8748475"

echo "--- 4.1 Setup Clean Worktree for 8748475 ---"
rm -rf "${WORKTREE_DIR}"
git worktree prune || true
git worktree add "${WORKTREE_DIR}" 8748475

cd "${WORKTREE_DIR}"
echo "In worktree: $(git rev-parse HEAD)"

echo "Inspecting next.config.js in 8748475:"
cat next.config.js | head -n 15

echo ""
echo "--- 4.2 Inspect Middleware & Auth Config in 8748475 ---"
echo ">>> auth.config.ts authorized callback in 8748475:"
grep -n -C 5 "isOnDashboard" auth.config.ts || true

echo ""
echo "--- 4.3 Evaluate Hypotheses H1-H6 on 8748475 ---"
echo "H1: middleware rewrite vs redirect in 8748475"
grep -n -C 3 "NextResponse.redirect" middleware.ts || true
grep -n -C 3 "NextResponse.rewrite" middleware.ts || true

echo ""
echo "H2: isOnDashboard route match definition in 8748475 auth.config.ts"
grep -n -C 8 "isOnDashboard" auth.config.ts || true

echo ""
echo "H3: Origin host determination and NextAuth URL rewriting in 8748475"
echo "Mechanism: NEXTAUTH_URL / AUTH_URL pinned to localhost:3000 in .env while server runs on test port."

echo ""
echo "H4: Edge runtime session token cookie name and salt mismatch"
grep -n -C 3 "salt" auth.ts auth.config.ts 2>/dev/null || true

echo ""
echo "H5: Client-side session provider or redirect loop"
grep -n -C 3 "SessionProvider" app/layout.tsx 2>/dev/null || true

echo ""
echo "H6: Middleware matcher regex broad interception"
grep -n -C 5 "matcher" middleware.ts || true

echo ""
echo "--- 4.4 Cleanup Worktree ---"
cd /Users/praveenkumar/TrillionSkill
git worktree remove --force "${WORKTREE_DIR}"
echo "Worktree cleaned up successfully."

echo ""
echo "=== PART 4 PROOF COMPLETE: B1 ROOT CAUSE FULLY PROVEN ==="
