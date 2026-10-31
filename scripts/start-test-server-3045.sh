#!/bin/bash
export PORT=3045
export NEXT_DIST_DIR=.next-test
export DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
: "${AUTH_SECRET:?AUTH_SECRET is required}"
export AUTH_SECRET
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$AUTH_SECRET}"
export AUTH_TRUST_HOST=true
export NEXTAUTH_URL="http://127.0.0.1:3045"
export AUTH_URL="http://127.0.0.1:3045"
export NEXT_PUBLIC_APP_URL="http://127.0.0.1:3045"
export APP_ENV=test
export NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL=true
export NODE_ENV=production

npx next start -p 3045

