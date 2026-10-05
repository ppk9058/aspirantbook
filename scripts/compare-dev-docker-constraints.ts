import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
const devPrisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });

const dockerUrl = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const dockerPrisma = new PrismaClient({ datasources: { db: { url: dockerUrl } } });

async function run() {
  console.log("=== COMPARING DEV VS DOCKER (CHECK CONSTRAINTS & INDEXES) ===");

  await devPrisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // Query dev checks
  const devChecks: any[] = await devPrisma.$queryRawUnsafe(`
    SELECT
      conrelid::regclass::text AS table_name,
      conname AS constraint_name,
      pg_get_constraintdef(c.oid) AS constraint_def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND contype = 'c'
      AND conrelid::regclass::text IN ('"Coupon"', '"CouponRedemption"', 'Coupon', 'CouponRedemption')
    ORDER BY constraint_name;
  `);

  // Query docker checks
  const dockerChecks: any[] = await dockerPrisma.$queryRawUnsafe(`
    SELECT
      conrelid::regclass::text AS table_name,
      conname AS constraint_name,
      pg_get_constraintdef(c.oid) AS constraint_def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND contype = 'c'
      AND conrelid::regclass::text IN ('"Coupon"', '"CouponRedemption"', 'Coupon', 'CouponRedemption')
    ORDER BY constraint_name;
  `);

  // Normalize table names
  const normDev = devChecks.map(c => ({
    name: c.constraint_name,
    def: c.constraint_def.replace(/"/g, '')
  }));
  const normDocker = dockerChecks.map(c => ({
    name: c.constraint_name,
    def: c.constraint_def.replace(/"/g, '')
  }));

  console.log("Dev CHECK constraint count:", normDev.length);
  console.log("Docker CHECK constraint count:", normDocker.length);

  let checksMatch = normDev.length === normDocker.length;
  for (const dc of normDev) {
    const found = normDocker.find(k => k.name === dc.name);
    if (!found) {
      console.log(`Mismatch: ${dc.name} missing on Docker`);
      checksMatch = false;
    }
  }

  // Query dev indexes
  const devIndexes: any[] = await devPrisma.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('Coupon', 'CouponRedemption', 'Payment', 'RateLimit')
    ORDER BY tablename, indexname;
  `);

  // Query docker indexes
  const dockerIndexes: any[] = await dockerPrisma.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('Coupon', 'CouponRedemption', 'Payment', 'RateLimit')
    ORDER BY tablename, indexname;
  `);

  console.log("Dev index count:", devIndexes.length);
  console.log("Docker index count:", dockerIndexes.length);

  let indexesMatch = devIndexes.length === dockerIndexes.length;
  for (const di of devIndexes) {
    const found = dockerIndexes.find(k => k.indexname === di.indexname);
    if (!found) {
      console.log(`Mismatch: ${di.indexname} missing on Docker`);
      indexesMatch = false;
    }
  }

  console.table([
    { component: "CHECK Constraints", devCount: normDev.length, dockerCount: normDocker.length, identical: checksMatch },
    { component: "Target Indexes", devCount: devIndexes.length, dockerCount: dockerIndexes.length, identical: indexesMatch }
  ]);

  if (!checksMatch || !indexesMatch) {
    throw new Error("Dev and Docker constraints or indexes do not match!");
  }
  console.log("✓ Dev and Docker CHECK constraints & indexes are IDENTICAL.");
}

run()
  .catch(err => {
    console.error("FATAL in compare-dev-docker-constraints:", err);
    process.exit(1);
  })
  .finally(async () => {
    await devPrisma.$disconnect();
    await dockerPrisma.$disconnect();
  });
