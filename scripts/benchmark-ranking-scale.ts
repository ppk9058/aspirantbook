import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test?connection_limit=5";

const prisma = new PrismaClient();

async function benchmarkScale() {
  console.log("=== Task A8: Ranking Correctness and Performance at Scale ===");

  const scales = [1000, 10000, 100000, 300000];
  const results: any[] = [];

  for (const scale of scales) {
    const testId = `et_bench_${scale}`;
    console.log(`\n--- Benchmarking Scale: ${scale} Attempts ---`);

    // Setup ExamTest
    await prisma.$executeRaw`
      INSERT INTO "ExamTest" ("id", "seriesId", "title", "durationMinutes", "totalMarks", "isPublished", "createdById", "createdAt", "updatedAt")
      VALUES (${testId}, 'es_bench_series', ${`Benchmark ${scale}`}, 120, 200, true, 'u_perf_bench_user', NOW(), NOW())
      ON CONFLICT ("id") DO NOTHING;
    `;

    // Seed users first to satisfy foreign key
    console.log(`Seeding ${scale} distinct users for ${testId}...`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "updatedAt")
      SELECT
        'u_bench_${scale}_' || s.i,
        'Student ' || s.i,
        'student_${scale}_' || s.i || '@trillionskill.test',
        'FREE',
        NOW(),
        NOW()
      FROM generate_series(1, ${scale}) AS s(i)
      ON CONFLICT ("id") DO NOTHING;
    `);

    // Seed attempts with distinct userIds
    console.log(`Seeding ${scale} distinct attempts for ${testId}...`);
    const seedStart = performance.now();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ExamAttempt" (
        "id", "testId", "userId", "status", "score", "totalMarks",
        "timeTakenSecs", "startedAt", "submittedAt"
      )
      SELECT
        'att_${scale}_' || s.i,
        '${testId}',
        'u_bench_${scale}_' || s.i,
        'SUBMITTED',
        round((random() * 200)::numeric, 2),
        200,
        floor(random() * 7200)::int,
        NOW() - (s.i || ' seconds')::interval,
        NOW() - (s.i || ' seconds')::interval
      FROM generate_series(1, ${scale}) AS s(i)
      ON CONFLICT ("id") DO NOTHING;
    `);
    const seedDuration = ((performance.now() - seedStart) / 1000).toFixed(2);
    console.log(`Seeded in ${seedDuration}s`);

    // 1. EXPLAIN (ANALYZE, BUFFERS) on Live-Rank Query
    const liveRankSql = `
      EXPLAIN (ANALYZE, BUFFERS)
      WITH first_attempts AS (
        SELECT DISTINCT ON (a."userId")
          a.id,
          a."userId",
          a.score,
          a."timeTakenSecs",
          a."submittedAt"
        FROM "ExamAttempt" a
        WHERE a."testId" = '${testId}'
          AND a.status = 'SUBMITTED'
        ORDER BY a."userId", a."submittedAt" ASC, a."startedAt" ASC
      )
      SELECT
        COUNT(*)::int AS "totalCandidates",
        COUNT(*) FILTER (
          WHERE score > 100
             OR (score = 100 AND "timeTakenSecs" < 1000)
             OR (score = 100 AND "timeTakenSecs" = 1000 AND "submittedAt" < NOW())
        )::int AS "betterCandidates"
      FROM first_attempts;
    `;

    const liveRankPlanRes: any[] = await prisma.$queryRawUnsafe(liveRankSql);
    const liveRankPlan = liveRankPlanRes.map((r) => Object.values(r)[0]).join("\n");
    const liveExecMatch = liveRankPlan.match(/Execution Time:\s*([0-9.]+)\s*ms/);
    const liveExecTime = liveExecMatch ? parseFloat(liveExecMatch[1]) : 0;

    // 2. EXPLAIN (ANALYZE, BUFFERS) on Top-N Leaderboard Query (Top 50)
    const topNSql = `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT
        a.id,
        a."userId",
        a.score,
        a."totalMarks",
        a."timeTakenSecs",
        a."submittedAt"
      FROM "ExamAttempt" a
      WHERE a."testId" = '${testId}'
        AND a.status = 'SUBMITTED'
      ORDER BY a.score DESC, a."timeTakenSecs" ASC, a."submittedAt" ASC
      LIMIT 50;
    `;

    const topNPlanRes: any[] = await prisma.$queryRawUnsafe(topNSql);
    const topNPlan = topNPlanRes.map((r) => Object.values(r)[0]).join("\n");
    const topNExecMatch = topNPlan.match(/Execution Time:\s*([0-9.]+)\s*ms/);
    const topNExecTime = topNExecMatch ? parseFloat(topNExecMatch[1]) : 0;

    console.log(`Live Rank Query Latency (${scale} attempts): ${liveExecTime} ms`);
    console.log(`Top-N Query Latency (${scale} attempts): ${topNExecTime} ms`);

    results.push({
      scale,
      liveExecTimeMs: liveExecTime,
      topNExecTimeMs: topNExecTime,
      liveRankPlan,
      topNPlan,
    });
  }

  // Generate output report
  let report = "=== TASK A8: RANKING PERFORMANCE & EXPLAIN BUFFER PLANS ===\n\n";
  for (const r of results) {
    report += `=====================================================================\n`;
    report += `SCALE: ${r.scale} ATTEMPTS\n`;
    report += `Live-Rank Query Latency: ${r.liveExecTimeMs} ms\n`;
    report += `Top-50 Query Latency: ${r.topNExecTimeMs} ms\n`;
    report += `\n--- Live-Rank EXPLAIN (ANALYZE, BUFFERS) ---\n${r.liveRankPlan}\n`;
    report += `\n--- Top-50 EXPLAIN (ANALYZE, BUFFERS) ---\n${r.topNPlan}\n\n`;
  }

  fs.writeFileSync("/Users/praveenkumar/ws-perf-v2/docs/evidence/raw/ranking-scale-explain.txt", report);
  console.log("\nSaved scale plans to docs/evidence/raw/ranking-scale-explain.txt");
}

benchmarkScale()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
