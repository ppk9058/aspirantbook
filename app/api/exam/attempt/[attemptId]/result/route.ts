import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
            seriesId: true,
            durationMinutes: true,
            totalMarks: true,
            totalQuestions: true,
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
      return NextResponse.json(
        { error: "Attempt has not been submitted yet" },
        { status: 409 }
      );
    }

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

    // Per-question analysis
    const questionAnalysis = answers.map((ans) => {
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

    // Calculate percentile
    const totalSubmitted = await prisma.examAttempt.count({
      where: { testId: attempt.testId, status: "SUBMITTED" },
    });

    const rank = await prisma.examAttempt.count({
      where: {
        testId: attempt.testId,
        status: "SUBMITTED",
        score: { gt: attempt.score ?? 0 },
      },
    });

    const percentile =
      totalSubmitted > 1
        ? parseFloat(
            (((totalSubmitted - rank) / totalSubmitted) * 100).toFixed(2)
          )
        : null;

    return NextResponse.json(
      {
        data: {
          attemptId: attempt.id,
          testId: attempt.testId,
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
          percentile,
          allIndiaRank: totalSubmitted > 1 ? rank + 1 : null,
          totalCandidates: totalSubmitted,
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
