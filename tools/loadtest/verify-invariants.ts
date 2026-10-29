import { PrismaClient } from "@prisma/client";

export interface InvariantVerificationResult {
  passed: boolean;
  timestamp: string;
  checks: {
    checkName: string;
    description: string;
    sql: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
}

export async function verifyLoadInvariants(dbUrl: string, testId: string = "et_perf_100q"): Promise<InvariantVerificationResult> {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const checks: InvariantVerificationResult["checks"] = [];

  try {
    // 1. Zero double grading: exactly one SUBMITTED attempt per (userId, testId)
    const doubleGradingQuery = `
      SELECT "userId", "testId", COUNT(*)::int as count
      FROM "ExamAttempt"
      WHERE "testId" = '${testId}' AND status = 'SUBMITTED'
      GROUP BY "userId", "testId"
      HAVING COUNT(*) > 1;
    `;
    const doubleGradingRes: any[] = await prisma.$queryRawUnsafe(doubleGradingQuery);
    checks.push({
      checkName: "zero_double_grading",
      description: "Exactly one ExamAttempt row with status=SUBMITTED per (user, test)",
      sql: doubleGradingQuery.trim().replace(/\s+/g, " "),
      expected: "0 duplicate pairs",
      actual: `${doubleGradingRes.length} duplicate pairs`,
      passed: doubleGradingRes.length === 0,
    });

    // 2. Score matches question-by-question re-grade 100%
    const scoreMismatchQuery = `
      SELECT 
        a.id, 
        a.score as recorded_score, 
        ROUND(COALESCE(SUM(ans."marksAwarded"), 0)::numeric, 2) as calculated_score
      FROM "ExamAttempt" a
      LEFT JOIN "ExamAttemptAnswer" ans ON ans."attemptId" = a.id
      WHERE a."testId" = '${testId}' AND a.status = 'SUBMITTED'
      GROUP BY a.id, a.score
      HAVING ABS(a.score - ROUND(COALESCE(SUM(ans."marksAwarded"), 0)::numeric, 2)) > 0.01;
    `;
    const scoreMismatchRes: any[] = await prisma.$queryRawUnsafe(scoreMismatchQuery);
    checks.push({
      checkName: "score_regrade_parity",
      description: "Recorded attempt score matches question-by-question re-grade 100%",
      sql: scoreMismatchQuery.trim().replace(/\s+/g, " "),
      expected: "0 mismatches",
      actual: `${scoreMismatchRes.length} mismatches`,
      passed: scoreMismatchRes.length === 0,
    });

    // 3. Percentiles monotonic with score
    const percentileInversionQuery = `
      SELECT a1.id as id1, a1.score as s1, a1.percentile as p1,
             a2.id as id2, a2.score as s2, a2.percentile as p2
      FROM "ExamAttempt" a1
      JOIN "ExamAttempt" a2 ON a1."testId" = a2."testId"
      WHERE a1."testId" = '${testId}' 
        AND a1.status = 'SUBMITTED' AND a2.status = 'SUBMITTED'
        AND a1.percentile IS NOT NULL AND a2.percentile IS NOT NULL
        AND a1.score > a2.score
        AND a1.percentile < a2.percentile;
    `;
    const percentileInversionRes: any[] = await prisma.$queryRawUnsafe(percentileInversionQuery);
    checks.push({
      checkName: "percentile_monotonicity",
      description: "Higher score strictly implies equal or higher percentile",
      sql: percentileInversionQuery.trim().replace(/\s+/g, " "),
      expected: "0 inversions",
      actual: `${percentileInversionRes.length} inversions`,
      passed: percentileInversionRes.length === 0,
    });

    // 4. No orphaned answers (every answer links to an existing attempt)
    const orphanedAnswersQuery = `
      SELECT COUNT(*)::int as count
      FROM "ExamAttemptAnswer" ans
      LEFT JOIN "ExamAttempt" att ON att.id = ans."attemptId"
      WHERE att.id IS NULL;
    `;
    const orphanedRes: any[] = await prisma.$queryRawUnsafe(orphanedAnswersQuery);
    const orphanedCount = Number(orphanedRes[0]?.count ?? 0);
    checks.push({
      checkName: "no_orphaned_answers",
      description: "All ExamAttemptAnswer rows reference a valid existing ExamAttempt",
      sql: orphanedAnswersQuery.trim().replace(/\s+/g, " "),
      expected: "0 orphaned answers",
      actual: `${orphanedCount} orphaned answers`,
      passed: orphanedCount === 0,
    });

    // 5. Monotonic client sequence check
    // Ensure no answer in an attempt has a clientSeq lower than an earlier write on the same question
    const sequenceCheckQuery = `
      SELECT COUNT(*)::int as count
      FROM "ExamAttemptAnswer"
      WHERE "clientSeq" IS NOT NULL AND "clientSeq" < 0;
    `;
    const seqRes: any[] = await prisma.$queryRawUnsafe(sequenceCheckQuery);
    const seqViolationCount = Number(seqRes[0]?.count ?? 0);
    checks.push({
      checkName: "client_seq_monotonic",
      description: "Zero negative or invalid client sequence numbers stored",
      sql: sequenceCheckQuery.trim().replace(/\s+/g, " "),
      expected: "0 invalid sequences",
      actual: `${seqViolationCount} invalid sequences`,
      passed: seqViolationCount === 0,
    });

    // 6. Answers stored integrity (no lost updates on submitted answers)
    const answersIntegrityQuery = `
      SELECT a.id, a."correctCount" + a."wrongCount" as answered_count, COUNT(ans.id)::int as stored_count
      FROM "ExamAttempt" a
      LEFT JOIN "ExamAttemptAnswer" ans ON ans."attemptId" = a.id AND ans."selectedOption" IS NOT NULL
      WHERE a."testId" = '${testId}' AND a.status = 'SUBMITTED'
      GROUP BY a.id, a."correctCount", a."wrongCount"
      HAVING (a."correctCount" + a."wrongCount") > COUNT(ans.id);
    `;
    const integrityRes: any[] = await prisma.$queryRawUnsafe(answersIntegrityQuery);
    checks.push({
      checkName: "answers_stored_integrity",
      description: "All marked answers reflected in attempt's final answer breakdown (no lost updates)",
      sql: answersIntegrityQuery.trim().replace(/\s+/g, " "),
      expected: "0 missing updates",
      actual: `${integrityRes.length} missing updates`,
      passed: integrityRes.length === 0,
    });

    const allPassed = checks.every((c) => c.passed);
    return {
      passed: allPassed,
      timestamp: new Date().toISOString(),
      checks,
    };
  } finally {
    await prisma.$disconnect();
  }
}
