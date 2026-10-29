import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";

// Security Guard
const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.includes("supabase.co")) {
  console.error("FATAL: Connecting to remote Supabase DB is strictly forbidden!");
  process.exit(1);
}

function computeStats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  return { n, min: Number(min.toFixed(2)), max: Number(max.toFixed(2)), median: Number(median.toFixed(2)), q1: Number(q1.toFixed(2)), q3: Number(q3.toFixed(2)), iqr: Number(iqr.toFixed(2)) };
}

async function main() {
  console.log("=== Task C1: Measure Before Compacting (10k attempts / 1M answers) ===");
  console.log(`Database: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

  // 1. Setup author, series, test, section, and 100 questions
  console.log("\n[1/5] Setting up test exam with 100 questions...");
  const user = await prisma.user.upsert({
    where: { email: "compaction_teacher@example.com" },
    update: {},
    create: {
      email: "compaction_teacher@example.com",
      name: "Compaction Benchmark Admin",
      role: "ADMIN",
    },
  });

  const series = await prisma.examSeries.upsert({
    where: { slug: "compaction-benchmark-series" },
    update: {},
    create: {
      id: "bench_series_10k",
      title: "Compaction Benchmark Series",
      slug: "compaction-benchmark-series",
      examName: "Benchmark Exam",
      category: "General Studies",
      createdById: user.id,
    },
  });

  const testRecord = await prisma.examTest.upsert({
    where: { id: "bench_test_10k" },
    update: {},
    create: {
      id: "bench_test_10k",
      seriesId: series.id,
      title: "Compaction Benchmark Test (100 Questions)",
      durationMinutes: 120,
      totalQuestions: 100,
      totalMarks: 100,
      isPublished: true,
      createdById: user.id,
    },
  });

  const section = await prisma.examSection.upsert({
    where: { id: "bench_section_10k" },
    update: {},
    create: {
      id: "bench_section_10k",
      testId: testRecord.id,
      title: "General Section",
      order: 1,
    },
  });

  // Ensure 100 questions exist
  const existingQuestions = await prisma.examQuestion.count({
    where: { sectionId: section.id },
  });

  if (existingQuestions < 100) {
    console.log(`Creating ${100 - existingQuestions} missing questions...`);
    const qData: any[] = [];
    const options = ["A", "B", "C", "D"];
    for (let i = existingQuestions + 1; i <= 100; i++) {
      qData.push({
        id: `bench_q_${i}`,
        sectionId: section.id,
        questionEn: `Benchmark Question #${i}: What is the primary performance tradeoff of storing normalized answers versus compacted JSON blobs?`,
        optionAEn: "Storage footprint versus per-question aggregate query latency",
        optionBEn: "Network latency only",
        optionCEn: "Memory allocation on the client",
        optionDEn: "None of the above",
        correctOption: options[i % 4],
        explanationEn: `Explanation for question #${i}: Compacted JSON reduces raw storage while unindexed analytics requires decompression.`,
        order: i,
      });
    }
    await prisma.examQuestion.createMany({
      data: qData,
      skipDuplicates: true,
    });
  }

  // 2. Fast Bulk Seeding of 10,000 Attempts and 1,000,000 Answers
  const currentAttempts = await prisma.examAttempt.count({
    where: { testId: testRecord.id },
  });
  console.log(`Current attempts in DB: ${currentAttempts}`);

  const TARGET_ATTEMPTS = 10000;
  if (currentAttempts < TARGET_ATTEMPTS) {
    const toCreate = TARGET_ATTEMPTS - currentAttempts;
    console.log(`\n[2/5] Bulk seeding ${toCreate} attempts and ${toCreate * 100} answers...`);

    const BATCH_SIZE = 500;
    const batches = Math.ceil(toCreate / BATCH_SIZE);
    const options = ["A", "B", "C", "D"];

    for (let b = 0; b < batches; b++) {
      const batchAttemptsCount = Math.min(BATCH_SIZE, toCreate - b * BATCH_SIZE);
      const attemptRows: any[] = [];
      const answerRows: any[] = [];

      const startIdx = currentAttempts + b * BATCH_SIZE;

      for (let i = 0; i < batchAttemptsCount; i++) {
        const attemptIdx = startIdx + i + 1;
        const attemptId = `att_${attemptIdx.toString().padStart(6, "0")}`;
        const score = Math.floor(Math.random() * 80) + 20;

        attemptRows.push({
          id: attemptId,
          testId: testRecord.id,
          userId: user.id,
          status: "SUBMITTED",
          score,
          totalMarks: 100,
          correctCount: score,
          wrongCount: 100 - score,
          skippedCount: 0,
          timeTakenSecs: Math.floor(Math.random() * 3600) + 1200,
          submittedAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)),
        });

        for (let q = 1; q <= 100; q++) {
          const selected = options[Math.floor(Math.random() * 4)];
          const correct = options[q % 4];
          const isCorrect = selected === correct;
          answerRows.push({
            id: `ans_${attemptId}_${q}`,
            attemptId,
            questionId: `bench_q_${q}`,
            selectedOption: selected,
            isCorrect,
            marksAwarded: isCorrect ? 1.0 : -0.33,
            timeSpentSecs: Math.floor(Math.random() * 60) + 10,
            clientSeq: q,
          });
        }
      }

      await prisma.examAttempt.createMany({
        data: attemptRows,
        skipDuplicates: true,
      });

      // Insert answers in chunks of 5000
      const CHUNK = 5000;
      for (let c = 0; c < answerRows.length; c += CHUNK) {
        await prisma.examAttemptAnswer.createMany({
          data: answerRows.slice(c, c + CHUNK),
          skipDuplicates: true,
        });
      }

      process.stdout.write(`\rProgress: ${startIdx + batchAttemptsCount}/${TARGET_ATTEMPTS} attempts seeded`);
    }
    console.log("\nSeeding complete!");
  }

  // 3. Exact Disk Bytes & Table/Index Sizes
  console.log("\n[3/5] Querying PostgreSQL table & index sizes...");
  const sizeRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      c.relname,
      pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
      pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_relation_size(c.oid)::bigint AS table_bytes,
      pg_indexes_size(c.oid)::bigint AS index_bytes,
      pg_total_relation_size(c.oid)::bigint AS total_bytes,
      c.reltuples::bigint AS est_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname IN ('ExamAttempt', 'ExamAttemptAnswer')
      AND n.nspname = 'public'
    ORDER BY c.relname;
  `);

  console.table(sizeRows);

  const attemptCount = await prisma.examAttempt.count({ where: { testId: testRecord.id } });
  const answerCount = await prisma.examAttemptAnswer.count({
    where: { attempt: { testId: testRecord.id } },
  });
  console.log(`Exact count for test ${testRecord.id}: ${attemptCount} attempts, ${answerCount} answers`);

  // 4. Query Latency Benchmarks (n=20 runs each)
  console.log("\n[4/5] Measuring query latencies (n=20 runs each)...");

  // A. Student review (fetch all 100 answers for 1 attempt)
  const studentLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const randomAttemptId = `att_${(Math.floor(Math.random() * 1000) + 1).toString().padStart(6, "0")}`;
    const t0 = performance.now();
    await prisma.examAttemptAnswer.findMany({
      where: { attemptId: randomAttemptId },
      orderBy: { clientSeq: "asc" },
    });
    studentLatencies.push(performance.now() - t0);
  }
  const studentStats = computeStats(studentLatencies);
  console.log("Student review (100 answers):", studentStats);

  // B. Teacher analytics (aggregate accuracy across all 10k attempts / 1M answers)
  const teacherLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await prisma.$queryRawUnsafe(`
      SELECT
        "questionId",
        COUNT(*)::int AS total_attempts,
        SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END)::int AS correct_count,
        ROUND(AVG("timeSpentSecs")::numeric, 2) AS avg_time_secs
      FROM "ExamAttemptAnswer"
      WHERE "attemptId" IN (
        SELECT id FROM "ExamAttempt" WHERE "testId" = '${testRecord.id}'
      )
      GROUP BY "questionId"
      ORDER BY "questionId";
    `);
    teacherLatencies.push(performance.now() - t0);
  }
  const teacherStats = computeStats(teacherLatencies);
  console.log("Teacher analytics (1M rows aggregated):", teacherStats);

  // C. Live submit (insert 1 attempt + 100 answers in transaction)
  const submitLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const submitAttemptId = `att_live_bench_${Date.now()}_${i}`;
    const t0 = performance.now();
    await prisma.$transaction(async (tx) => {
      await tx.examAttempt.create({
        data: {
          id: submitAttemptId,
          testId: testRecord.id,
          userId: user.id,
          status: "SUBMITTED",
          score: 75,
          totalMarks: 100,
          correctCount: 75,
          wrongCount: 25,
          submittedAt: new Date(),
        },
      });

      const sampleAnswers = [];
      for (let q = 1; q <= 100; q++) {
        sampleAnswers.push({
          id: `ans_${submitAttemptId}_${q}`,
          attemptId: submitAttemptId,
          questionId: `bench_q_${q}`,
          selectedOption: "A",
          isCorrect: true,
          marksAwarded: 1.0,
          timeSpentSecs: 30,
          clientSeq: q,
        });
      }
      await tx.examAttemptAnswer.createMany({
        data: sampleAnswers,
      });
    });
    submitLatencies.push(performance.now() - t0);
  }
  const submitStats = computeStats(submitLatencies);
  console.log("Live submit (1 attempt + 100 answers):", submitStats);

  // 5. Output Summary JSON
  const baselineResults = {
    timestamp: new Date().toISOString(),
    hardware: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    dataset: {
      testId: testRecord.id,
      attemptsCount: attemptCount,
      answersCount: answerCount,
    },
    sizes: sizeRows.map((r) => ({
      table: r.relname,
      tableSize: r.table_size,
      indexSize: r.index_size,
      totalSize: r.total_size,
      tableBytes: Number(r.table_bytes),
      indexBytes: Number(r.index_bytes),
      totalBytes: Number(r.total_bytes),
      estRows: Number(r.est_rows),
    })),
    latenciesMs: {
      studentReview: studentStats,
      teacherAnalytics: teacherStats,
      liveSubmit: submitStats,
    },
  };

  console.log("\n[5/5] Baseline measurements captured successfully!");
  console.log(JSON.stringify(baselineResults, null, 2));
}

main()
  .catch((e) => {
    console.error("Benchmark failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
