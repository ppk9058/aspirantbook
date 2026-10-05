import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP 1.b: LIVE DB SCHEMA INSPECTION (READ-ONLY) ===");

  // Set transaction read only
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // 1. Coupon table columns
  console.log("\n--- Table 'Coupon' Columns ---");
  const couponCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'Coupon'
    ORDER BY ordinal_position
  `);
  console.table(couponCols);

  // 2. CouponRedemption table columns
  console.log("\n--- Table 'CouponRedemption' Columns ---");
  const redempCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'CouponRedemption'
    ORDER BY ordinal_position
  `);
  console.table(redempCols);

  // 3. Payment added columns
  console.log("\n--- Table 'Payment' Added Coupon Columns ---");
  const paymentCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Payment' AND column_name IN ('couponId', 'couponCode', 'originalAmount', 'discountAmount')
    ORDER BY ordinal_position
  `);
  console.table(paymentCols);

  // 4. Foreign keys and cascade delete rules
  console.log("\n--- Foreign Key Constraints & Delete Rules ---");
  const fkRules = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_name IN ('Coupon', 'CouponRedemption', 'Payment')
      AND kcu.column_name IN ('courseId', 'couponId', 'userId', 'paymentId')
    ORDER BY tc.table_name, kcu.column_name
  `);
  console.table(fkRules);

  // 5. Unique constraints
  console.log("\n--- Unique Constraints on Coupon and CouponRedemption ---");
  const uniqs = await prisma.$queryRawUnsafe(`
    SELECT tc.table_name, tc.constraint_name, string_agg(kcu.column_name, ', ') AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name IN ('Coupon', 'CouponRedemption')
      AND tc.constraint_type = 'UNIQUE'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name, tc.constraint_name
  `);
  console.table(uniqs);
}

run()
  .catch((err) => {
    console.error("FATAL in inspect-live-db-schema:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
