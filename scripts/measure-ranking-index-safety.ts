import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test?connection_limit=5";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Task A6: Migration Safety & Ranking Index Benchmark ===");

  // 1. Setup benchmark test and user fixtures
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "updatedAt")
    VALUES ('u_perf_bench_user', 'Bench User', 'bench_user@trillionskill.test', 'FREE', NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING;
  `;

  await prisma.$executeRaw`
    INSERT INTO "ExamSeries" ("id", "title", "slug", "examName", "category", "createdById", "createdAt", "updatedAt")
    VALUES ('es_bench_series', 'Bench Series', 'bench-series-index-safety', 'UPSC', 'Civil Services', 'u_perf_bench_user', NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING;
  `;

  await prisma.$executeRaw`
    INSERT INTO "ExamTest" ("id", "seriesId", "title", "durationMinutes", "totalMarks", "isPublished", "createdById", "createdAt", "updatedAt")
    VALUES ('et_perf_index_bench', 'es_bench_series', '100k Benchmark Exam', 120, 200, true, 'u_perf_bench_user', NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING;
  `;

  // 2. Check existing row count
  const existingCountRes: Array<{ count: bigint }> = await prisma.$queryRaw`
    SELECT count(*)::bigint AS count FROM "ExamAttempt" WHERE "testId" = 'et_perf_index_bench';
  `;
  const existingCount = Number(existingCountRes[0].count);
  console.log(`Current benchmark attempts on record: ${existingCount}`);

  if (existingCount < 100000) {
    const toInsert = 100000 - existingCount;
    console.log(`Seeding ${toInsert} attempts via generate_series...`);
    const seedStart = Date.now();
    await prisma.$executeRaw`
      INSERT INTO "ExamAttempt" (
        "id", "testId", "userId", "status", "score", "totalMarks",
        "timeTakenSecs", "startedAt", "submittedAt"
      )
      SELECT
        'att_100k_' || s.i,
        'et_perf_index_bench',
        'u_perf_bench_user',
        'SUBMITTED',
        round((random() * 200)::numeric, 2),
        200,
        floor(random() * 7200)::int,
        NOW() - (s.i || ' seconds')::interval,
        NOW() - (s.i || ' seconds')::interval
      FROM generate_series(${existingCount + 1}, 100000) AS s(i)
      ON CONFLICT ("id") DO NOTHING;
    `;
    console.log(`Seeding completed in ${((Date.now() - seedStart) / 1000).toFixed(2)}s`);
  }

  // 3. Measure table sizes
  const sizeRes: Array<{
    table_name: string;
    total_size: string;
    table_size: string;
    index_size: string;
    row_count: bigint;
  }> = await prisma.$queryRaw`
    SELECT
      'ExamAttempt' AS table_name,
      pg_size_pretty(pg_total_relation_size('"ExamAttempt"')) AS total_size,
      pg_size_pretty(pg_relation_size('"ExamAttempt"')) AS table_size,
      pg_size_pretty(pg_indexes_size('"ExamAttempt"')) AS index_size,
      count(*)::bigint AS row_count
    FROM "ExamAttempt";
  `;
  console.log("\nTable Dimensions:");
  console.table(sizeRes);

  // 4. Drop and rebuild index, measuring build time
  console.log("\nDropping idx_examattempt_ranking...");
  await prisma.$executeRaw`DROP INDEX IF EXISTS "idx_examattempt_ranking";`;

  console.log("Measuring standard CREATE INDEX IF NOT EXISTS build time...");
  const t0 = performance.now();
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "idx_examattempt_ranking"
    ON "ExamAttempt"("testId", "score" DESC, "timeTakenSecs" ASC, "submittedAt" ASC);
  `;
  const t1 = performance.now();
  const buildTimeStandard = (t1 - t0).toFixed(2);
  console.log(`Standard index build time: ${buildTimeStandard} ms`);

  // Measure index size specifically
  const indexSizeRes: Array<{ index_size: string }> = await prisma.$queryRaw`
    SELECT pg_size_pretty(pg_relation_size('"idx_examattempt_ranking"')) AS index_size;
  `;
  console.log(`Size of idx_examattempt_ranking alone: ${indexSizeRes[0].index_size}`);

  console.log("\nAll checks completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
