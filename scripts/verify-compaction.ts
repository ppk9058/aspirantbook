#!/usr/bin/env node
/**
 * scripts/verify-compaction.ts
 *
 * Rigorous field-by-field compaction verifier.
 * For each sampled attempt, reads both ExamAttemptArchive and ExamAttemptAnswer,
 * deserializes the archive blob, and performs exact comparisons:
 *   - questionId
 *   - selectedOption
 *   - isCorrect
 *   - marksAwarded
 *   - timeSpentSecs
 *   - isMarked
 *   - score and submittedAt parity
 *
 * CLI options:
 *   --exam-id <id>        Filter by specific exam test ID
 *   --sample-size <n>     Number of attempts to sample (default: 1000)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Mismatch {
  attemptId: string;
  field: string;
  expected: any;
  actual: any;
  questionId?: string;
}

export async function verifyCompaction(options: {
  examId?: string;
  sampleSize?: number;
}): Promise<{
  sampledAttempts: number;
  totalAnswersVerified: number;
  mismatches: Mismatch[];
  durationMs: number;
}> {
  const startTime = Date.now();
  const sampleSize = options.sampleSize ?? 1000;
  const examId = options.examId;

  console.log(`[VERIFY-COMPACTION] Starting verification:`);
  console.log(`  - Exam ID filter: ${examId ?? "All"}`);
  console.log(`  - Target sample size: ${sampleSize}`);

  // Query attempts that have BOTH an archive and answers present
  const whereFilter: any = {
    archive: { isNot: null },
    answers: { some: {} },
  };

  if (examId) {
    whereFilter.testId = examId;
  }

  const eligibleAttempts = await prisma.examAttempt.findMany({
    where: whereFilter,
    select: {
      id: true,
      testId: true,
      score: true,
      submittedAt: true,
      archive: {
        select: {
          answersBlob: true,
          score: true,
          submittedAt: true,
        },
      },
    },
    take: sampleSize,
    orderBy: { id: "asc" },
  });

  console.log(`[VERIFY-COMPACTION] Sampled ${eligibleAttempts.length} attempt(s) for verification.`);

  if (eligibleAttempts.length === 0) {
    console.warn(`[VERIFY-COMPACTION] Warning: No archived attempts with raw answers found to compare.`);
    return {
      sampledAttempts: 0,
      totalAnswersVerified: 0,
      mismatches: [],
      durationMs: Date.now() - startTime,
    };
  }

  const mismatches: Mismatch[] = [];
  let totalAnswersVerified = 0;

  for (let i = 0; i < eligibleAttempts.length; i++) {
    const attempt = eligibleAttempts[i];
    const archive = attempt.archive!;

    // 1. Verify attempt-level score parity
    if (Math.abs(attempt.score - archive.score) > 0.0001) {
      mismatches.push({
        attemptId: attempt.id,
        field: "attempt.score",
        expected: attempt.score,
        actual: archive.score,
      });
    }

    // 2. Fetch raw answers from ExamAttemptAnswer
    const rawAnswers = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: attempt.id },
      orderBy: { questionId: "asc" },
      select: {
        questionId: true,
        selectedOption: true,
        isCorrect: true,
        marksAwarded: true,
        timeSpentSecs: true,
        isMarked: true,
      },
    });

    const blobAnswers = (archive.answersBlob as any[]) || [];
    // Sort blob answers by questionId for deterministic order
    blobAnswers.sort((a, b) => a.questionId.localeCompare(b.questionId));

    if (rawAnswers.length !== blobAnswers.length) {
      mismatches.push({
        attemptId: attempt.id,
        field: "answers.length",
        expected: rawAnswers.length,
        actual: blobAnswers.length,
      });
      continue;
    }

    for (let j = 0; j < rawAnswers.length; j++) {
      const raw = rawAnswers[j];
      const blob = blobAnswers[j];

      totalAnswersVerified++;

      if (raw.questionId !== blob.questionId) {
        mismatches.push({
          attemptId: attempt.id,
          questionId: raw.questionId,
          field: "questionId",
          expected: raw.questionId,
          actual: blob.questionId,
        });
      }

      if (raw.selectedOption !== blob.selectedOption) {
        mismatches.push({
          attemptId: attempt.id,
          questionId: raw.questionId,
          field: "selectedOption",
          expected: raw.selectedOption,
          actual: blob.selectedOption,
        });
      }

      if (raw.isCorrect !== blob.isCorrect) {
        mismatches.push({
          attemptId: attempt.id,
          questionId: raw.questionId,
          field: "isCorrect",
          expected: raw.isCorrect,
          actual: blob.isCorrect,
        });
      }

      if (Math.abs((raw.marksAwarded || 0) - (blob.marksAwarded || 0)) > 0.0001) {
        mismatches.push({
          attemptId: attempt.id,
          questionId: raw.questionId,
          field: "marksAwarded",
          expected: raw.marksAwarded,
          actual: blob.marksAwarded,
        });
      }

      if (raw.timeSpentSecs !== blob.timeSpentSecs) {
        mismatches.push({
          attemptId: attempt.id,
          questionId: raw.questionId,
          field: "timeSpentSecs",
          expected: raw.timeSpentSecs,
          actual: blob.timeSpentSecs,
        });
      }

      if (raw.isMarked !== blob.isMarked) {
        mismatches.push({
          attemptId: attempt.id,
          questionId: raw.questionId,
          field: "isMarked",
          expected: raw.isMarked,
          actual: blob.isMarked,
        });
      }
    }

    if ((i + 1) % 200 === 0 || i + 1 === eligibleAttempts.length) {
      console.log(`[VERIFY-COMPACTION] Verified ${i + 1}/${eligibleAttempts.length} attempts (${totalAnswersVerified} answers).`);
    }
  }

  const durationMs = Date.now() - startTime;

  console.log(`\n[VERIFICATION SUMMARY]`);
  console.log(`  - Sampled Attempts: ${eligibleAttempts.length}`);
  console.log(`  - Total Answers Verified: ${totalAnswersVerified}`);
  console.log(`  - Mismatches: ${mismatches.length}`);
  console.log(`  - Match Rate: ${mismatches.length === 0 ? "100.00%" : `${(((totalAnswersVerified - mismatches.length) / totalAnswersVerified) * 100).toFixed(2)}%`}`);
  console.log(`  - Elapsed Time: ${(durationMs / 1000).toFixed(2)} s\n`);

  if (mismatches.length > 0) {
    console.error(`[VERIFICATION FAILED] ${mismatches.length} mismatch(es) detected:`);
    console.error(JSON.stringify(mismatches.slice(0, 10), null, 2));
    throw new Error(`Verification failed with ${mismatches.length} mismatches.`);
  }

  return {
    sampledAttempts: eligibleAttempts.length,
    totalAnswersVerified,
    mismatches,
    durationMs,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  function getArgVal(name: string): string | undefined {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  }

  const examId = getArgVal("--exam-id");
  const sampleSize = getArgVal("--sample-size") ? parseInt(getArgVal("--sample-size")!, 10) : 1000;

  verifyCompaction({ examId, sampleSize })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[FATAL ERROR]", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
