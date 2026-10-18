import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAndValidateQuestion, NormalizedQuestionInput } from "@/lib/exam/question-parser";
import { Prisma } from "@prisma/client";

function getNumber(val: any, fallback: number): number {
  if (val === undefined || val === null || val === "") return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

const VALID_TEST_TYPES: Record<string, "FULL_MOCK" | "CHAPTER_TEST" | "SECTIONAL_TEST" | "PREVIOUS_YEAR" | "LIVE_SPEED" | "CURRENT_AFFAIRS"> = {
  FULL_MOCK: "FULL_MOCK",
  "FULL MOCK TEST": "FULL_MOCK",
  FULL_TEST: "FULL_MOCK",
  "FULL TEST": "FULL_MOCK",
  CHAPTER: "CHAPTER_TEST",
  CHAPTER_TEST: "CHAPTER_TEST",
  "CHAPTER TEST": "CHAPTER_TEST",
  SECTIONAL: "SECTIONAL_TEST",
  SECTIONAL_TEST: "SECTIONAL_TEST",
  "SECTIONAL TEST": "SECTIONAL_TEST",
  PREVIOUS_YEAR: "PREVIOUS_YEAR",
  "PREVIOUS YEAR PAPER": "PREVIOUS_YEAR",
  PYQ: "PREVIOUS_YEAR",
  LIVE_SPEED: "LIVE_SPEED",
  "LIVE SPEED TEST": "LIVE_SPEED",
  CURRENT_AFFAIRS: "CURRENT_AFFAIRS",
  "CURRENT AFFAIRS": "CURRENT_AFFAIRS",
  "CURRENT AFFAIRS QUIZ": "CURRENT_AFFAIRS",
};

const VALID_ACCESS_MODES: Record<string, "FREE" | "PRO"> = {
  FREE: "FREE",
  PRO: "PRO",
  PASS_PRO: "PRO",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Teacher or Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      seriesId,
      title,
      titleHi,
      testType,
      accessMode,
      durationMinutes,
      instructions,
      isLive,
      liveStartAt,
      liveEndAt,
      sections,
      isPublished,
      pyqPaperId,
      syllabus,
      syllabusHi,
      month,
      year,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Test title is required" }, { status: 400 });
    }

    // Validate and map testType enum (supports both UI labels and Prisma enum values)
    const rawTestType = String(testType || "").trim().toUpperCase();
    const mappedTestType = rawTestType ? VALID_TEST_TYPES[rawTestType] : "FULL_MOCK";
    if (!mappedTestType) {
      return NextResponse.json(
        {
          error: "Invalid test type",
          details: [
            `Invalid testType "${testType}". Allowed values: FULL_MOCK, CHAPTER_TEST, SECTIONAL_TEST, PREVIOUS_YEAR, PYQ, LIVE_SPEED, CURRENT_AFFAIRS.`,
          ],
        },
        { status: 400 }
      );
    }

    let targetSeriesId: string;

    if (mappedTestType === "CURRENT_AFFAIRS") {
      let caSeries = await prisma.examSeries.findFirst({
        where: { slug: "current-affairs-system-series" },
      });
      if (!caSeries) {
        caSeries = await prisma.examSeries.create({
          data: {
            title: "Current Affairs Quizzes",
            slug: "current-affairs-system-series",
            examName: "Current Affairs",
            category: "Current Affairs",
            isPublished: false,
            isFree: true,
            createdById: session.user.id,
          },
        });
      }
      targetSeriesId = caSeries.id;
    } else if (mappedTestType === "PREVIOUS_YEAR" || pyqPaperId) {
      // Find or create hidden system ExamSeries for PYQ papers
      let pyqSeries = await prisma.examSeries.findFirst({
        where: { slug: "pyq-system-series" },
      });
      if (!pyqSeries) {
        pyqSeries = await prisma.examSeries.create({
          data: {
            title: "Previous Year Question Papers",
            slug: "pyq-system-series",
            examName: "PYQ",
            category: "PYQ",
            isPublished: false,
            isFree: true,
            createdById: session.user.id,
          },
        });
      }
      targetSeriesId = pyqSeries.id;
    } else {
      // Series must exist in database for regular tests
      if (!seriesId || typeof seriesId !== "string" || !seriesId.trim()) {
        return NextResponse.json(
          { error: "Please select a test series package" },
          { status: 400 }
        );
      }

      const existingSeries = await prisma.examSeries.findFirst({
        where: {
          OR: [
            { id: seriesId.trim() },
            { slug: seriesId.trim() },
          ],
        },
      });

      if (!existingSeries) {
        return NextResponse.json(
          { error: `Test series package "${seriesId}" was not found. Please select an existing series package.` },
          { status: 400 }
        );
      }

      targetSeriesId = existingSeries.id;
    }

    // Server-side PYQ paper validation (B3)
    if (pyqPaperId && typeof pyqPaperId === "string") {
      const paper = await prisma.pyqPaper.findUnique({
        where: { id: pyqPaperId.trim() },
      });
      if (!paper) {
        return NextResponse.json(
          { error: "Selected PYQ paper not found" },
          { status: 404 }
        );
      }

      // Teacher may only link a test to a paper they own
      if (role === "TEACHER" && paper.creatorId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only link a test to a PYQ paper you own" },
          { status: 403 }
        );
      }

      // Paper already linked to an active published test: reject with clear error
      if (paper.cbtTestId && paper.hasCbtMode) {
        const existingLinked = await prisma.examTest.findUnique({
          where: { id: paper.cbtTestId },
        });
        if (existingLinked && existingLinked.isPublished) {
          return NextResponse.json(
            { error: `Paper "${paper.title}" is already linked to active published test "${existingLinked.title}"` },
            { status: 400 }
          );
        }
      }
    }

    // Validate and map accessMode enum (supports both UI labels and Prisma enum values)
    const rawAccessMode = String(accessMode || "").trim().toUpperCase();
    const mappedAccessMode = rawAccessMode ? VALID_ACCESS_MODES[rawAccessMode] : "PRO";
    if (!mappedAccessMode) {
      return NextResponse.json(
        {
          error: "Invalid access mode",
          details: [
            `Invalid accessMode "${accessMode}". Allowed values: FREE, PRO (or UI labels: free, pro, Free Test, Pass Pro Exclusive).`,
          ],
        },
        { status: 400 }
      );
    }

    // Validate sections array
    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: "At least one section is required" },
        { status: 400 }
      );
    }

    const isPublishMode = Boolean(isPublished);

    // ── Phase 1: Pre-validation of all questions BEFORE any DB writes ──
    const validationErrors: string[] = [];
    const draftWarnings: string[] = [];
    interface PreparedSection {
      title: string;
      titleHi: string | null;
      positiveMarks: number;
      negativeMarks: number;
      timeLimitMins: number | null;
      validQuestions: Array<{
        validated: NormalizedQuestionInput;
        positiveMarks: number;
        negativeMarks: number;
        videoUrl: string | null;
      }>;
      skippedCount: number;
    }

    const preparedSections: PreparedSection[] = [];

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const secTitle = sec.title?.trim() || `Section ${sIdx + 1}`;
      const secPos = getNumber(sec.positiveMarks, 1.0);
      const secNeg = getNumber(sec.negativeMarks, 0.33);
      const secTime = sec.timeLimitMins !== undefined && sec.timeLimitMins !== null && sec.timeLimitMins !== ""
        ? getNumber(sec.timeLimitMins, 0)
        : null;

      const questions = Array.isArray(sec.questions) ? sec.questions : [];
      const sectionValidQs: PreparedSection["validQuestions"] = [];
      let sectionSkipped = 0;

      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const q = questions[qIdx];
        const qPos = getNumber(q.positiveMarks, secPos);
        const qNeg = getNumber(q.negativeMarks, secNeg);

        try {
          const validated = parseAndValidateQuestion(q, qIdx);
          sectionValidQs.push({
            validated,
            positiveMarks: qPos,
            negativeMarks: qNeg,
            videoUrl: q.videoUrl ? String(q.videoUrl).trim() : null,
          });
        } catch (err: any) {
          if (isPublishMode) {
            validationErrors.push(`${secTitle}, Question ${qIdx + 1}: ${err.message}`);
          } else {
            // Draft mode skips incomplete or empty questions
            const hasContent = Boolean(
              (q.questionEn && String(q.questionEn).trim()) ||
              (q.question && String(q.question).trim()) ||
              (q.questionHi && String(q.questionHi).trim()) ||
              (q.optionAEn && String(q.optionAEn).trim()) ||
              (q.optionA && String(q.optionA).trim()) ||
              (q.explanationEn && String(q.explanationEn).trim()) ||
              (Array.isArray(q.options) && q.options.some((o: any) => typeof o === "string" ? o.trim() : (o?.english || o?.text || "").trim()))
            );
            if (hasContent) {
              draftWarnings.push(`${secTitle}, Question ${qIdx + 1}: ${err.message}`);
            }
            sectionSkipped++;
          }
        }
      }

      preparedSections.push({
        title: secTitle,
        titleHi: sec.titleHi?.trim() || null,
        positiveMarks: secPos,
        negativeMarks: secNeg,
        timeLimitMins: secTime,
        validQuestions: sectionValidQs,
        skippedCount: sectionSkipped,
      });
    }

    // In publish mode, any error immediately fails with 400
    if (isPublishMode && validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot publish test: ${validationErrors.length} question(s) have errors.`,
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // ── Phase 2: Compute totals on server from sections & questions ──
    let totalQuestionsCount = 0;
    let totalMarksCount = 0;
    let totalSkippedCount = 0;

    for (const pSec of preparedSections) {
      totalQuestionsCount += pSec.validQuestions.length;
      totalSkippedCount += pSec.skippedCount;
      for (const q of pSec.validQuestions) {
        totalMarksCount += q.positiveMarks;
      }
    }

    const parsedDuration = getNumber(durationMinutes, 60);

    // ── Phase 3: Execute DB writes in single transaction with 30s timeout ──
    const createdTest = await prisma.$transaction(
      async (tx) => {
        const newTest = await tx.examTest.create({
          data: {
            seriesId: targetSeriesId,
            title: title.trim(),
            titleHi: titleHi ? String(titleHi).trim() : null,
            testType: mappedTestType,
            accessMode: mappedAccessMode,
            durationMinutes: parsedDuration,
            totalQuestions: totalQuestionsCount,
            totalMarks: totalMarksCount,
            positiveMarks: preparedSections[0]?.positiveMarks ?? 1.0,
            negativeMarks: preparedSections[0]?.negativeMarks ?? 0.33,
            instructions: instructions ? String(instructions) : null,
            syllabus: syllabus ? String(syllabus).trim() : null,
            syllabusHi: syllabusHi ? String(syllabusHi).trim() : null,
            isLive: Boolean(isLive),
            liveStartAt: liveStartAt ? new Date(liveStartAt) : null,
            liveEndAt: liveEndAt ? new Date(liveEndAt) : null,
            isPublished: isPublishMode,
            month: month !== undefined && month !== null && month !== "" ? Number(month) : null,
            year: year !== undefined && year !== null && year !== "" ? Number(year) : null,
            createdById: session.user.id,
          },
        });

        for (let sIdx = 0; sIdx < preparedSections.length; sIdx++) {
          const pSec = preparedSections[sIdx];
          const newSection = await tx.examSection.create({
            data: {
              testId: newTest.id,
              title: pSec.title,
              titleHi: pSec.titleHi,
              order: sIdx + 1,
              positiveMarks: pSec.positiveMarks,
              negativeMarks: pSec.negativeMarks,
              timeLimitMins: pSec.timeLimitMins,
            },
          });

          if (pSec.validQuestions.length > 0) {
            const questionRows = pSec.validQuestions.map((q, qIdx) => ({
              sectionId: newSection.id,
              questionType: "MCQ" as const,
              questionEn: q.validated.questionEn,
              questionHi: q.validated.questionHi || null,
              optionAEn: q.validated.optionAEn,
              optionBEn: q.validated.optionBEn,
              optionCEn: q.validated.optionCEn,
              optionDEn: q.validated.optionDEn,
              optionAHi: q.validated.optionAHi || null,
              optionBHi: q.validated.optionBHi || null,
              optionCHi: q.validated.optionCHi || null,
              optionDHi: q.validated.optionDHi || null,
              correctOption: q.validated.correctOption,
              explanationEn: q.validated.explanationEn || null,
              explanationHi: q.validated.explanationHi || null,
              videoUrl: q.videoUrl,
              difficulty: (q.validated.difficulty as any) || "MODERATE",
              subject: q.validated.subject || "General Studies",
              topic: q.validated.topic || null,
              order: qIdx + 1,
              positiveMarks: q.positiveMarks,
              negativeMarks: q.negativeMarks,
            }));

            await tx.examQuestion.createMany({
              data: questionRows,
            });
          }
        }

        // Increment series totalTests ONLY when isPublished === true
        if (isPublishMode) {
          await tx.examSeries.update({
            where: { id: targetSeriesId },
            data: { totalTests: { increment: 1 } },
          });
        }

        // Link to PYQ paper if pyqPaperId provided (B2: active link only if published)
        if (pyqPaperId && typeof pyqPaperId === "string") {
          await tx.pyqPaper.update({
            where: { id: pyqPaperId.trim() },
            data: {
              cbtTestId: newTest.id,
              hasCbtMode: isPublishMode,
            },
          });
        }

        return newTest;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    revalidateTag("exam-series");
    revalidatePath("/test-series");
    revalidatePath("/teacher/test-series");
    if (targetSeriesId) {
      revalidatePath(`/test-series/${targetSeriesId}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: createdTest.id,
        title: createdTest.title,
        isPublished: createdTest.isPublished,
        updatedAt: createdTest.updatedAt.toISOString(),
        savedQuestions: totalQuestionsCount,
        skippedQuestions: totalSkippedCount,
        message: isPublishMode
          ? "Test published successfully"
          : `Draft saved successfully with ${totalQuestionsCount} question(s)${totalSkippedCount > 0 ? ` (${totalSkippedCount} blank question slots skipped)` : ""}`,
      },
      warnings: draftWarnings,
    });
  } catch (error: any) {
    console.error("[EXAM_TEST_CREATE_ERROR]", error);

    if (
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return NextResponse.json(
        { error: "Database validation error: " + (error.message || "Invalid schema data") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
