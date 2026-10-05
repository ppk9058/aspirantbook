#!/bin/bash
set -euo pipefail

echo "=== STEP 2: TEST PRISMA MIGRATION CHAINS ON DOCKER ==="

TEST_URL_BASE="postgresql://postgres:testpassword123@127.0.0.1:54329"

echo "1. Recreating clean database trillionskill_chain_fresh..."
docker exec -i trillionskill-test-db psql -U postgres -c "DROP DATABASE IF EXISTS trillionskill_chain_fresh;"
docker exec -i trillionskill-test-db psql -U postgres -c "CREATE DATABASE trillionskill_chain_fresh;"

FRESH_URL="${TEST_URL_BASE}/trillionskill_chain_fresh"

echo "2. Running 'npx prisma migrate deploy' on fresh database..."
DATABASE_URL="${FRESH_URL}" DIRECT_URL="${FRESH_URL}" npx prisma migrate deploy

echo "3. Checking 'npx prisma migrate status' on fresh database..."
DATABASE_URL="${FRESH_URL}" DIRECT_URL="${FRESH_URL}" npx prisma migrate status

echo "4. Checking diff against schema.prisma..."
DATABASE_URL="${FRESH_URL}" DIRECT_URL="${FRESH_URL}" npx prisma migrate diff --from-url "${FRESH_URL}" --to-schema-datamodel prisma/schema.prisma --exit-code

echo "5. Verifying pg_constraint CHECKs on fresh database..."
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_fresh -c "
  SELECT conname, contype, pg_get_constraintdef(oid) 
  FROM pg_constraint 
  WHERE conrelid IN ('\"Coupon\"'::regclass, '\"CouponRedemption\"'::regclass) AND contype = 'c'
  ORDER BY conname;
"

echo "6. Verifying pg_indexes on CouponRedemption..."
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_fresh -c "
  SELECT indexname, indexdef 
  FROM pg_indexes 
  WHERE tablename = 'CouponRedemption' 
  ORDER BY indexname;
"

echo "7. Creating dev simulation database trillionskill_chain_sim_dev..."
docker exec -i trillionskill-test-db psql -U postgres -c "DROP DATABASE IF EXISTS trillionskill_chain_sim_dev;"
docker exec -i trillionskill-test-db psql -U postgres -c "CREATE DATABASE trillionskill_chain_sim_dev;"

SIM_URL="${TEST_URL_BASE}/trillionskill_chain_sim_dev"

echo "8. Applying 0_baseline to sim_dev..."
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_sim_dev < prisma/migrations/0_baseline/migration.sql
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_sim_dev -c "
  CREATE TABLE IF NOT EXISTS \"_prisma_migrations\" (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO \"_prisma_migrations\" (id, checksum, finished_at, migration_name, applied_steps_count)
  VALUES ('mock-baseline-id', 'cb219a1843b02dd1804f', now(), '0_baseline', 1);
"

echo "9. Simulating Dev state: dropping redundant composite unique if exists..."
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_sim_dev -c "
  DROP INDEX IF EXISTS \"CouponRedemption_couponId_userId_paymentId_key\";
"

echo "10. Running 'npx prisma migrate deploy' on sim_dev..."
DATABASE_URL="${SIM_URL}" DIRECT_URL="${SIM_URL}" npx prisma migrate deploy

echo "11. Diffing fresh chain vs simulated dev chain (must be exit 0)..."
npx prisma migrate diff --from-url "${FRESH_URL}" --to-url "${SIM_URL}" --exit-code

echo "=== ALL MIGRATION CHAIN CHECKS PASSED SUCCESSFULLY ==="
