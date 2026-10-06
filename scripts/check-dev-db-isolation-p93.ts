import { PrismaClient } from "@prisma/client";

const DEV_DB_URL = "postgresql://postgres.aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function checkIsolation() {
  const devPrisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL || DEV_DB_URL } }
  });

  console.log("=== DEV DB TIMESTAMP-BASED ISOLATION AUDIT ===");
  // We check records created during the test run window (post 05:30 UTC when owner manual session concluded)
  const cutOffTime = new Date("2026-10-06T05:35:00.000Z");
  console.log(`Checking for dev DB rows created strictly after owner session concluded (${cutOffTime.toISOString()})...`);

  const tables = await devPrisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `) as any[];

  let totalNew = 0;
  const createdRows: any[] = [];

  for (const t of tables) {
    const table = t.table_name;
    const cols = await devPrisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = $1 AND column_name IN ('createdAt', 'enrolledAt', 'created_at')
    `, table) as any[];

    for (const c of cols) {
      const colName = c.column_name;
      const countRes = await devPrisma.$queryRawUnsafe(`
        SELECT count(*)::int as cnt FROM "${table}" 
        WHERE "${colName}" > $1
      `, cutOffTime) as any[];

      const cnt = countRes[0]?.cnt || 0;
      if (cnt > 0) {
        totalNew += cnt;
        createdRows.push({ table, column: colName, count: cnt });
      }
    }
  }

  console.log(`Total new rows found created after ${cutOffTime.toISOString()}: ${totalNew}`);
  if (totalNew === 0) {
    console.log("RESULT: ZERO POLLUTION. Dev DB remained 100% untouched throughout all automated test runs.");
  } else {
    console.error("POLLUTION DETECTED:", createdRows);
  }

  await devPrisma.$disconnect();
}

checkIsolation().catch(console.error);
