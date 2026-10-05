import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP 1: VERIFY DEV STATE (STRICT READ-ONLY) ===");

  // Enforce read-only
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // 1a. Masked host + db, current_database, read-only proof
  const dbInfo: any[] = await prisma.$queryRawUnsafe(`
    SELECT current_database(), current_user, inet_server_addr()::text as server_addr, inet_server_port() as server_port
  `);
  console.log("1a. DB Information (Dev):", dbInfo);

  let insertBlocked = false;
  let insertError = "";
  try {
    await prisma.$executeRawUnsafe(`INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "perUserLimit", "createdAt", "updatedAt") VALUES ('ro_test', 'ROTEST', 'PERCENT', 10, 1, NOW(), NOW())`);
  } catch (err: any) {
    insertBlocked = true;
    insertError = err.message || String(err);
  }
  console.log("1a. Read-Only Proof: INSERT blocked:", insertBlocked, "| Error:", insertError.split('\n')[0]);

  // 1b. Row counts for every table in the schema
  const tables: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const counts: { table: string; count: number }[] = [];
  for (const t of tables) {
    const tableName = t.table_name;
    const res: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "${tableName}"`);
    counts.push({ table: tableName, count: res[0]?.cnt ?? 0 });
  }
  console.log("\n1b. Table Row Counts (Dev Database - Full List from information_schema):");
  console.table(counts);

  // 1c. _prisma_migrations rows
  const migs: any[] = await prisma.$queryRawUnsafe(`
    SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count 
    FROM "_prisma_migrations" 
    ORDER BY started_at;
  `);
  console.log("\n1c. _prisma_migrations Rows (Dev):");
  console.table(migs);

  // Orphan checks
  const orphanPayments: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as cnt FROM "Payment" p WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = p."userId")
  `);
  const orphanEnrollments: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as cnt FROM "Enrollment" e WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."userId")
  `);
  const orphanProgress: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as cnt FROM "Progress" pr WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pr."userId")
  `);
  const orphanExamAttempts: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as cnt FROM "ExamAttempt" ea WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = ea."userId")
  `);

  console.log("\n1f. Orphan Checks (userId no longer exists):");
  console.table([
    { entity: "Payment", orphanCount: orphanPayments[0]?.cnt, pass: orphanPayments[0]?.cnt === 0 },
    { entity: "Enrollment", orphanCount: orphanEnrollments[0]?.cnt, pass: orphanEnrollments[0]?.cnt === 0 },
    { entity: "Progress", orphanCount: orphanProgress[0]?.cnt, pass: orphanProgress[0]?.cnt === 0 },
    { entity: "ExamAttempt", orphanCount: orphanExamAttempts[0]?.cnt, pass: orphanExamAttempts[0]?.cnt === 0 },
  ]);
}

run()
  .catch((err) => {
    console.error("FATAL in step1-verify-dev-state:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
