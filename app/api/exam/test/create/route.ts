import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
      seriesTitle,
      category,
      title,
      titleHi,
      testType,
      accessMode,
      durationMinutes,
      totalQuestions,
      totalMarks,
      positiveMarks,
      negativeMarks,
      instructions,
      isLive,
      liveStartAt,
      liveEndAt,
      sections,
      isPublished,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Ensure or find a series
    let targetSeriesId = seriesId;
    if (!targetSeriesId) {
      if (category?.toLowerCase().includes("current affair")) {
        targetSeriesId = "current-affairs-quizzes";
      } else if (category?.toLowerCase().includes("upsc") || title.toLowerCase().includes("upsc")) {
        targetSeriesId = "upsc-prelims-2026";
      } else if (category?.toLowerCase().includes("bpsc") || title.toLowerCase().includes("bpsc")) {
        targetSeriesId = "bpsc-72nd-2026";
      } else {
        targetSeriesId = "bpsc-72nd-2026";
      }
    }

    // Ensure ExamSeries exists in DB
    const existingSeries = await prisma.examSeries.findFirst({
      where: {
        OR: [
          { id: targetSeriesId },
          { slug: targetSeriesId }
        ]
      }
    });

    if (existingSeries) {
      targetSeriesId = existingSeries.id;
      await prisma.examSeries.update({
        where: { id: targetSeriesId },
        data: { totalTests: { increment: 1 } }
      });
    } else {
      const createdSeries = await prisma.examSeries.create({
        data: {
          id: targetSeriesId,
          slug: targetSeriesId,
          title: seriesTitle || `${targetSeriesId.replace(/-/g, " ").toUpperCase()} Mock Test Series`,
          examName: category || "Exam",
          category: category || "Civil Services",
          createdById: session.user.id,
          languages: "English, Hindi",
          isPublished: true,
          totalTests: 1,
        }
      });
      targetSeriesId = createdSeries.id;
    }

    // Create the test with sections and questions in a transaction
    const createdTest = await prisma.$transaction(async (tx) => {
      const newTest = await tx.examTest.create({
        data: {
          seriesId: targetSeriesId,
          title,
          titleHi: titleHi || null,
          testType: testType || "FULL_MOCK",
          accessMode: accessMode || "PRO",
          durationMinutes: Number(durationMinutes) || 120,
          totalQuestions: Number(totalQuestions) || (sections?.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0) ?? 0),
          totalMarks: Number(totalMarks) || 150,
          positiveMarks: Number(positiveMarks) || 1.0,
          negativeMarks: Number(negativeMarks) || 0.33,
          instructions: instructions || null,
          isLive: Boolean(isLive),
          liveStartAt: liveStartAt ? new Date(liveStartAt) : null,
          liveEndAt: liveEndAt ? new Date(liveEndAt) : null,
          isPublished: Boolean(isPublished),
          createdById: session.user.id,
        },
      });

      // Create sections and questions if provided
      if (Array.isArray(sections) && sections.length > 0) {
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const sec = sections[sIdx];
          const newSection = await tx.examSection.create({
            data: {
              testId: newTest.id,
              title: sec.title || `Section ${sIdx + 1}`,
              titleHi: sec.titleHi || null,
              order: sIdx + 1,
              positiveMarks: Number(sec.positiveMarks) || 1.0,
              negativeMarks: Number(sec.negativeMarks) || 0.33,
              timeLimitMins: sec.timeLimitMins ? Number(sec.timeLimitMins) : null,
            },
          });

          if (Array.isArray(sec.questions) && sec.questions.length > 0) {
            for (let qIdx = 0; qIdx < sec.questions.length; qIdx++) {
              const q = sec.questions[qIdx];
              await tx.examQuestion.create({
                data: {
                  sectionId: newSection.id,
                  questionType: q.questionType || "MCQ",
                  questionEn: q.questionEn || q.text || `Question ${qIdx + 1}`,
                  questionHi: q.questionHi || null,
                  optionAEn: q.optionAEn || q.options?.[0] || "Option A",
                  optionBEn: q.optionBEn || q.options?.[1] || "Option B",
                  optionCEn: q.optionCEn || q.options?.[2] || "Option C",
                  optionDEn: q.optionDEn || q.options?.[3] || "Option D",
                  optionAHi: q.optionAHi || null,
                  optionBHi: q.optionBHi || null,
                  optionCHi: q.optionCHi || null,
                  optionDHi: q.optionDHi || null,
                  correctOption: q.correctOption || "A",
                  explanationEn: q.explanationEn || null,
                  explanationHi: q.explanationHi || null,
                  videoUrl: q.videoUrl || null,
                  difficulty: q.difficulty || "MODERATE",
                  subject: q.subject || "General Studies",
                  topic: q.topic || null,
                  order: qIdx + 1,
                  positiveMarks: Number(q.positiveMarks) || 1.0,
                  negativeMarks: Number(q.negativeMarks) || 0.33,
                },
              });
            }
          }
        }
      }

      // Update total tests count on series
      await tx.examSeries.update({
        where: { id: targetSeriesId },
        data: { totalTests: { increment: 1 } },
      });

      return newTest;
    });

    return NextResponse.json({
      data: {
        id: createdTest.id,
        title: createdTest.title,
        message: "Test created successfully",
      },
    });
  } catch (error) {
    console.error("[EXAM_TEST_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
