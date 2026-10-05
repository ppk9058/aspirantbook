import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";

const TEST_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";

async function run() {
  console.log("=== STEP 2e: PROVE CHECK CONSTRAINTS & ROLLBACK FILE (DOCKER) ===");
  assertTestDb();

  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_URL } }
  });

  const tests = [
    {
      name: "1. discountType check (invalid 'BOGUS')",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('c1', 'CODE1', 'BOGUS', 10, 1, NOW(), NOW())`,
      expectError: "check_coupon_discount_type"
    },
    {
      name: "2. discountValue positive (0 value)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('c2', 'CODE2', 'PERCENT', 0, 1, NOW(), NOW())`,
      expectError: "check_coupon_discount_value_positive"
    },
    {
      name: "3. percent max check (105%)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('c3', 'CODE3', 'PERCENT', 105, 1, NOW(), NOW())`,
      expectError: "check_coupon_percent_max"
    },
    {
      name: "4. maxDiscountAmount check (-5)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxDiscountAmount", "perUserLimit", "createdAt", "updatedAt") VALUES ('c4', 'CODE4', 'PERCENT', 10, -5, 1, NOW(), NOW())`,
      expectError: "check_coupon_max_discount"
    },
    {
      name: "5. maxRedemptions check (0)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxRedemptions", "perUserLimit", "createdAt", "updatedAt") VALUES ('c5', 'CODE5', 'PERCENT', 10, 0, 1, NOW(), NOW())`,
      expectError: "check_coupon_max_redemptions"
    },
    {
      name: "6. perUserLimit check (0)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('c6', 'CODE6', 'PERCENT', 10, 0, NOW(), NOW())`,
      expectError: "check_coupon_per_user_limit"
    },
    {
      name: "7. validUntil > validFrom (inverted dates)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "validFrom", "validUntil", "createdAt", "updatedAt") VALUES ('c7', 'CODE7', 'PERCENT', 10, 1, '2026-10-10'::timestamp, '2026-10-01'::timestamp, NOW(), NOW())`,
      expectError: "check_coupon_date_range"
    },
    {
      name: "8. CouponRedemption.status check ('CANCELLED')",
      sql: `INSERT INTO "CouponRedemption" (id, "couponId", "userId", "paymentId", status, "createdAt") VALUES ('r1', 'c_valid', 'u_test', 'p_test', 'CANCELLED', NOW())`,
      expectError: "check_coupon_redemption_status"
    }
  ];

  const results: any[] = [];
  for (const t of tests) {
    let passed = false;
    let actualErr = "";
    try {
      await prisma.$executeRawUnsafe(t.sql);
    } catch (err: any) {
      actualErr = err.message || String(err);
      if (actualErr.includes(t.expectError)) {
        passed = true;
      }
    }
    results.push({
      test: t.name,
      expectedConstraint: t.expectError,
      blocked: passed ? "YES (PASS)" : "NO (FAIL)",
      errorSnippet: actualErr.split("\n")[0].substring(0, 70)
    });
  }

  // Passing test case in rolled-back transaction
  let passingPass = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`
        INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "validFrom", "validUntil", "createdAt", "updatedAt") 
        VALUES ('c_valid_test', 'VALIDTEST', 'PERCENT', 50, 2, '2026-10-01'::timestamp, '2026-10-31'::timestamp, NOW(), NOW())
      `);
      throw new Error("ROLLBACK_ON_PURPOSE");
    });
  } catch (err: any) {
    if (err.message.includes("ROLLBACK_ON_PURPOSE")) {
      passingPass = true;
    }
  }

  results.push({
    test: "9. Valid Coupon Passing Insert (Rolled Back)",
    expectedConstraint: "None (Success)",
    blocked: passingPass ? "ROLLED BACK CLEANLY (PASS)" : "FAIL",
    errorSnippet: "Transaction rolled back as planned"
  });

  console.table(results);
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
