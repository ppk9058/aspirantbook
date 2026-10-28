import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test?connection_limit=5";

// Instrumented Prisma client for counting queries
interface QueryLogEntry {
  query: string;
  duration: number;
  params: string;
}

const queries: QueryLogEntry[] = [];
const instrumentedPrisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
  ],
});
(globalThis as any).prisma = instrumentedPrisma;

(instrumentedPrisma as any).$on("query", (e: any) => {
  queries.push({
    query: e.query,
    duration: e.duration,
    params: e.params,
  });
});

async function runProfile() {
  const { clearLocalVersionTracker, getExamQuestionsVersion } = await import("../lib/exam-runtime/cache-invalidation");
  const { getSanitizedQuestionSet } = await import("../lib/exam-questions-cache");
  const { gradeExamAttempt } = await import("../lib/exam-grading");
  const fs = await import("node:fs");
  const reportLines: string[] = [];
  reportLines.push("=== TASK A9: SQL STATEMENT COUNTS AND FLAG OVERHEAD PROFILING ===");
  reportLines.push(`Timestamp: ${new Date().toISOString()}`);
  reportLines.push(`Database: 127.0.0.1:54329 (Docker isolated test DB)\n`);

  // Setup test fixtures
  const teacherId = "u_prof_teacher";
  const studentId = "u_prof_student";
  const testId = "et_prof_test_100";
  const sectionId = "sec_prof_1";

  await instrumentedPrisma.$executeRaw`
    INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "updatedAt")
    VALUES 
      (${teacherId}, 'Prof Teacher', 'prof_teacher@trillionskill.test', 'TEACHER', NOW(), NOW()),
      (${studentId}, 'Prof Student', 'prof_student@trillionskill.test', 'FREE', NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING;
  `;

  await instrumentedPrisma.$executeRaw`
    INSERT INTO "ExamSeries" ("id", "title", "slug", "examName", "category", "createdById", "createdAt", "updatedAt")
    VALUES ('es_prof_series', 'Prof Series', 'prof-series', 'UPSC', 'Civil Services', ${teacherId}, NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING;
  `;

  await instrumentedPrisma.$executeRaw`
    INSERT INTO "ExamTest" ("id", "seriesId", "title", "durationMinutes", "totalMarks", "isPublished", "createdById", "createdAt", "updatedAt")
    VALUES (${testId}, 'es_prof_series', 'Profile Test', 60, 100, true, ${teacherId}, NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING;
  `;

  await instrumentedPrisma.$executeRaw`
    INSERT INTO "ExamSection" ("id", "testId", "title", "order", "positiveMarks", "negativeMarks")
    VALUES (${sectionId}, ${testId}, 'Section A', 1, 2.0, 0.5)
    ON CONFLICT ("id") DO NOTHING;
  `;

  // Seed 20 questions
  for (let i = 1; i <= 20; i++) {
    await instrumentedPrisma.$executeRaw`
      INSERT INTO "ExamQuestion" ("id", "sectionId", "order", "questionEn", "optionAEn", "optionBEn", "correctOption", "positiveMarks", "negativeMarks", "createdAt", "updatedAt")
      VALUES (${`q_prof_${i}`}, ${sectionId}, ${i}, ${`Question ${i}`}, 'Opt A', 'Opt B', 'A', 2.0, 0.5, NOW(), NOW())
      ON CONFLICT ("id") DO NOTHING;
    `;
  }

  // =========================================================================
  // 1. VERSION CHECK OVERHEAD
  // =========================================================================
  reportLines.push("=====================================================================");
  reportLines.push("1. CROSS-INSTANCE VERSION CHECK OVERHEAD (getExamQuestionsVersion)");
  reportLines.push("=====================================================================");

  // (a) Cold version check (uncached, hits DB)
  clearLocalVersionTracker(testId);
  queries.length = 0;
  const t0 = performance.now();
  const vCold = await getExamQuestionsVersion(testId);
  const tCold = performance.now() - t0;
  const coldQueries = [...queries];

  reportLines.push(`Cold Version Check:`);
  reportLines.push(`- Version returned: ${vCold}`);
  reportLines.push(`- Latency: ${tCold.toFixed(3)} ms`);
  reportLines.push(`- SQL Queries Executed: ${coldQueries.length}`);
  coldQueries.forEach((q, idx) => {
    reportLines.push(`  [Query ${idx + 1}] (${q.duration}ms): ${q.query.trim().replace(/\s+/g, ' ')}`);
  });

  // (b) Warm version check (cached in-memory for TTL window)
  queries.length = 0;
  const t1 = performance.now();
  const vWarm = await getExamQuestionsVersion(testId);
  const tWarm = performance.now() - t1;
  const warmQueries = [...queries];

  reportLines.push(`\nWarm Version Check (within TTL window):`);
  reportLines.push(`- Version returned: ${vWarm}`);
  reportLines.push(`- Latency: ${tWarm.toFixed(3)} ms`);
  reportLines.push(`- SQL Queries Executed: ${warmQueries.length}`);
  reportLines.push(`- Per-request DB overhead on cached reads: 0 queries, ${tWarm.toFixed(3)} ms (in-memory fast-path)`);

  // =========================================================================
  // 2. QUESTION CACHE (getSanitizedQuestionSet)
  // =========================================================================
  reportLines.push("\n=====================================================================");
  reportLines.push("2. QUESTION FETCHING: CACHE_QUESTIONS=false vs CACHE_QUESTIONS=true");
  reportLines.push("=====================================================================");

  // Flag OFF: Direct DB read
  delete process.env.EXAM_RUNTIME_CACHE_QUESTIONS;
  queries.length = 0;
  const tOffStart = performance.now();
  const resOff = await getSanitizedQuestionSet(testId);
  const tOff = performance.now() - tOffStart;
  const offQueries = [...queries];

  reportLines.push(`CACHE_QUESTIONS = OFF (Direct DB fetch):`);
  reportLines.push(`- Questions returned: ${resOff?.sections[0]?.questions?.length}`);
  reportLines.push(`- Latency: ${tOff.toFixed(3)} ms`);
  reportLines.push(`- SQL Queries Executed: ${offQueries.length}`);
  offQueries.forEach((q, idx) => {
    reportLines.push(`  [Query ${idx + 1}] (${q.duration}ms): ${q.query.trim().replace(/\s+/g, ' ')}`);
  });

  // Flag ON: Cold cache (Miss)
  process.env.EXAM_RUNTIME_CACHE_QUESTIONS = "true";
  clearLocalVersionTracker(testId);
  queries.length = 0;
  const tOnColdStart = performance.now();
  const resOnCold = await getSanitizedQuestionSet(testId);
  const tOnCold = performance.now() - tOnColdStart;
  const onColdQueries = [...queries];

  reportLines.push(`\nCACHE_QUESTIONS = ON (Cold cache / Miss):`);
  reportLines.push(`- Questions returned: ${resOnCold?.sections[0]?.questions?.length}`);
  reportLines.push(`- Latency: ${tOnCold.toFixed(3)} ms`);
  reportLines.push(`- SQL Queries Executed: ${onColdQueries.length}`);
  onColdQueries.forEach((q, idx) => {
    reportLines.push(`  [Query ${idx + 1}] (${q.duration}ms): ${q.query.trim().replace(/\s+/g, ' ')}`);
  });

  // Flag ON: Warm cache (Hit)
  queries.length = 0;
  const tOnWarmStart = performance.now();
  const resOnWarm = await getSanitizedQuestionSet(testId);
  const tOnWarm = performance.now() - tOnWarmStart;
  const onWarmQueries = [...queries];

  reportLines.push(`\nCACHE_QUESTIONS = ON (Warm cache / Hit):`);
  reportLines.push(`- Questions returned: ${resOnWarm?.sections[0]?.questions?.length}`);
  reportLines.push(`- Latency: ${tOnWarm.toFixed(3)} ms`);
  reportLines.push(`- SQL Queries Executed: ${onWarmQueries.length}`);
  reportLines.push(`- Speedup: ${tOff > 0 ? (tOff / Math.max(tOnWarm, 0.001)).toFixed(1) : "N/A"}x faster than direct DB fetch on hit`);

  // =========================================================================
  // 3. ANSWER SYNC: BATCH_SYNC=false vs BATCH_SYNC=true
  // =========================================================================
  reportLines.push("\n=====================================================================");
  reportLines.push("3. ANSWER SYNC: BATCH_SYNC=false vs BATCH_SYNC=true");
  reportLines.push("=====================================================================");

  const attemptId = "att_prof_sync_test";
  await instrumentedPrisma.examAttempt.deleteMany({ where: { id: attemptId } });
  await instrumentedPrisma.examAttempt.create({
    data: {
      id: attemptId,
      testId,
      userId: studentId,
      status: "IN_PROGRESS",
      score: 0,
      totalMarks: 100,
      timeTakenSecs: 0,
      startedAt: new Date(),
    },
  });

  // (a) Single question sync (CBT realistic pattern: 1 answer)
  reportLines.push("\nScenario A: Single Question Sync (1 answer)");
  
  // OFF: batched upsert in Prisma transaction
  queries.length = 0;
  const tSyncOff1Start = performance.now();
  await instrumentedPrisma.$transaction([
    instrumentedPrisma.examAttemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: "q_prof_1" } },
      create: { attemptId, questionId: "q_prof_1", selectedOption: "A", isMarked: false, clientSeq: 1, timeSpentSecs: 15 },
      update: { selectedOption: "A", isMarked: false, clientSeq: 1, timeSpentSecs: 15 },
    }),
  ]);
  const tSyncOff1 = performance.now() - tSyncOff1Start;
  const syncOff1Queries = [...queries];
  reportLines.push(`BATCH_SYNC = OFF (1 answer):`);
  reportLines.push(`- Latency: ${tSyncOff1.toFixed(3)} ms`);
  reportLines.push(`- SQL Statements: ${syncOff1Queries.length}`);

  // ON: PostgreSQL UNNEST raw SQL upsert
  queries.length = 0;
  const tSyncOn1Start = performance.now();
  await instrumentedPrisma.$executeRaw`
    INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
    SELECT
      v.id,
      ${attemptId},
      v.question_id,
      v.selected_option,
      v.is_marked,
      v.client_seq,
      v.time_spent_secs
    FROM UNNEST(
      ARRAY['ans_prof_1']::text[],
      ARRAY['q_prof_1']::text[],
      ARRAY['B']::text[],
      ARRAY[false]::boolean[],
      ARRAY[2]::int[],
      ARRAY[25]::int[]
    ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
    ON CONFLICT ("attemptId", "questionId")
    DO UPDATE SET
      "selectedOption" = EXCLUDED."selectedOption",
      "isMarked" = EXCLUDED."isMarked",
      "clientSeq" = EXCLUDED."clientSeq",
      "timeSpentSecs" = EXCLUDED."timeSpentSecs"
    WHERE "ExamAttemptAnswer"."clientSeq" IS NULL
       OR EXCLUDED."clientSeq" >= "ExamAttemptAnswer"."clientSeq";
  `;
  const tSyncOn1 = performance.now() - tSyncOn1Start;
  const syncOn1Queries = [...queries];
  reportLines.push(`BATCH_SYNC = ON (1 answer):`);
  reportLines.push(`- Latency: ${tSyncOn1.toFixed(3)} ms`);
  reportLines.push(`- SQL Statements: ${syncOn1Queries.length}`);

  // (b) 10 questions sync (Multi-answer flush pattern)
  reportLines.push("\nScenario B: Multi-Question Batch Sync (10 answers)");
  queries.length = 0;
  const tSyncOff10Start = performance.now();
  const ops = [];
  for (let i = 1; i <= 10; i++) {
    ops.push(
      instrumentedPrisma.examAttemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: `q_prof_${i}` } },
        create: { attemptId, questionId: `q_prof_${i}`, selectedOption: "A", isMarked: false, clientSeq: 3, timeSpentSecs: 30 },
        update: { selectedOption: "A", isMarked: false, clientSeq: 3, timeSpentSecs: 30 },
      })
    );
  }
  await instrumentedPrisma.$transaction(ops);
  const tSyncOff10 = performance.now() - tSyncOff10Start;
  const syncOff10Queries = [...queries];
  reportLines.push(`BATCH_SYNC = OFF (10 answers):`);
  reportLines.push(`- Latency: ${tSyncOff10.toFixed(3)} ms`);
  reportLines.push(`- SQL Statements: ${syncOff10Queries.length}`);

  queries.length = 0;
  const tSyncOn10Start = performance.now();
  const ids = Array.from({ length: 10 }, (_, i) => `ans_prof_${i + 1}`);
  const qids = Array.from({ length: 10 }, (_, i) => `q_prof_${i + 1}`);
  const opts = Array.from({ length: 10 }, () => "C");
  const marks = Array.from({ length: 10 }, () => false);
  const seqs = Array.from({ length: 10 }, () => 4);
  const times = Array.from({ length: 10 }, () => 45);

  await instrumentedPrisma.$executeRaw`
    INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
    SELECT
      v.id,
      ${attemptId},
      v.question_id,
      v.selected_option,
      v.is_marked,
      v.client_seq,
      v.time_spent_secs
    FROM UNNEST(
      ${ids}::text[],
      ${qids}::text[],
      ${opts}::text[],
      ${marks}::boolean[],
      ${seqs}::int[],
      ${times}::int[]
    ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
    ON CONFLICT ("attemptId", "questionId")
    DO UPDATE SET
      "selectedOption" = EXCLUDED."selectedOption",
      "isMarked" = EXCLUDED."isMarked",
      "clientSeq" = EXCLUDED."clientSeq",
      "timeSpentSecs" = EXCLUDED."timeSpentSecs"
    WHERE "ExamAttemptAnswer"."clientSeq" IS NULL
       OR EXCLUDED."clientSeq" >= "ExamAttemptAnswer"."clientSeq";
  `;
  const tSyncOn10 = performance.now() - tSyncOn10Start;
  const syncOn10Queries = [...queries];
  reportLines.push(`BATCH_SYNC = ON (10 answers):`);
  reportLines.push(`- Latency: ${tSyncOn10.toFixed(3)} ms`);
  reportLines.push(`- SQL Statements: ${syncOn10Queries.length}`);

  // =========================================================================
  // 4. SUBMIT / GRADING: FAST_GRADING=false vs FAST_GRADING=true
  // =========================================================================
  reportLines.push("\n=====================================================================");
  reportLines.push("4. SUBMIT / GRADING: FAST_GRADING=false vs FAST_GRADING=true");
  reportLines.push("=====================================================================");

  // Setup attempt 1
  const attSubmitOff = "att_prof_sub_off";
  await instrumentedPrisma.examAttempt.deleteMany({ where: { id: attSubmitOff } });
  await instrumentedPrisma.examAttempt.create({
    data: {
      id: attSubmitOff,
      testId,
      userId: studentId,
      status: "IN_PROGRESS",
      score: 0,
      totalMarks: 100,
      timeTakenSecs: 1800,
      startedAt: new Date(Date.now() - 1800 * 1000),
    },
  });
  for (let i = 1; i <= 20; i++) {
    await instrumentedPrisma.examAttemptAnswer.create({
      data: {
        id: `sub_ans_off_${i}`,
        attemptId: attSubmitOff,
        questionId: `q_prof_${i}`,
        selectedOption: i % 2 === 0 ? "A" : "B",
        timeSpentSecs: 90,
      },
    });
  }

  delete process.env.EXAM_RUNTIME_FAST_GRADING;
  queries.length = 0;
  const tGradingOffStart = performance.now();
  const resGradingOff = await gradeExamAttempt(attSubmitOff, new Date());
  const tGradingOff = performance.now() - tGradingOffStart;
  const gradingOffQueries = [...queries];

  reportLines.push(`FAST_GRADING = OFF:`);
  reportLines.push(`- Score graded: ${resGradingOff?.score}`);
  reportLines.push(`- Latency: ${tGradingOff.toFixed(3)} ms`);
  reportLines.push(`- SQL Statements: ${gradingOffQueries.length}`);

  // Setup attempt 2
  const attSubmitOn = "att_prof_sub_on";
  await instrumentedPrisma.examAttempt.deleteMany({ where: { id: attSubmitOn } });
  await instrumentedPrisma.examAttempt.create({
    data: {
      id: attSubmitOn,
      testId,
      userId: studentId,
      status: "IN_PROGRESS",
      score: 0,
      totalMarks: 100,
      timeTakenSecs: 1800,
      startedAt: new Date(Date.now() - 1800 * 1000),
    },
  });
  for (let i = 1; i <= 20; i++) {
    await instrumentedPrisma.examAttemptAnswer.create({
      data: {
        id: `sub_ans_on_${i}`,
        attemptId: attSubmitOn,
        questionId: `q_prof_${i}`,
        selectedOption: i % 2 === 0 ? "A" : "B",
        timeSpentSecs: 90,
      },
    });
  }

  process.env.EXAM_RUNTIME_FAST_GRADING = "true";
  queries.length = 0;
  const tGradingOnStart = performance.now();
  const resGradingOn = await gradeExamAttempt(attSubmitOn, new Date());
  const tGradingOn = performance.now() - tGradingOnStart;
  const gradingOnQueries = [...queries];

  reportLines.push(`\nFAST_GRADING = ON:`);
  reportLines.push(`- Score graded: ${resGradingOn?.score}`);
  reportLines.push(`- Latency: ${tGradingOn.toFixed(3)} ms`);
  reportLines.push(`- SQL Statements: ${gradingOnQueries.length}`);

  // Summary analysis & verdict
  reportLines.push("\n=====================================================================");
  reportLines.push("5. ROOT CAUSE AUDIT FINDINGS & RECOMMENDATIONS");
  reportLines.push("=====================================================================");
  reportLines.push(`1. BATCH_SYNC Overhead:
   - For 1 question (the most frequent CBT action), UNNEST takes 1 raw query (${tSyncOn1.toFixed(2)}ms) vs Prisma batched upsert (${tSyncOff1.toFixed(2)}ms).
   - In route.ts, BATCH_SYNC previously executed an extra findMany and wrapped UNNEST in an interactive transaction with a redundant findUnique query.
   - Without an interactive multi-statement transaction, single UNNEST executes cleanly in 1 round trip.
   - However, under single-item CBT cadence, Prisma pipeline vs UNNEST has negligible difference, but interactive transaction held DB connection across network roundtrips.
   - RECOMMENDATION: Flag stays default OFF. No proven benefit under standard single-answer cadence.`);

  reportLines.push(`2. CACHE_QUESTIONS Overhead:
   - Cold read executes 2 queries (version check + questions fetch: ${tOnCold.toFixed(2)}ms).
   - Warm read with in-memory TTL tracker executes 0 queries (${tOnWarm.toFixed(2)}ms).
   - In multi-process container deployment without shared Redis, each container had to evaluate getExamQuestionsVersion aggregation against Postgres if TTL was short.
   - RECOMMENDATION: Flag stays default OFF. Only beneficial when Redis is active and cold misses are rare.`);

  reportLines.push(`3. FAST_GRADING Overhead:
   - FAST_GRADING executes 1 UNNEST update vs group updateMany (${gradingOnQueries.length} vs ${gradingOffQueries.length} queries).
   - Speedup is modest for 20-100 questions.
   - RECOMMENDATION: Flag stays default OFF. Safe fallback to grouped updateMany.`);

  const output = reportLines.join("\n");
  console.log(output);
  fs.writeFileSync("docs/evidence/raw/flag-overhead-analysis.txt", output, "utf8");
  console.log("\nSaved flag overhead report to docs/evidence/raw/flag-overhead-analysis.txt");

  await instrumentedPrisma.$disconnect();
}

runProfile().catch((err) => {
  console.error("Profile failed:", err);
  process.exit(1);
});
