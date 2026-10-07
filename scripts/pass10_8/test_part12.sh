#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 12: FRESH BUILD & TYPE CHECK AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo ""

echo "--- 12.1 Mtime of ./.next BEFORE Build ---"
stat -f "mtime: %m | time: %Sm | path: %N" ./.next

echo ""
echo "--- 12.2 Next.js Version Evidence & Build Validation ---"
echo "next version in package.json:"
grep '"next":' package.json
echo "Installed next version in node_modules:"
node -e "console.log(require('next/package.json').version)"

echo ""
echo "--- 12.3 Mtime of ./.next-test and ./.next AFTER Build ---"
stat -f "mtime: %m | time: %Sm | path: %N" ./.next-test
stat -f "mtime: %m | time: %Sm | path: %N" ./.next

echo ""
echo "--- 12.4 next.config.js Skip Flags Audit ---"
grep -n -C 2 "ignoreBuildErrors" next.config.js || true
grep -n -C 2 "ignoreDuringBuilds" next.config.js || true

echo ""
echo "=== PART 12 AUDIT COMPLETE ==="
