#!/usr/bin/env bash
# Loads the pinned Docker test DB credentials and exports them as DATABASE_URL/DIRECT_URL.
# Values are never printed. Source this file before running node:test suites.
set -a
# shellcheck disable=SC1091
. ./.env.test
set +a
export APP_ENV=test
export DATABASE_URL="${TEST_DATABASE_URL}"
export DIRECT_URL="${TEST_DIRECT_URL:-${TEST_DATABASE_URL}}"
