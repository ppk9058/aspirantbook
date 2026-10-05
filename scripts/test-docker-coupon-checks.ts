import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";

// Force test DB credentials
process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

assertTestDb();

const prisma = new PrismaClient();

async function run() {
  console.log("=== STEP C: VERIFYING COUPON CHECK CONSTRAINTS ON DOCKER TEST DB ===");

  // Create prerequisite User, Course, Payment, and valid Coupon for FK requirements
  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" (id, email, role, "createdAt", "updatedAt") 
    VALUES ('u_chk_test', 'test_user_chk@test.local', 'FREE', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Payment" (id, "userId", amount, currency, status, "createdAt")
    VALUES ('p_chk_test', 'u_chk_test', 500, 'INR', 'PENDING', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  const testCases = [
    {
      name: "C1: Valid PERCENT coupon (50%)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_val_perc', 'VALID50', 'PERCENT', 50, 1, NOW(), NOW())`,
      shouldSucceed: true,
      expectedError: null
    },
    {
      name: "C2: Invalid discountType ('UNKNOWN')",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_inv_type', 'INVTYPE', 'UNKNOWN', 10, 1, NOW(), NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_discount_type"
    },
    {
      name: "C3: Invalid discountValue (<= 0)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_inv_val', 'INVVAL0', 'FLAT', 0, 1, NOW(), NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_discount_value_positive"
    },
    {
      name: "C4: Invalid PERCENT (> 100%)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_inv_pmax', 'INVPERC150', 'PERCENT', 150, 1, NOW(), NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_percent_max"
    },
    {
      name: "C5: Invalid maxDiscountAmount (<= 0)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxDiscountAmount", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_inv_maxd', 'INVMAXD', 'FLAT', 100, -5, 1, NOW(), NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_max_discount"
    },
    {
      name: "C6: Invalid maxRedemptions (<= 0)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "maxRedemptions", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_inv_maxr', 'INVMAXR', 'FLAT', 100, 0, 1, NOW(), NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_max_redemptions"
    },
    {
      name: "C7: Invalid perUserLimit (< 1)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_inv_peru', 'INVPERU', 'FLAT', 100, 0, NOW(), NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_per_user_limit"
    },
    {
      name: "C8: Invalid date range (validUntil < validFrom)",
      sql: `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "validFrom", "validUntil", "perUserLimit", "createdAt", "updatedAt") 
            VALUES ('c_inv_dates', 'INVDATE', 'FLAT', 100, NOW(), NOW() - INTERVAL '1 day', 1, NOW(), NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_date_range"
    },
    {
      name: "C9: Invalid CouponRedemption status ('CANCELLED')",
      sql: `INSERT INTO "CouponRedemption" (id, "couponId", "userId", "paymentId", status, "createdAt") 
            VALUES ('cr_inv_stat', 'c_val_perc', 'u_chk_test', 'p_chk_test', 'CANCELLED', NOW())`,
      shouldSucceed: false,
      expectedError: "check_coupon_redemption_status"
    }
  ];

  const results = [];

  for (const tc of testCases) {
    let success = false;
    let errorMsg = "";
    try {
      await prisma.$executeRawUnsafe(tc.sql);
      success = true;
    } catch (err: any) {
      success = false;
      errorMsg = err.message || String(err);
    }

    const passed = tc.shouldSucceed
      ? success
      : !success && tc.expectedError ? errorMsg.includes(tc.expectedError) : true;

    results.push({
      testCase: tc.name,
      shouldSucceed: tc.shouldSucceed,
      actualSucceeded: success,
      matchedConstraint: tc.expectedError ? errorMsg.includes(tc.expectedError) : "N/A",
      result: passed ? "PASS" : "FAIL"
    });
  }

  console.table(results);

  // Clean up
  await prisma.$executeRawUnsafe(`DELETE FROM "CouponRedemption" WHERE id = 'cr_inv_stat'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Payment" WHERE id = 'p_chk_test'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Coupon" WHERE id = 'c_val_perc'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = 'u_chk_test'`);
  console.log("Cleanup complete on Docker test DB.");
}

run()
  .catch((err) => {
    console.error("FATAL in test-docker-coupon-checks:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
