import { prisma } from "../lib/prisma";

async function main() {
  const sqlStatements = [
    'CREATE INDEX IF NOT EXISTS "ExamAttempt_userId_status_idx" ON "ExamAttempt"("userId", "status");',
    'CREATE INDEX IF NOT EXISTS "ExamAttempt_testId_status_idx" ON "ExamAttempt"("testId", "status");',
    'CREATE INDEX IF NOT EXISTS "Enrollment_userId_enrolledAt_idx" ON "Enrollment"("userId", "enrolledAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "ExamTest_seriesId_isPublished_idx" ON "ExamTest"("seriesId", "isPublished");'
  ];

  for (const sql of sqlStatements) {
    console.log("EXECUTING:", sql);
    await prisma.$executeRawUnsafe(sql);
    console.log("  -> SUCCESS");
  }

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename IN ('ExamAttempt', 'Enrollment', 'ExamTest')
    ORDER BY tablename, indexname;
  `);
  console.log("\nVERIFIED INDEXES AFTER APPLICATION:");
  console.log(JSON.stringify(indexes, null, 2));
}

main()
  .catch((e) => {
    console.error("FAILED to apply indexes:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
