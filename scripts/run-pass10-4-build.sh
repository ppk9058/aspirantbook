#!/bin/bash
set -e
echo "=== Step 1: Pre-build guard and mtime ==="
NEXT_DIST_DIR=.next-test npx tsx scripts/guard-dist-dir.ts
echo "PRE_BUILD_MTIME: $(stat -f '%m %Sm %N' ./.next)"

echo "=== Step 2: Build with NEXT_DIST_DIR=.next-test ==="
NEXT_DIST_DIR=.next-test NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL=true npx next build

echo "=== Step 3: Post-build mtime verification ==="
echo "POST_BUILD_MTIME: $(stat -f '%m %Sm %N' ./.next)"
echo "TEST_DIST_MTIME: $(stat -f '%m %Sm %N' ./.next-test)"
