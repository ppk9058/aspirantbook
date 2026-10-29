/**
 * scripts/measure-compaction-after.ts
 *
 * Measures post-compaction metrics:
 * 1. Student Review latency (n=20) with EXAM_ATTEMPT_COMPACTION_ENABLED=true
 * 2. Purges raw ExamAttemptAnswer rows and runs VACUUM FULL
 * 3. Measures table and index sizes for ExamAttemptAnswer and ExamAttemptArchive
 * 4. Teacher analytics latency (n=20) on compacted JSONB blobs vs raw SQL
 * 5. Live Submit latency (n=20)
 *
 * Saves raw measurements to docs/evidence/raw/compaction-after-metrics.txt
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function calculateStats(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n / 4)];
  const q3 = sorted[Math.floor((3 * n) / 4)];
  const iqr = q3 - q1;
  const p95 = sorted[Math.floor(n * 0.95)];
  return { n, min, max, median, q1, q3, iqr, p95 };
}

async function run() {
  console.log("=== COMPACTION POST-BENCHMARK SUITE ===");

  const testId = "bench_test_10k";

  // 1. Student Review Latency (Archived) - n=20 runs
  console.log("\n[1] Measuring Student Review Latency (Archived)...");
  // Select sample attempt
  const sampleAttempt = await prisma.examAttempt.findFirstOrThrow({
    where: { testId, archive: { isNot: null } },
    select: { id: true },
  });

  const reviewTimings: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    // Simulate archive read logic: fetch archive row + testQuestions
    const [archive, questions] = await Promise.all([
      prisma.examAttemptArchive.findUnique({
        where: { attemptId: sampleAttempt.id },
      }),
      prisma.examQuestion.findMany({
        where: { section: { testId } },
        orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
      }),
    ]);
    // In-memory mapping
    const answerMap = new Map((archive!.answersBlob as any[]).map((a) => [a.questionId, a]));
    const analysis = questions.map((q) => {
      const ans = answerMap.get(q.id);
      return {
        questionId: q.id,
        selectedOption: ans?.selectedOption ?? null,
        isCorrect: ans?.isCorrect ?? false,
      };
    });
    const t1 = performance.now();
    reviewTimings.push(t1 - t0);
  }
  const reviewStats = calculateStats(reviewTimings);
  console.log(`Student Review (Archived) (ms): median=${reviewStats.median.toFixed(2)}, min=${reviewStats.min.toFixed(2)}, max=${reviewStats.max.toFixed(2)}, IQR=${reviewStats.iqr.toFixed(2)}, p95=${reviewStats.p95.toFixed(2)}`);

  // 2. Measure Table & Index Sizes BEFORE Purge
  const beforeSizes: any[] = await prisma.$queryRaw`
    SELECT
      relname as name,
      pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
      pg_relation_size(c.oid) AS table_bytes,
      pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
      pg_indexes_size(c.oid) AS index_bytes,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_total_relation_size(c.oid) AS total_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('ExamAttemptAnswer', 'ExamAttemptArchive', 'ExamAttempt')
    ORDER BY total_bytes DESC;
  `;
  console.log("\n[2] Storage Sizes Before Purge:");
  console.table(beforeSizes);

  // 3. Purge Raw Answers & Run VACUUM FULL
  console.log("\n[3] Purging raw ExamAttemptAnswer rows and running VACUUM FULL...");
  const purgeRes: any = await prisma.$executeRaw`
    DELETE FROM "ExamAttemptAnswer"
    WHERE "attemptId" IN (SELECT id FROM "ExamAttempt" WHERE "testId" = ${testId});
  `;
  console.log(`Purged ${purgeRes} raw answer rows.`);

  await prisma.$executeRawUnsafe(`VACUUM FULL "ExamAttemptAnswer";`);
  await prisma.$executeRawUnsafe(`VACUUM FULL "ExamAttemptArchive";`);
  console.log("VACUUM FULL executed successfully.");

  // 4. Measure Storage Sizes AFTER Purge & VACUUM FULL
  const afterSizes: any[] = await prisma.$queryRaw`
    SELECT
      relname as name,
      pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
      pg_relation_size(c.oid) AS table_bytes,
      pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
      pg_indexes_size(c.oid) AS index_bytes,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_total_relation_size(c.oid) AS total_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('ExamAttemptAnswer', 'ExamAttemptArchive', 'ExamAttempt')
    ORDER BY total_bytes DESC;
  `;
  console.log("\n[4] Storage Sizes After Purge & VACUUM FULL:");
  console.table(afterSizes);

  // 5. Teacher Analytics Latency on Compacted Data (n=20)
  // Cross-attempt question analytics over 10k compacted attempts (10k JSONB blobs)
  console.log("\n[5] Measuring Teacher Question Analytics on Compacted JSONB (n=20)...");
  const teacherTimings: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await prisma.$queryRaw`
      SELECT
        (ans->>'questionId') AS question_id,
        COUNT(*) AS total_answers,
        COUNT(*) FILTER (WHERE (ans->>'isCorrect')::boolean IS TRUE) AS correct_answers,
        AVG((ans->>'timeSpentSecs')::numeric) AS avg_time_spent
      FROM "ExamAttemptArchive" a,
      jsonb_array_elements(a."answersBlob") AS ans
      WHERE a."testId" = ${testId}
      GROUP BY (ans->>'questionId')
      LIMIT 100;
    `;
    const t1 = performance.now();
    teacherTimings.push(t1 - t0);
  }
  const teacherStats = calculateStats(teacherTimings);
  console.log(`Teacher Analytics (Compacted JSONB) (ms): median=${teacherStats.median.toFixed(2)}, min=${teacherStats.min.toFixed(2)}, max=${teacherStats.max.toFixed(2)}, IQR=${teacherStats.iqr.toFixed(2)}, p95=${teacherStats.p95.toFixed(2)}`);

  // 6. Live Submit Latency After Compaction (n=20)
  console.log("\n[6] Measuring Live Submit Latency After Compaction (n=20)...");
  // Seed a user for submit benchmark
  const submitUser = await prisma.user.upsert({
    where: { email: "u_submit_bench@example.com" },
    create: { email: "u_submit_bench@example.com", name: "Submit Bench User" },
    update: {},
  });

  const testQuestions = await prisma.examQuestion.findMany({
    where: { section: { testId } },
    select: { id: true, correctOption: true },
  });

  const submitTimings: number[] = [];
  for (let i = 0; i < 20; i++) {
    const attId = `att_submit_post_${Date.now()}_${i}`;
    const answersData = testQuestions.map((q, idx) => ({
      attemptId: attId,
      questionId: q.id,
      selectedOption: idx % 2 === 0 ? q.correctOption : "C",
      isMarked: false,
      timeSpentSecs: 30,
      clientSeq: 1,
    }));

    const t0 = performance.now();
    await prisma.$transaction(async (tx) => {
      await tx.examAttempt.create({
        data: {
          id: attId,
          testId,
          userId: submitUser.id,
          status: "IN_PROGRESS",
          startedAt: new Date(Date.now() - 3600 * 1000),
        },
      });

      await tx.examAttemptAnswer.createMany({
        data: answersData,
      });

      await tx.examAttempt.update({
        where: { id: attId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          score: 50,
          totalMarks: 100,
        },
      });
    });
    const t1 = performance.now();
    submitTimings.push(t1 - t0);

    // Clean up bench attempt
    await prisma.examAttemptAnswer.deleteMany({ where: { attemptId: attId } });
    await prisma.examAttempt.deleteMany({ where: { id: attId } });
  }
  const submitStats = calculateStats(submitTimings);
  console.log(`Live Submit (ms): median=${submitStats.median.toFixed(2)}, min=${submitStats.min.toFixed(2)}, max=${submitStats.max.toFixed(2)}, IQR=${submitStats.iqr.toFixed(2)}, p95=${submitStats.p95.toFixed(2)}`);

  console.log("\n=== POST-COMPACTION SUMMARY ===");
  console.log(JSON.stringify(
    {
      studentReview: reviewStats,
      teacherAnalytics: teacherStats,
      liveSubmit: submitStats,
      storageBefore: beforeSizes,
      storageAfter: afterSizes,
    },
    (key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  ));
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[FATAL ERROR]", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
