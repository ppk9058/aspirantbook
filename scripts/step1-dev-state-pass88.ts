import { prisma } from "../lib/prisma";
import { execSync } from "child_process";
import fs from "fs";

async function run() {
  console.log("=== STEP 1: READ-ONLY DEV STATE AUDIT (PASS 8.8) ===");

  // Enforce read-only
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // Masked host + db
  const dbUrl = process.env.DATABASE_URL || "";
  let maskedHost = "unknown";
  let dbName = "unknown";
  try {
    const parsed = new URL(dbUrl);
    maskedHost = parsed.hostname.replace(/^(.)(.*)(..)$/, "$1***$3");
    dbName = parsed.pathname.replace(/^\//, "");
  } catch {}
  console.log(`1a. DEV DB: host=${maskedHost}, database=${dbName}`);

  // Proof INSERT fails in read-only transaction
  let insertBlocked = false;
  let insertError = "";
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('ro_proof', 'ROPROOF', 'PERCENT', 10, 1, NOW(), NOW())`
    );
  } catch (err: any) {
    insertBlocked = true;
    insertError = err.message || String(err);
  }
  console.log(`1a. Read-Only Transaction Enforcement Proof:`);
  console.log(`    INSERT blocked: ${insertBlocked}`);
  console.log(`    Error: ${insertError.split("\n")[0]}`);
  if (!insertBlocked) {
    throw new Error("CRITICAL SAFETY FAILURE: INSERT did not fail in read-only transaction!");
  }

  // 1b. ALL tables from information_schema.tables with real row counts
  const tables: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`\n1b. Total Public BASE TABLE count: ${tables.length}`);
  const counts: { table: string; count: number }[] = [];
  for (const t of tables) {
    const tableName = t.table_name;
    const res: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "${tableName}"`);
    counts.push({ table: tableName, count: res[0]?.cnt ?? 0 });
  }
  console.table(counts);

  // Role counts
  const userRoles: any[] = await prisma.$queryRawUnsafe(`
    SELECT role, COUNT(*)::int as count
    FROM "User"
    GROUP BY role
    ORDER BY role;
  `);
  console.log("\n1b. Role Counts by Role:");
  console.table(userRoles);

  // 1c. migrate status raw
  console.log("\n1c. prisma migrate status (Dev):");
  try {
    const statusOut = execSync("npx prisma migrate status", { encoding: "utf-8" });
    console.log(statusOut);
  } catch (err: any) {
    console.log(err.stdout ? err.stdout : err.message);
  }

  // 1c. _prisma_migrations rows
  const migs: any[] = await prisma.$queryRawUnsafe(`
    SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count 
    FROM "_prisma_migrations" 
    ORDER BY started_at;
  `);
  console.log("\n1c. _prisma_migrations Rows (Dev):");
  console.table(migs);

  // 1d. pg_get_constraintdef for every CHECK on Coupon and CouponRedemption
  const checkConstraints: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      conrelid::regclass::text AS table_name,
      conname AS constraint_name,
      pg_get_constraintdef(c.oid) AS constraint_def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND contype = 'c'
      AND conrelid::regclass::text IN ('"Coupon"', '"CouponRedemption"', 'Coupon', 'CouponRedemption')
    ORDER BY table_name, constraint_name;
  `);
  console.log("\n1d. CHECK Constraints on Coupon and CouponRedemption (pg_get_constraintdef):");
  console.table(checkConstraints);

  // 1e. pg_indexes for Coupon, CouponRedemption, Payment, RateLimit
  const indexes: any[] = await prisma.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('Coupon', 'CouponRedemption', 'Payment', 'RateLimit')
    ORDER BY tablename, indexname;
  `);
  console.log("\n1e. pg_indexes for Coupon, CouponRedemption, Payment, RateLimit:");
  console.table(indexes);

  // Verify CouponRedemption has NO unique index on (couponId, userId)
  const redempHasUniqueCouponUser = indexes.some(
    idx => idx.tablename === "CouponRedemption" && idx.indexdef.includes("UNIQUE") && idx.indexdef.includes("couponId") && idx.indexdef.includes("userId") && !idx.indexdef.includes("paymentId")
  );
  console.log(`\n1e. Dev has NO unique index on CouponRedemption(couponId, userId): ${!redempHasUniqueCouponUser ? "CONFIRMED (PASS)" : "FAIL"}`);

  // 1f. Repo migration files check vs dev
  console.log("\n1f. Repo Migrations since 0_baseline vs Dev Constraints:");
  const migFiles = [
    "prisma/migrations/20261006002100_drop_redundant_couponredemption_unique/migration.sql",
    "prisma/migrations/20261006002101_coupon_checks/migration.sql",
    "prisma/migrations/20261006002102_add_rate_limit/migration.sql"
  ];
  for (const mf of migFiles) {
    console.log(`--- ${mf} ---`);
    console.log(fs.readFileSync(mf, "utf-8"));
  }
}

run()
  .catch((err) => {
    console.error("FATAL in step1-dev-state-pass88:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
