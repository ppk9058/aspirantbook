#!/bin/bash
set -e

DOCKER_PORT=54329
DB_PASS=testpassword123
CHAIN2_URL="postgresql://postgres:${DB_PASS}@127.0.0.1:${DOCKER_PORT}/trillionskill_chain_check2"
DEVSIM_URL="postgresql://postgres:${DB_PASS}@127.0.0.1:${DOCKER_PORT}/trillionskill_chain_sim_dev"

echo "=== STEP 2c & 2d: MIGRATION CHAIN PROOFS ON DOCKER ==="

# 2c. FRESH CHAIN: trillionskill_chain_check2
echo "--- 2c. FRESH CHAIN TEST (trillionskill_chain_check2) ---"
docker exec -i trillionskill-test-db psql -U postgres -c "DROP DATABASE IF EXISTS trillionskill_chain_check2;"
docker exec -i trillionskill-test-db psql -U postgres -c "CREATE DATABASE trillionskill_chain_check2;"

echo "Running prisma migrate deploy on trillionskill_chain_check2..."
DATABASE_URL="$CHAIN2_URL" DIRECT_URL="$CHAIN2_URL" npx prisma migrate deploy

echo "Checking prisma migrate status on trillionskill_chain_check2..."
DATABASE_URL="$CHAIN2_URL" DIRECT_URL="$CHAIN2_URL" npx prisma migrate status

echo "Running prisma migrate diff against schema.prisma on chain2..."
npx prisma migrate diff --from-url "$CHAIN2_URL" --to-schema-datamodel prisma/schema.prisma --exit-code

echo "CHECK constraints on chain2:"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_check2 -c "
SELECT conname, pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname IN ('Coupon', 'CouponRedemption') AND c.contype = 'c'
ORDER BY conname;
"

echo "Indexes on CouponRedemption on chain2:"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_check2 -c "
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'CouponRedemption' ORDER BY indexname;
"

# 2d. SIMULATE DEV CHAIN: trillionskill_chain_sim_dev
echo "--- 2d. SIMULATING DEV CHAIN (trillionskill_chain_sim_dev) ---"
docker exec -i trillionskill-test-db psql -U postgres -c "DROP DATABASE IF EXISTS trillionskill_chain_sim_dev;"
docker exec -i trillionskill-test-db psql -U postgres -c "CREATE DATABASE trillionskill_chain_sim_dev;"

# Apply 0_baseline raw SQL
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_sim_dev < prisma/migrations/0_baseline/migration.sql

# Mark 0_baseline applied in _prisma_migrations
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_sim_dev -c "
CREATE TABLE IF NOT EXISTS \"_prisma_migrations\" (
  \"id\"                    VARCHAR(36) PRIMARY KEY NOT NULL,
  \"checksum\"              VARCHAR(64) NOT NULL,
  \"finished_at\"           TIMESTAMPTZ,
  \"migration_name\"        VARCHAR(255) NOT NULL,
  \"logs\"                  TEXT,
  \"rolled_back_at\"        TIMESTAMPTZ,
  \"started_at\"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  \"applied_steps_count\"   INTEGER NOT NULL DEFAULT 0
);
INSERT INTO \"_prisma_migrations\" (\"id\", \"checksum\", \"finished_at\", \"migration_name\", \"applied_steps_count\")
VALUES ('sim_baseline_id', 'sim_checksum', NOW(), '0_baseline', 1);
"

# Manually drop the composite unique index (as was done on dev)
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_chain_sim_dev -c "
DROP INDEX IF EXISTS \"CouponRedemption_couponId_userId_paymentId_key\";
"

echo "Running prisma migrate deploy on simulated dev DB..."
DATABASE_URL="$DEVSIM_URL" DIRECT_URL="$DEVSIM_URL" npx prisma migrate deploy

echo "Running prisma migrate diff between chain2 and simulated dev DB..."
npx prisma migrate diff --from-url "$CHAIN2_URL" --to-url "$DEVSIM_URL" --exit-code

echo "=== MIGRATION CHAIN PROOFS COMPLETED SUCCESSFULLY ==="
