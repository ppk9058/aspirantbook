import { PrismaClient } from "@prisma/client";

const devPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } }
});

const testPrisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test" } }
});

async function run() {
  console.log("=== DROPPING REDUNDANT COMPOSITE UNIQUE INDEX ON CouponRedemption ===");
  
  // 1. Drop on dev DB
  console.log("Dropping CouponRedemption_couponId_userId_paymentId_key on DEV DB...");
  await devPrisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "CouponRedemption_couponId_userId_paymentId_key";
  `);
  console.log("✓ Dropped on DEV DB.");

  // 2. Drop on Docker test DB
  console.log("Dropping CouponRedemption_couponId_userId_paymentId_key on TEST DB...");
  await testPrisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "CouponRedemption_couponId_userId_paymentId_key";
  `);
  console.log("✓ Dropped on TEST DB.");

  // 3. Verify indexes on both
  const devIdx: any[] = await devPrisma.$queryRawUnsafe(`
    SELECT indexname FROM pg_indexes WHERE tablename = 'CouponRedemption' ORDER BY indexname
  `);
  console.log("\nRemaining Indexes on DEV CouponRedemption:");
  console.table(devIdx);

  const testIdx: any[] = await testPrisma.$queryRawUnsafe(`
    SELECT indexname FROM pg_indexes WHERE tablename = 'CouponRedemption' ORDER BY indexname
  `);
  console.log("\nRemaining Indexes on TEST CouponRedemption:");
  console.table(testIdx);
}

run()
  .catch((err) => {
    console.error("FATAL in drop-redundant-unique-index:", err);
    process.exit(1);
  })
  .finally(async () => {
    await devPrisma.$disconnect();
    await testPrisma.$disconnect();
  });
