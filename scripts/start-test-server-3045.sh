#!/bin/bash
export PORT=3045
export NEXT_DIST_DIR=.next-test
export DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
export AUTH_SECRET="aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b"
export NEXTAUTH_SECRET="aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b"
export AUTH_TRUST_HOST=true
export AUTH_URL="http://localhost:3045"
export NEXTAUTH_URL="http://localhost:3045"
export NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL=true
export NODE_ENV=production

npx next start -p 3045
