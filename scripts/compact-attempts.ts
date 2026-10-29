#!/usr/bin/env node
/**
 * scripts/compact-attempts.ts
 *
 * Compresses submitted ExamAttemptAnswer rows into ExamAttemptArchive records.
 * Supports:
 *   --dry-run               Preview eligible attempts/answers and estimated space savings without writing
 *   --batch-size <n>        Batch size for compaction (default: 500)
 *   --days-old <n>          Only compact attempts submitted > N days ago (default: 30)
 *   --exam-id <id>          Compact attempts for a specific exam test ID (ignores days-old default unless specified)
 *   --purge                 Delete raw ExamAttemptAnswer rows after successful archiving
 *   --limit <n>             Maximum number of attempts to compact in this run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CompactionStats {
  scannedAttempts: number;
  compactedAttempts: number;
  totalAnswersArchived: number;
  purgedAnswers: number;
  estimatedBytesFreed: number;
  durationMs: number;
}

// Average measured footprint per ExamAttemptAnswer row (table + 3 indexes) is ~180 bytes
const ESTIMATED_BYTES_PER_ANSWER = 180;

export async function runCompaction(options: {
  dryRun?: boolean;
  batchSize?: number;
  daysOld?: number;
  examId?: string;
  purge?: boolean;
  limit?: number;
}): Promise<CompactionStats> {
  const startTime = Date.now();
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? 500;
  const daysOld = options.daysOld !== undefined ? options.daysOld : (options.examId ? 0 : 30);
  const examId = options.examId;
  const purge = options.purge ?? false;
  const limit = options.limit;

  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  console.log(`[COMPACTION] Configuration:`);
  console.log(`  - Dry Run: ${dryRun}`);
  console.log(`  - Batch Size: ${batchSize}`);
  console.log(`  - Days Old: >= ${daysOld} (cutoff: ${cutoff.toISOString()})`);
  console.log(`  - Exam Filter: ${examId ? examId : "All"}`);
  console.log(`  - Purge Raw Answers: ${purge}`);
  console.log(`  - Limit: ${limit ?? "Unlimited"}`);

  // Base filter for eligible attempts
  const whereFilter: any = {
    status: "SUBMITTED",
    submittedAt: { not: null, lte: cutoff },
    archive: null, // Only unarchived attempts
  };

  if (examId) {
    whereFilter.testId = examId;
  }

  // Count total eligible attempts
  const eligibleCount = await prisma.examAttempt.count({ where: whereFilter });
  console.log(`[COMPACTION] Found ${eligibleCount} eligible unarchived attempt(s).`);

  if (eligibleCount === 0) {
    return {
      scannedAttempts: 0,
      compactedAttempts: 0,
      totalAnswersArchived: 0,
      purgedAnswers: 0,
      estimatedBytesFreed: 0,
      durationMs: Date.now() - startTime,
    };
  }

  const maxToProcess = limit ? Math.min(limit, eligibleCount) : eligibleCount;
  let processed = 0;
  let totalAnswersArchived = 0;
  let purgedAnswers = 0;

  while (processed < maxToProcess) {
    const currentBatchSize = Math.min(batchSize, maxToProcess - processed);
    const batch = await prisma.examAttempt.findMany({
      where: whereFilter,
      take: currentBatchSize,
      orderBy: { submittedAt: "asc" },
      select: {
        id: true,
        testId: true,
        userId: true,
        score: true,
        correctCount: true,
        wrongCount: true,
        submittedAt: true,
      },
    });

    if (batch.length === 0) break;

    for (const attempt of batch) {
      // Fetch answers for this attempt
      const answers = await prisma.examAttemptAnswer.findMany({
        where: { attemptId: attempt.id },
        select: {
          questionId: true,
          selectedOption: true,
          isMarked: true,
          isCorrect: true,
          marksAwarded: true,
          timeSpentSecs: true,
          clientSeq: true,
        },
        orderBy: { questionId: "asc" },
      });

      totalAnswersArchived += answers.length;

      if (!dryRun) {
        const totalEvaluated = attempt.correctCount + attempt.wrongCount;
        const accuracy = totalEvaluated > 0 ? (attempt.correctCount / totalEvaluated) * 100 : null;

        await prisma.$transaction(async (tx) => {
          await tx.examAttemptArchive.upsert({
            where: { attemptId: attempt.id },
            create: {
              attemptId: attempt.id,
              testId: attempt.testId,
              userId: attempt.userId,
              answersBlob: answers,
              score: attempt.score,
              accuracy,
              submittedAt: attempt.submittedAt || new Date(),
              metadata: {
                originalAnswerCount: answers.length,
                compactedAt: new Date().toISOString(),
              },
            },
            update: {
              answersBlob: answers,
              score: attempt.score,
              accuracy,
              submittedAt: attempt.submittedAt || new Date(),
            },
          });

          if (purge) {
            const delRes = await tx.examAttemptAnswer.deleteMany({
              where: { attemptId: attempt.id },
            });
            purgedAnswers += delRes.count;
          }
        });
      }

      processed++;
      if (processed % 1000 === 0 || processed === maxToProcess) {
        console.log(`[COMPACTION] Processed ${processed}/${maxToProcess} attempts (${totalAnswersArchived} answers).`);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const estimatedBytesFreed = (purge ? purgedAnswers : totalAnswersArchived) * ESTIMATED_BYTES_PER_ANSWER;

  const stats: CompactionStats = {
    scannedAttempts: eligibleCount,
    compactedAttempts: processed,
    totalAnswersArchived,
    purgedAnswers,
    estimatedBytesFreed,
    durationMs,
  };

  console.log(`\n[COMPACTION SUMMARY]`);
  console.log(`  - Mode: ${dryRun ? "DRY-RUN (No changes applied)" : "LIVE"}`);
  console.log(`  - Compacted Attempts: ${stats.compactedAttempts}`);
  console.log(`  - Answers Compacted: ${stats.totalAnswersArchived}`);
  if (purge) {
    console.log(`  - Raw Answers Purged: ${stats.purgedAnswers}`);
  }
  console.log(`  - Estimated Space Freed: ${(stats.estimatedBytesFreed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  - Total Elapsed: ${(durationMs / 1000).toFixed(2)} s\n`);

  return stats;
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const purge = args.includes("--purge");

  function getArgVal(name: string): string | undefined {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  }

  const batchSize = getArgVal("--batch-size") ? parseInt(getArgVal("--batch-size")!, 10) : 500;
  const daysOld = getArgVal("--days-old") ? parseInt(getArgVal("--days-old")!, 10) : undefined;
  const examId = getArgVal("--exam-id");
  const limit = getArgVal("--limit") ? parseInt(getArgVal("--limit")!, 10) : undefined;

  runCompaction({
    dryRun,
    batchSize,
    daysOld,
    examId,
    purge,
    limit,
  })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[COMPACTION ERROR]", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
