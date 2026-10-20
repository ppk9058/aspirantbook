import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Teacher or Admin role required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Test id is required" }, { status: 400 });
    }

    const test = await prisma.examTest.findUnique({
      where: { id },
      include: {
        series: {
          select: { id: true, title: true, slug: true, category: true },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Role check: Teacher can only load their own test; Admin can load any
    if (role === "TEACHER" && test.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this test" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        test: {
          id: test.id,
          title: test.title,
          titleHi: test.titleHi,
          seriesId: test.seriesId,
          series: test.series,
          testType: test.testType,
          accessMode: test.accessMode,
          durationMinutes: test.durationMinutes,
          totalQuestions: test.totalQuestions,
          totalMarks: test.totalMarks,
          positiveMarks: test.positiveMarks,
          negativeMarks: test.negativeMarks,
          syllabus: test.syllabus,
          syllabusHi: test.syllabusHi,
          isLive: test.isLive,
          liveStartAt: test.liveStartAt,
          liveEndAt: test.liveEndAt,
          isPublished: test.isPublished,
          createdById: test.createdById,
          updatedAt: test.updatedAt.toISOString(),
          sections: test.sections.map((s) => ({
            id: s.id,
            testId: s.testId,
            title: s.title,
            titleHi: s.titleHi,
            order: s.order,
            positiveMarks: s.positiveMarks,
            negativeMarks: s.negativeMarks,
            timeLimitMins: s.timeLimitMins,
            numQuestions: s.questions.length,
            questions: s.questions.map((q) => ({
              id: q.id,
              sectionId: q.sectionId,
              questionEn: q.questionEn,
              questionHi: q.questionHi || "",
              optionAEn: q.optionAEn || "",
              optionBEn: q.optionBEn || "",
              optionCEn: q.optionCEn || "",
              optionDEn: q.optionDEn || "",
              optionAHi: q.optionAHi || "",
              optionBHi: q.optionBHi || "",
              optionCHi: q.optionCHi || "",
              optionDHi: q.optionDHi || "",
              correctOption: q.correctOption,
              explanationEn: q.explanationEn || "",
              explanationHi: q.explanationHi || "",
              videoUrl: q.videoUrl || "",
              difficulty: q.difficulty,
              subject: q.subject || "",
              topic: q.topic || "",
              order: q.order,
              positiveMarks: q.positiveMarks,
              negativeMarks: q.negativeMarks,
            })),
          })),
        },
        attemptsCount: test._count.attempts,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/exam/test/:id/edit-data]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Teacher or Admin role required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Test id is required" }, { status: 400 });
    }

    const existingTest = await prisma.examTest.findUnique({
      where: { id },
      include: {
        series: {
          select: { id: true, slug: true },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!existingTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Role check: Teacher can only update their own test; Admin can update any
    if (role === "TEACHER" && existingTest.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this test" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      titleHi,
      syllabus,
      syllabusHi,
      seriesId,
      testType,
      accessMode,
      durationMinutes,
      sections,
      isPublished: reqPublishState,
      isLive,
      liveStartAt,
      liveEndAt,
      month,
      year,
      lastKnownUpdatedAt,
      forceOverwrite,
    } = body;

    // Concurrent modification guard
    if (lastKnownUpdatedAt && !forceOverwrite) {
      const dbUpdatedAt = new Date(existingTest.updatedAt).getTime();
      const clientUpdatedAt = new Date(lastKnownUpdatedAt).getTime();
      // Allow 2s clock skew / network roundtrip
      if (dbUpdatedAt - clientUpdatedAt > 2000) {
        return NextResponse.json(
          {
            error: "Concurrent edit conflict: This test was modified elsewhere after you loaded it.",
            code: "CONCURRENT_MODIFICATION",
            updatedAt: existingTest.updatedAt.toISOString(),
          },
          { status: 409 }
        );
      }
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Test title is required" }, { status: 400 });
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: "At least one section is required" }, { status: 400 });
    }

    const isPublishedTest = existingTest.isPublished;
    // Rule: "Save never changes the published/draft status. If a test is already published, Save updates the live data. If it's a draft, it stays a draft."
    const willBePublished = isPublishedTest ? true : Boolean(reqPublishState);

    // Helper to normalize correct answer to "A" | "B" | "C" | "D"
    const normalizeAnswer = (val: any): "A" | "B" | "C" | "D" | null => {
      if (typeof val === "number") {
        if (val >= 0 && val <= 3) return (["A", "B", "C", "D"] as const)[val];
        if (val >= 1 && val <= 4) return (["A", "B", "C", "D"] as const)[val - 1];
      }
      if (typeof val === "string") {
        const u = val.trim().toUpperCase();
        if (["A", "B", "C", "D"].includes(u)) return u as "A" | "B" | "C" | "D";
        if (u === "0" || u === "1" || u === "2" || u === "3") {
          return (["A", "B", "C", "D"] as const)[Number(u)];
        }
      }
      return null;
    };

    const normalizeString = (val: any): string | null => {
      if (val === null || val === undefined) return null;
      const trimmed = String(val).trim();
      return trimmed === "" ? null : trimmed;
    };

    const hasQuestionChanged = (
      existing: any,
      incoming: {
        questionEn: string;
        questionHi: string | null;
        optionAEn: string;
        optionBEn: string;
        optionCEn: string;
        optionDEn: string;
        optionAHi: string | null;
        optionBHi: string | null;
        optionCHi: string | null;
        optionDHi: string | null;
        correctOption: string;
        explanationEn: string | null;
        explanationHi: string | null;
        difficulty: string;
        subject: string | null;
        topic: string | null;
        videoUrl: string | null;
        order?: number;
        positiveMarks?: number;
        negativeMarks?: number;
      }
    ): boolean => {
      if ((existing.questionEn || "").trim() !== incoming.questionEn) return true;
      if (normalizeString(existing.questionHi) !== incoming.questionHi) return true;
      if ((existing.optionAEn || "").trim() !== incoming.optionAEn) return true;
      if ((existing.optionBEn || "").trim() !== incoming.optionBEn) return true;
      if ((existing.optionCEn || "").trim() !== incoming.optionCEn) return true;
      if ((existing.optionDEn || "").trim() !== incoming.optionDEn) return true;
      if (normalizeString(existing.optionAHi) !== incoming.optionAHi) return true;
      if (normalizeString(existing.optionBHi) !== incoming.optionBHi) return true;
      if (normalizeString(existing.optionCHi) !== incoming.optionCHi) return true;
      if (normalizeString(existing.optionDHi) !== incoming.optionDHi) return true;
      if (existing.correctOption !== incoming.correctOption) return true;
      if (normalizeString(existing.explanationEn) !== incoming.explanationEn) return true;
      if (normalizeString(existing.explanationHi) !== incoming.explanationHi) return true;
      if (existing.difficulty !== incoming.difficulty) return true;
      if (normalizeString(existing.subject) !== incoming.subject) return true;
      if (normalizeString(existing.topic) !== incoming.topic) return true;
      if (normalizeString(existing.videoUrl) !== incoming.videoUrl) return true;
      if (incoming.order !== undefined && existing.order !== incoming.order) return true;
      if (
        incoming.positiveMarks !== undefined &&
        Number(existing.positiveMarks) !== Number(incoming.positiveMarks)
      ) {
        return true;
      }
      if (
        incoming.negativeMarks !== undefined &&
        Number(existing.negativeMarks) !== Number(incoming.negativeMarks)
      ) {
        return true;
      }
      return false;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // CASE 1: PUBLISHED TEST — STRUCTURE IS STRICTLY LOCKED
    // ──────────────────────────────────────────────────────────────────────────
    if (isPublishedTest) {
      // Test-level locked fields if there are student attempts: duration, testType
      if (existingTest._count.attempts > 0) {
        if (body.durationMinutes !== undefined && Number(body.durationMinutes) !== existingTest.durationMinutes) {
          return NextResponse.json(
            { error: `Structure locked: Cannot alter duration on published test with student attempts (current: ${existingTest.durationMinutes}m, received: ${body.durationMinutes}m).` },
            { status: 400 }
          );
        }
        if (body.testType !== undefined && body.testType !== existingTest.testType) {
          return NextResponse.json(
            { error: `Structure locked: Cannot alter test type on published test with student attempts.` },
            { status: 400 }
          );
        }
      }

      // 1. Must have exact same number of sections
      if (sections.length !== existingTest.sections.length) {
        return NextResponse.json(
          { error: "Structure locked: Cannot add or remove sections on a published test." },
          { status: 400 }
        );
      }

      const existingSectionMap = new Map(existingTest.sections.map((s) => [s.id, s]));
      const validationErrors: string[] = [];

      // Validate each section and its questions
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const secInput = sections[sIdx];
        const existingSec = existingSectionMap.get(secInput.id);

        if (!existingSec) {
          return NextResponse.json(
            { error: `Structure locked: Section ID "${secInput.id}" does not match existing sections.` },
            { status: 400 }
          );
        }

        // Marks & timers cannot be changed on published test
        if (
          secInput.positiveMarks !== undefined &&
          Number(secInput.positiveMarks) !== existingSec.positiveMarks
        ) {
          return NextResponse.json(
            { error: `Structure locked: Cannot alter positive marks on published test section "${existingSec.title}".` },
            { status: 400 }
          );
        }
        if (
          secInput.negativeMarks !== undefined &&
          Number(secInput.negativeMarks) !== existingSec.negativeMarks
        ) {
          return NextResponse.json(
            { error: `Structure locked: Cannot alter negative marks on published test section "${existingSec.title}".` },
            { status: 400 }
          );
        }
        const inputTimer = secInput.timeLimitMins ?? secInput.sectionalTimeMinutes;
        if (
          inputTimer !== undefined &&
          (Number(inputTimer) || null) !== (existingSec.timeLimitMins || null)
        ) {
          return NextResponse.json(
            { error: `Structure locked: Cannot alter section timers on published test section "${existingSec.title}".` },
            { status: 400 }
          );
        }

        const inputQuestions: any[] = Array.isArray(secInput.questions) ? secInput.questions : [];

        // Question count cannot be changed on published test
        if (inputQuestions.length !== existingSec.questions.length) {
          return NextResponse.json(
            {
              error: `Structure locked: Section "${existingSec.title}" must keep exactly ${existingSec.questions.length} questions (received ${inputQuestions.length}).`,
            },
            { status: 400 }
          );
        }

        const existingQuestionMap = new Map(existingSec.questions.map((q) => [q.id, q]));

        // Validate each question: must match an existing ID and have valid question data
        for (let qIdx = 0; qIdx < inputQuestions.length; qIdx++) {
          const q = inputQuestions[qIdx];
          const existingQ = existingQuestionMap.get(q.id);

          if (!existingQ) {
            return NextResponse.json(
              { error: `Structure locked: Question ID "${q.id}" does not belong to section "${existingSec.title}".` },
              { status: 400 }
            );
          }

          const qNum = qIdx + 1;
          const qEn = String(q.questionEn || "").trim();
          const optA = String(q.optionAEn || "").trim();
          const optB = String(q.optionBEn || "").trim();
          const optC = String(q.optionCEn || "").trim();
          const optD = String(q.optionDEn || "").trim();
          const ans = normalizeAnswer(q.correctOption);

          if (!qEn) {
            validationErrors.push(`${existingSec.title}, Q${qNum}: Question text cannot be empty.`);
          }
          if (!optA) validationErrors.push(`${existingSec.title}, Q${qNum}: Option A cannot be empty.`);
          if (!optB) validationErrors.push(`${existingSec.title}, Q${qNum}: Option B cannot be empty.`);
          if (!optC) validationErrors.push(`${existingSec.title}, Q${qNum}: Option C cannot be empty.`);
          if (!optD) validationErrors.push(`${existingSec.title}, Q${qNum}: Option D cannot be empty.`);
          if (!ans) {
            validationErrors.push(`${existingSec.title}, Q${qNum}: Invalid correct answer. Must be A, B, C, or D.`);
          }
        }
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot save test: ${validationErrors.length} validation error(s) found.`,
            details: validationErrors,
          },
          { status: 400 }
        );
      }

      // Execute update IN PLACE by ID inside a transaction (NEVER delete or recreate)
      await prisma.$transaction(
        async (tx) => {
          const nextTitle = title.trim();
          const nextTitleHi = titleHi ? String(titleHi).trim() : null;
          if (
            existingTest.title !== nextTitle ||
            normalizeString(existingTest.titleHi) !== nextTitleHi
          ) {
            await tx.examTest.update({
              where: { id },
              data: {
                title: nextTitle,
                titleHi: nextTitleHi,
              },
            });
          }

          for (const secInput of sections) {
            const existingSec = existingSectionMap.get(secInput.id);
            if (secInput.title && existingSec) {
              const nextSecTitle = secInput.title.trim();
              const nextSecTitleHi = secInput.titleHi ? String(secInput.titleHi).trim() : null;
              if (
                existingSec.title !== nextSecTitle ||
                normalizeString(existingSec.titleHi) !== nextSecTitleHi
              ) {
                await tx.examSection.update({
                  where: { id: secInput.id },
                  data: {
                    title: nextSecTitle,
                    titleHi: nextSecTitleHi,
                  },
                });
              }
            }

            const existingQMap = new Map(
              (existingSec?.questions || []).map((q) => [q.id, q])
            );

            for (const q of secInput.questions) {
              const existingQ = existingQMap.get(q.id);
              const ans = normalizeAnswer(q.correctOption) || "A";
              const diff = String(q.difficulty || "MODERATE").toUpperCase();
              const difficulty = ["EASY", "MODERATE", "HARD"].includes(diff) ? diff : "MODERATE";

              const incomingData = {
                questionEn: String(q.questionEn).trim(),
                questionHi: q.questionHi ? String(q.questionHi).trim() : null,
                optionAEn: String(q.optionAEn).trim(),
                optionBEn: String(q.optionBEn).trim(),
                optionCEn: String(q.optionCEn).trim(),
                optionDEn: String(q.optionDEn).trim(),
                optionAHi: q.optionAHi ? String(q.optionAHi).trim() : null,
                optionBHi: q.optionBHi ? String(q.optionBHi).trim() : null,
                optionCHi: q.optionCHi ? String(q.optionCHi).trim() : null,
                optionDHi: q.optionDHi ? String(q.optionDHi).trim() : null,
                correctOption: ans,
                explanationEn: q.explanationEn ? String(q.explanationEn).trim() : null,
                explanationHi: q.explanationHi ? String(q.explanationHi).trim() : null,
                difficulty: difficulty as any,
                subject: q.subject ? String(q.subject).trim() : null,
                topic: q.topic ? String(q.topic).trim() : null,
                videoUrl: q.videoUrl ? String(q.videoUrl).trim() : null,
              };

              if (!existingQ || hasQuestionChanged(existingQ, incomingData)) {
                await tx.examQuestion.update({
                  where: { id: q.id },
                  data: incomingData,
                });
              }
            }
          }

          const updateData: any = {
            title: title.trim(),
            titleHi: titleHi ? String(titleHi).trim() : null,
          };
          if (syllabus !== undefined) updateData.syllabus = syllabus ? String(syllabus).trim() : null;
          if (syllabusHi !== undefined) updateData.syllabusHi = syllabusHi ? String(syllabusHi).trim() : null;
          if (seriesId && seriesId !== existingTest.seriesId) updateData.seriesId = seriesId;
          if (accessMode) {
            updateData.accessMode = String(accessMode).toUpperCase() === "FREE" ? "FREE" : "PRO";
          }
          if (isLive !== undefined) updateData.isLive = Boolean(isLive);
          if (liveStartAt !== undefined) updateData.liveStartAt = liveStartAt ? new Date(liveStartAt) : null;
          if (liveEndAt !== undefined) updateData.liveEndAt = liveEndAt ? new Date(liveEndAt) : null;
          if (month !== undefined) updateData.month = month !== null && month !== "" ? Number(month) : null;
          if (year !== undefined) updateData.year = year !== null && year !== "" ? Number(year) : null;
          if (existingTest._count.attempts === 0 && durationMinutes !== undefined && !isNaN(Number(durationMinutes))) {
            updateData.durationMinutes = Number(durationMinutes);
          }
          await tx.examTest.update({
            where: { id },
            data: updateData,
          });
        },
        {
          maxWait: 10000,
          timeout: 60000,
        }
      );
    } else {
      // ──────────────────────────────────────────────────────────────────────────
      // CASE 2: DRAFT TEST (PART G) — STRUCTURE UNLOCKED
      // ──────────────────────────────────────────────────────────────────────────
      const isPublishingNow = Boolean(reqPublishState);
      const validationErrors: string[] = [];

      // Validate questions if publishing
      if (isPublishingNow) {
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const sec = sections[sIdx];
          const secTitle = sec.title?.trim() || `Section ${sIdx + 1}`;
          const questions = Array.isArray(sec.questions) ? sec.questions : [];

          for (let qIdx = 0; qIdx < questions.length; qIdx++) {
            const q = questions[qIdx];
            const qNum = qIdx + 1;
            const qEn = String(q.questionEn || "").trim();
            const optA = String(q.optionAEn || "").trim();
            const optB = String(q.optionBEn || "").trim();
            const optC = String(q.optionCEn || "").trim();
            const optD = String(q.optionDEn || "").trim();
            const ans = normalizeAnswer(q.correctOption);

            if (!qEn) validationErrors.push(`${secTitle}, Q${qNum}: Question text cannot be empty.`);
            if (!optA) validationErrors.push(`${secTitle}, Q${qNum}: Option A cannot be empty.`);
            if (!optB) validationErrors.push(`${secTitle}, Q${qNum}: Option B cannot be empty.`);
            if (!optC) validationErrors.push(`${secTitle}, Q${qNum}: Option C cannot be empty.`);
            if (!optD) validationErrors.push(`${secTitle}, Q${qNum}: Option D cannot be empty.`);
            if (!ans) validationErrors.push(`${secTitle}, Q${qNum}: Invalid correct answer.`);
          }
        }

        if (validationErrors.length > 0) {
          return NextResponse.json(
            {
              error: `Cannot publish test: ${validationErrors.length} question(s) have errors.`,
              details: validationErrors,
            },
            { status: 400 }
          );
        }
      }

      await prisma.$transaction(
        async (tx) => {
          let totalQCount = 0;
          let totalMarksSum = 0;

          for (let sIdx = 0; sIdx < sections.length; sIdx++) {
            const secInput = sections[sIdx];
            const secPos = Number(secInput.positiveMarks) || 1.0;
            const secNeg = Number(secInput.negativeMarks) || 0.33;
            const questions = Array.isArray(secInput.questions) ? secInput.questions : [];

            let sectionId = secInput.id;
            const existingSec = existingTest.sections.find((s) => s.id === sectionId);

            if (existingSec) {
              const nextSecTitle = secInput.title?.trim() || `Section ${sIdx + 1}`;
              const nextSecTitleHi = secInput.titleHi?.trim() || null;
              const nextTimeLimit =
                secInput.timeLimitMins !== undefined &&
                secInput.timeLimitMins !== null &&
                secInput.timeLimitMins !== ""
                  ? Number(secInput.timeLimitMins)
                  : null;
              const secChanged =
                existingSec.title !== nextSecTitle ||
                normalizeString(existingSec.titleHi) !== nextSecTitleHi ||
                existingSec.order !== sIdx + 1 ||
                Number(existingSec.positiveMarks) !== secPos ||
                Number(existingSec.negativeMarks) !== secNeg ||
                (existingSec.timeLimitMins || null) !== nextTimeLimit;

              if (secChanged) {
                await tx.examSection.update({
                  where: { id: sectionId },
                  data: {
                    title: nextSecTitle,
                    titleHi: nextSecTitleHi,
                    order: sIdx + 1,
                    positiveMarks: secPos,
                    negativeMarks: secNeg,
                    timeLimitMins: nextTimeLimit,
                  },
                });
              }
            } else {
              const createdSec = await tx.examSection.create({
                data: {
                  testId: id,
                  title: secInput.title?.trim() || `Section ${sIdx + 1}`,
                  titleHi: secInput.titleHi?.trim() || null,
                  order: sIdx + 1,
                  positiveMarks: secPos,
                  negativeMarks: secNeg,
                  timeLimitMins:
                    secInput.timeLimitMins !== undefined &&
                    secInput.timeLimitMins !== null &&
                    secInput.timeLimitMins !== ""
                      ? Number(secInput.timeLimitMins)
                      : null,
                },
              });
              sectionId = createdSec.id;
            }

            // Existing question IDs in this section
            const existingQIds = new Set(
              existingSec ? existingSec.questions.map((q) => q.id) : []
            );
            const existingQMap = new Map(
              (existingSec ? existingSec.questions : []).map((q) => [q.id, q])
            );
            const submittedQIds = new Set<string>();

            for (let qIdx = 0; qIdx < questions.length; qIdx++) {
              const q = questions[qIdx];
              const ans = normalizeAnswer(q.correctOption) || "A";
              const diff = String(q.difficulty || "MODERATE").toUpperCase();
              const difficulty = ["EASY", "MODERATE", "HARD"].includes(diff) ? diff : "MODERATE";

              if (q.id && existingQIds.has(q.id)) {
                // Update in place by id
                submittedQIds.add(q.id);
                const existingQ = existingQMap.get(q.id);
                const incomingData = {
                  questionEn: String(q.questionEn || "").trim() || "Untitled Question",
                  questionHi: q.questionHi?.trim() || null,
                  optionAEn: String(q.optionAEn || "").trim() || "Option A",
                  optionBEn: String(q.optionBEn || "").trim() || "Option B",
                  optionCEn: String(q.optionCEn || "").trim() || "Option C",
                  optionDEn: String(q.optionDEn || "").trim() || "Option D",
                  optionAHi: q.optionAHi?.trim() || null,
                  optionBHi: q.optionBHi?.trim() || null,
                  optionCHi: q.optionCHi?.trim() || null,
                  optionDHi: q.optionDHi?.trim() || null,
                  correctOption: ans,
                  explanationEn: q.explanationEn?.trim() || null,
                  explanationHi: q.explanationHi?.trim() || null,
                  difficulty: difficulty as any,
                  subject: q.subject?.trim() || null,
                  topic: q.topic?.trim() || null,
                  videoUrl: q.videoUrl?.trim() || null,
                  order: qIdx + 1,
                  positiveMarks: secPos,
                  negativeMarks: secNeg,
                };

                if (!existingQ || hasQuestionChanged(existingQ, incomingData)) {
                  await tx.examQuestion.update({
                    where: { id: q.id },
                    data: incomingData,
                  });
                }
              } else {
                // Add new question for draft
                const newQ = await tx.examQuestion.create({
                  data: {
                    sectionId,
                    questionType: "MCQ",
                    questionEn: String(q.questionEn || "").trim() || "Untitled Question",
                    questionHi: q.questionHi?.trim() || null,
                    optionAEn: String(q.optionAEn || "").trim() || "Option A",
                    optionBEn: String(q.optionBEn || "").trim() || "Option B",
                    optionCEn: String(q.optionCEn || "").trim() || "Option C",
                    optionDEn: String(q.optionDEn || "").trim() || "Option D",
                    optionAHi: q.optionAHi?.trim() || null,
                    optionBHi: q.optionBHi?.trim() || null,
                    optionCHi: q.optionCHi?.trim() || null,
                    optionDHi: q.optionDHi?.trim() || null,
                    correctOption: ans,
                    explanationEn: q.explanationEn?.trim() || null,
                    explanationHi: q.explanationHi?.trim() || null,
                    difficulty: difficulty as any,
                    subject: q.subject?.trim() || null,
                    topic: q.topic?.trim() || null,
                    videoUrl: q.videoUrl?.trim() || null,
                    order: qIdx + 1,
                    positiveMarks: secPos,
                    negativeMarks: secNeg,
                  },
                });
                submittedQIds.add(newQ.id);
              }

              totalQCount++;
              totalMarksSum += secPos;
            }

            // Delete questions removed from this draft section
            if (existingSec) {
              const removedQIds = existingSec.questions
                .map((q) => q.id)
                .filter((id) => !submittedQIds.has(id));
              if (removedQIds.length > 0) {
                await tx.examQuestion.deleteMany({
                  where: { id: { in: removedQIds } },
                });
              }
            }
          }

          // Update overall test totals
          const nextTitle = title.trim();
          const nextTitleHi = titleHi ? String(titleHi).trim() : null;
          const testChanged =
            existingTest.title !== nextTitle ||
            normalizeString(existingTest.titleHi) !== nextTitleHi ||
            existingTest.totalQuestions !== totalQCount ||
            Number(existingTest.totalMarks) !== totalMarksSum ||
            existingTest.isPublished !== isPublishingNow;

          const updateData: any = {
            title: nextTitle,
            titleHi: nextTitleHi,
            totalQuestions: totalQCount,
            totalMarks: totalMarksSum,
            isPublished: willBePublished,
          };
          if (syllabus !== undefined) updateData.syllabus = syllabus ? String(syllabus).trim() : null;
          if (syllabusHi !== undefined) updateData.syllabusHi = syllabusHi ? String(syllabusHi).trim() : null;
          if (seriesId && seriesId !== existingTest.seriesId) updateData.seriesId = seriesId;
          if (testType) {
            const rawType = String(testType).toUpperCase().replace(/\s+/g, "_");
            const mapped = rawType.includes("MOCK") ? "FULL_MOCK" : (rawType.includes("FULL") ? "FULL_MOCK" : rawType);
            updateData.testType = mapped;
          }
          if (accessMode) {
            updateData.accessMode = String(accessMode).toUpperCase() === "FREE" ? "FREE" : "PRO";
          }
          if (durationMinutes !== undefined && !isNaN(Number(durationMinutes))) {
            updateData.durationMinutes = Number(durationMinutes);
          }
          if (isLive !== undefined) updateData.isLive = Boolean(isLive);
          if (liveStartAt !== undefined) updateData.liveStartAt = liveStartAt ? new Date(liveStartAt) : null;
          if (liveEndAt !== undefined) updateData.liveEndAt = liveEndAt ? new Date(liveEndAt) : null;
          if (month !== undefined) updateData.month = month !== null && month !== "" ? Number(month) : null;
          if (year !== undefined) updateData.year = year !== null && year !== "" ? Number(year) : null;

          await tx.examTest.update({
            where: { id },
            data: updateData,
          });

          if (willBePublished && !existingTest.isPublished) {
            await tx.examSeries.update({
              where: { id: existingTest.seriesId },
              data: { totalTests: { increment: 1 } },
            });
          }
        },
        {
          maxWait: 10000,
          timeout: 60000,
        }
      );
    }

    revalidateTag("exam-series");
    revalidatePath("/test-series");
    revalidatePath("/teacher/test-series");
    if (existingTest.seriesId) {
      revalidatePath(`/test-series/${existingTest.seriesId}`);
    }
    if (existingTest.series?.slug) {
      revalidatePath(`/test-series/${existingTest.series.slug}`);
    }

    const updatedTest = await prisma.examTest.findUnique({
      where: { id },
      select: { updatedAt: true, isPublished: true },
    });

    return NextResponse.json({
      success: true,
      message: "Test saved successfully",
      updatedAt: updatedTest?.updatedAt?.toISOString() || new Date().toISOString(),
      isPublished: updatedTest?.isPublished ?? isPublishedTest,
      hasAttempts: existingTest._count.attempts > 0,
      attemptsCount: existingTest._count.attempts,
    });
  } catch (error: any) {
    console.error("[PUT /api/exam/test/:id/edit-data]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
