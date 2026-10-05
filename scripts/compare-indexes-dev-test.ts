import { prisma as devPrisma } from "../lib/prisma";
import { PrismaClient } from "@prisma/client";

const testPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test" }
  }
});

async function run() {
  console.log("=== STEP B4.d: SIDE-BY-SIDE INDEX & CONSTRAINT COMPARISON ===");
  await devPrisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  const tables = ["Coupon", "CouponRedemption", "Payment", "Enrollment"];

  for (const table of tables) {
    console.log(`\n================ TABLE: ${table} ================`);
    
    // Indexes on dev
    const devIndexes: any[] = await devPrisma.$queryRawUnsafe(`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '${table}' ORDER BY indexname
    `);
    
    // Indexes on test
    const testIndexes: any[] = await testPrisma.$queryRawUnsafe(`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '${table}' ORDER BY indexname
    `);

    console.log(`--- Indexes: Dev (${devIndexes.length}) vs Test (${testIndexes.length}) ---`);
    console.log("Dev Indexes:");
    console.table(devIndexes.map(i => ({ indexname: i.indexname })));
    console.log("Test Indexes:");
    console.table(testIndexes.map(i => ({ indexname: i.indexname })));

    // Constraints on dev
    const devConstraints: any[] = await devPrisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = '"${table}"'::regclass
      ORDER BY conname
    `);

    // Constraints on test
    const testConstraints: any[] = await testPrisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = '"${table}"'::regclass
      ORDER BY conname
    `);

    console.log(`--- Constraints: Dev (${devConstraints.length}) vs Test (${testConstraints.length}) ---`);
    console.log("Dev Constraints:");
    console.table(devConstraints);
    console.log("Test Constraints:");
    console.table(testConstraints);
  }
}

run()
  .catch((err) => {
    console.error("FATAL in compare-indexes-dev-test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await devPrisma.$disconnect();
    await testPrisma.$disconnect();
  });
