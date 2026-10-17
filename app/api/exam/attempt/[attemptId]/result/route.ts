import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";
import { getAttemptRanking } from "@/lib/exam-ranking";
import { getQuizSlug } from "@/lib/current-affairs/slugs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;
    if (!attemptId) {
      return NextResponse.json(
        { error: "attemptId is required" },
        { status: 400 }
      );
    }

    // Verify attempt ownership and get stats
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        testId: true,
        status: true,
        language: true,
        score: true,
        totalMarks: true,
        correctCount: true,
        wrongCount: true,
        skippedCount: true,
        markedCount: true,
        timeTakenSecs: true,
        tabSwitchCount: true,
        startedAt: true,
        submittedAt: true,
        test: {
          select: {
            id: true,
            title: true,
            titleHi: true,
            testType: true,
            seriesId: true,
            durationMinutes: true,
            totalMarks: true,
            totalQuestions: true,
            series: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.status !== "SUBMITTED") {
      const durationMinutes = attempt.test!.durationMinutes;
      const deadlineMs = attempt.startedAt.getTime() + durationMinutes * 60 * 1000;
      const graceDeadlineMs = deadlineMs + 30 * 1000;

      // If past deadline, auto-grade the attempt and proceed
      if (Date.now() > graceDeadlineMs) {
        const graded = await gradeExamAttempt(attemptId, new Date());
        if (!graded) {
          return NextResponse.json(
            { error: "Result is being calculated, please retry in a moment", retryable: true },
            { status: 202 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Attempt has not been submitted yet" },
          { status: 409 }
        );
      }
    } else if (attempt.submittedAt === null) {
      // Status is SUBMITTED but submittedAt is null (worker in-flight or crashed)
      const graded = await gradeExamAttempt(attemptId, new Date());
      if (!graded) {
        return NextResponse.json(
          { error: "Result is being calculated, please retry in a moment", retryable: true },
          { status: 202 }
        );
      }
    }

    // Fetch all test questions in section + question order
    const testQuestions = attempt.testId
      ? await prisma.examQuestion.findMany({
          where: {
            section: {
              testId: attempt.testId,
            },
          },
          orderBy: [
            { section: { order: "asc" } },
            { order: "asc" },
          ],
          select: {
            id: true,
            questionEn: true,
            questionHi: true,
            optionAEn: true,
            optionBEn: true,
            optionCEn: true,
            optionDEn: true,
            optionAHi: true,
            optionBHi: true,
            optionCHi: true,
            optionDHi: true,
            correctOption: true,
            explanationEn: true,
            explanationHi: true,
            subject: true,
            difficulty: true,
            positiveMarks: true,
            negativeMarks: true,
          },
        })
      : [];

    // Fetch all answers with question details
    const answers = await prisma.examAttemptAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            id: true,
            questionEn: true,
            questionHi: true,
            optionAEn: true,
            optionBEn: true,
            optionCEn: true,
            optionDEn: true,
            optionAHi: true,
            optionBHi: true,
            optionCHi: true,
            optionDHi: true,
            correctOption: true,
            explanationEn: true,
            explanationHi: true,
            subject: true,
            difficulty: true,
            positiveMarks: true,
            negativeMarks: true,
          },
        },
      },
    });

    const answerMap = new Map(answers.map((a) => [a.questionId, a]));

    // Per-question analysis (use testQuestions if available to guarantee all questions in order)
    const questionAnalysis =
      testQuestions.length > 0
        ? testQuestions.map((q) => {
            const ans = answerMap.get(q.id);
            const options = [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn].filter(
              (o): o is string => o !== null && o !== undefined
            );
            const optionsHi = [q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi].filter(
              (o): o is string => o !== null && o !== undefined
            );

            const optionKeys = ["A", "B", "C", "D"];
            const selectedIndex = ans?.selectedOption
              ? optionKeys.indexOf(ans.selectedOption)
              : -1;
            const correctIndex = optionKeys.indexOf(q.correctOption);

            const selectedOptionText =
              selectedIndex >= 0 && selectedIndex < options.length
                ? options[selectedIndex]
                : null;
            const correctOptionText =
              correctIndex >= 0 && correctIndex < options.length
                ? options[correctIndex]
                : null;

            return {
              questionId: q.id,
              questionEn: q.questionEn,
              questionHi: q.questionHi,
              options,
              optionsHi,
              selectedOption: ans?.selectedOption ?? null,
              selectedOptionText,
              correctOption: q.correctOption,
              correctOptionText,
              isCorrect: ans?.isCorrect ?? false,
              marksAwarded: ans?.marksAwarded ?? 0,
              timeSpentSecs: ans?.timeSpentSecs ?? 0,
              isMarked: ans?.isMarked ?? false,
              explanationEn: q.explanationEn,
              explanationHi: q.explanationHi,
              subject: q.subject,
              difficulty: q.difficulty,
            };
          })
        : answers.map((ans) => {
            const q = ans.question;
            const options = [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn].filter(
              (o): o is string => o !== null && o !== undefined
            );
            const optionsHi = [q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi].filter(
              (o): o is string => o !== null && o !== undefined
            );

            const optionKeys = ["A", "B", "C", "D"];
            const selectedIndex = ans.selectedOption
              ? optionKeys.indexOf(ans.selectedOption)
              : -1;
            const correctIndex = optionKeys.indexOf(q.correctOption);

            const selectedOptionText =
              selectedIndex >= 0 && selectedIndex < options.length
                ? options[selectedIndex]
                : null;
            const correctOptionText =
              correctIndex >= 0 && correctIndex < options.length
                ? options[correctIndex]
                : null;

            return {
              questionId: ans.questionId,
              questionEn: q.questionEn,
              questionHi: q.questionHi,
              options,
              optionsHi,
              selectedOption: ans.selectedOption,
              selectedOptionText,
              correctOption: q.correctOption,
              correctOptionText,
              isCorrect: ans.isCorrect,
              marksAwarded: ans.marksAwarded,
              timeSpentSecs: ans.timeSpentSecs,
              isMarked: ans.isMarked,
              explanationEn: q.explanationEn,
              explanationHi: q.explanationHi,
              subject: q.subject,
              difficulty: q.difficulty,
            };
          });

    // Time analysis
    const correctAnswers = answers.filter((a) => a.isCorrect);
    const wrongAnswers = answers.filter(
      (a) => !a.isCorrect && a.selectedOption !== null
    );
    const skippedAnswers = answers.filter((a) => a.selectedOption === null);

    const avg = (arr: typeof answers) =>
      arr.length > 0
        ? parseFloat(
            (
              arr.reduce((sum, a) => sum + (a.timeSpentSecs ?? 0), 0) /
              arr.length
            ).toFixed(2)
          )
        : 0;

    const timeAnalysis = {
      avgTimeCorrect: avg(correctAnswers),
      avgTimeWrong: avg(wrongAnswers),
      avgTimeSkipped: avg(skippedAnswers),
    };

    // Subject breakdown
    const subjectMap = new Map<
      string,
      {
        subject: string;
        total: number;
        correct: number;
        wrong: number;
        skipped: number;
        marksObtained: number;
      }
    >();

    for (const ans of answers) {
      const subject = ans.question.subject ?? "Unknown";
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, {
          subject,
          total: 0,
          correct: 0,
          wrong: 0,
          skipped: 0,
          marksObtained: 0,
        });
      }
      const entry = subjectMap.get(subject)!;
      entry.total += 1;
      if (ans.isCorrect) {
        entry.correct += 1;
      } else if (!ans.selectedOption) {
        entry.skipped += 1;
      } else {
        entry.wrong += 1;
      }
      entry.marksObtained += ans.marksAwarded ?? 0;
    }

    const subjectBreakdown = Array.from(subjectMap.values());

    // Calculate authoritative ranking using shared helper
    const ranking = await getAttemptRanking(attempt.id);
    const quizSlug = attempt.test?.testType === "CURRENT_AFFAIRS" && attempt.test
      ? getQuizSlug(attempt.test)
      : undefined;

    return NextResponse.json(
      {
        data: {
          attemptId: attempt.id,
          testId: attempt.testId,
          testType: attempt.test?.testType,
          quizSlug,
          seriesSlug: attempt.test?.series?.slug,
          language: attempt.language,
          status: attempt.status,
          score: attempt.score,
          totalMarks: attempt.totalMarks,
          correctCount: attempt.correctCount,
          wrongCount: attempt.wrongCount,
          skippedCount: attempt.skippedCount,
          markedCount: attempt.markedCount,
          timeTakenSecs: attempt.timeTakenSecs,
          tabSwitchCount: attempt.tabSwitchCount,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          percentile: ranking.percentile,
          allIndiaRank: ranking.rank,
          totalCandidates: ranking.totalCandidates,
          isStaffAttempt: Boolean(ranking.isStaff),
          test: attempt.test,
          questionAnalysis,
          timeAnalysis,
          subjectBreakdown,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/exam/attempt/:attemptId/result]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
