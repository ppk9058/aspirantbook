import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";
import fs from "fs";

process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const TEST_URL = process.env.TEST_DATABASE_URL;

async function run() {
  console.log("=== STEP 2: PROVE CHECK CONSTRAINTS & ROLLBACK FILE (DOCKER) ===");
  assertTestDb();

  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_URL } }
  });

  // Ensure test users/courses/payments exist for foreign keys
  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
    VALUES ('u_check_test', 'check_test@example.test', 'Check User', 'FREE', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Payment" (id, "userId", amount, currency, status, "createdAt")
    VALUES ('p_check_test', 'u_check_test', 1000, 'INR', 'COMPLETED', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt")
    VALUES ('c_fk_test', 'CFKTEST', 'PERCENT', 10, 1, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  const constraintsSuite = [
    {
      id: 1,
      name: "check_coupon_discount_type",
      failSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('fail_1', 'F1', 'INVALID_TYPE', 10, 1, NOW(), NOW())`,
      passSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('pass_1', 'P1', 'FLAT', 100, 1, NOW(), NOW())`
    },
    {
      id: 2,
      name: "check_coupon_discount_value_positive",
      failSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('fail_2', 'F2', 'PERCENT', 0, 1, NOW(), NOW())`,
      passSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('pass_2', 'P2', 'PERCENT', 15, 1, NOW(), NOW())`
    },
    {
      id: 3,
      name: "check_coupon_percent_max",
      failSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('fail_3', 'F3', 'PERCENT', 101, 1, NOW(), NOW())`,
      passSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('pass_3', 'P3', 'PERCENT', 100, 1, NOW(), NOW())`
    },
    {
      id: 4,
      name: "check_coupon_max_discount",
      failSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxDiscountAmount", "perUserLimit", "createdAt", "updatedAt") VALUES ('fail_4', 'F4', 'PERCENT', 20, 0, 1, NOW(), NOW())`,
      passSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxDiscountAmount", "perUserLimit", "createdAt", "updatedAt") VALUES ('pass_4', 'P4', 'PERCENT', 20, 500, 1, NOW(), NOW())`
    },
    {
      id: 5,
      name: "check_coupon_max_redemptions",
      failSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxRedemptions", "perUserLimit", "createdAt", "updatedAt") VALUES ('fail_5', 'F5', 'PERCENT', 20, 0, 1, NOW(), NOW())`,
      passSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxRedemptions", "perUserLimit", "createdAt", "updatedAt") VALUES ('pass_5', 'P5', 'PERCENT', 20, 10, 1, NOW(), NOW())`
    },
    {
      id: 6,
      name: "check_coupon_per_user_limit",
      failSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('fail_6', 'F6', 'PERCENT', 20, 0, NOW(), NOW())`,
      passSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('pass_6', 'P6', 'PERCENT', 20, 1, NOW(), NOW())`
    },
    {
      id: 7,
      name: "check_coupon_date_range",
      failSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "validFrom", "validUntil", "createdAt", "updatedAt") VALUES ('fail_7', 'F7', 'PERCENT', 20, 1, '2026-10-10'::timestamp, '2026-10-05'::timestamp, NOW(), NOW())`,
      passSql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "validFrom", "validUntil", "createdAt", "updatedAt") VALUES ('pass_7', 'P7', 'PERCENT', 20, 1, '2026-10-01'::timestamp, '2026-10-31'::timestamp, NOW(), NOW())`
    },
    {
      id: 8,
      name: "check_coupon_redemption_status",
      failSql: `INSERT INTO "CouponRedemption" (id, "couponId", "userId", "paymentId", status, "createdAt") VALUES ('fail_8', 'c_fk_test', 'u_check_test', 'p_check_test', 'CANCELLED', NOW())`,
      passSql: `INSERT INTO "CouponRedemption" (id, "couponId", "userId", "paymentId", status, "createdAt") VALUES ('pass_8', 'c_fk_test', 'u_check_test', 'p_check_test', 'RELEASED', NOW())`
    }
  ];

  console.log("\n--- PART 1: 8 FAILING AND 8 PASSING INSERTS PER CONSTRAINT ---");
  const testResults: any[] = [];

  for (const c of constraintsSuite) {
    // 1. Failing INSERT in transaction (must roll back, expect Postgres 23514 and constraint name)
    let failBlocked = false;
    let failErrCode = "";
    let failErrMsg = "";

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(c.failSql);
      });
    } catch (err: any) {
      failErrMsg = err.message || String(err);
      if (failErrMsg.includes("23514") && failErrMsg.includes(c.name)) {
        failBlocked = true;
        failErrCode = "23514";
      }
    }

    // 2. Passing INSERT in transaction (executed then rolled back cleanly)
    let passSucceeded = false;
    let passErrMsg = "";

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(c.passSql);
        throw new Error("ROLLBACK_PASS_TEST");
      });
    } catch (err: any) {
      passErrMsg = err.message || String(err);
      if (passErrMsg.includes("ROLLBACK_PASS_TEST")) {
        passSucceeded = true;
      }
    }

    testResults.push({
      constraint: c.name,
      failInsertBlocked: failBlocked ? "PASS (23514)" : "FAIL",
      failConstraintMatched: failErrMsg.includes(c.name) ? "YES" : "NO",
      passInsertSucceeded: passSucceeded ? "PASS (clean rollback)" : "FAIL",
      overall: failBlocked && passSucceeded ? "PASS" : "FAIL"
    });
  }

  console.table(testResults);

  // --- PART 2: ROLLBACK SQL EXECUTION AND PROOF ---
  console.log("\n--- PART 2: EXECUTE prisma/manual-sql/coupon_checks_rollback.sql ---");
  const rollbackSql = fs.readFileSync("prisma/manual-sql/coupon_checks_rollback.sql", "utf-8");
  const rollbackStatements = rollbackSql.split(";").map(s => s.trim()).filter(s => s && s !== "BEGIN" && s !== "COMMIT");
  for (const stmt of rollbackStatements) {
    await prisma.$executeRawUnsafe(stmt);
  }

  const checksAfterRollback: any[] = await prisma.$queryRawUnsafe(`
    SELECT conname
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND contype = 'c'
      AND conrelid::regclass::text IN ('"Coupon"', '"CouponRedemption"', 'Coupon', 'CouponRedemption')
    ORDER BY conname;
  `);
  console.log(`CHECK constraints count after rollback: ${checksAfterRollback.length}`);
  const rollbackSuccess = checksAfterRollback.length === 0;
  console.log(`Constraints successfully dropped: ${rollbackSuccess ? "CONFIRMED (PASS)" : "FAIL"}`);

  // --- PART 3: RE-APPLY CONSTRAINTS AND PROOF ---
  console.log("\n--- PART 3: RE-APPLY CONSTRAINTS (migration.sql) AND PROOF ---");
  const reapplySql = fs.readFileSync("prisma/migrations/20261006002101_coupon_checks/migration.sql", "utf-8");
  const reapplyStatements = reapplySql.split(";").map(s => s.trim()).filter(s => s);
  for (const stmt of reapplyStatements) {
    if (stmt) await prisma.$executeRawUnsafe(stmt);
  }

  const checksAfterReapply: any[] = await prisma.$queryRawUnsafe(`
    SELECT conname
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND contype = 'c'
      AND conrelid::regclass::text IN ('"Coupon"', '"CouponRedemption"', 'Coupon', 'CouponRedemption')
    ORDER BY conname;
  `);
  console.log(`CHECK constraints count after re-apply: ${checksAfterReapply.length}`);
  const reapplySuccess = checksAfterReapply.length === 8;
  console.log(`All 8 constraints successfully re-applied: ${reapplySuccess ? "CONFIRMED (PASS)" : "FAIL"}`);

  // Clean up helper rows
  await prisma.$executeRawUnsafe(`DELETE FROM "Coupon" WHERE id = 'c_fk_test'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Payment" WHERE id = 'p_check_test'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = 'u_check_test'`);

  if (!testResults.every(r => r.overall === "PASS") || !rollbackSuccess || !reapplySuccess) {
    throw new Error("Step 2 tests failed!");
  }
  console.log("\n✓ STEP 2 ENTIRE SUITE PASSED.");
}

run()
  .catch((err) => {
    console.error("FATAL in test-step2e-checks-docker:", err);
    process.exit(1);
  })
  .finally(() => {
    const prisma = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
    prisma.$disconnect();
  });
