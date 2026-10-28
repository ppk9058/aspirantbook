import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invalidateAllExamCaches } from "@/lib/exam-runtime/cache-invalidation";
import { revalidatePath, revalidateTag } from "next/cache";

export async function PATCH(
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
      return NextResponse.json({ error: "Forbidden: Teacher or Admin required" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Test id is required" }, { status: 400 });
    }

    const existingTest = await prisma.examTest.findUnique({
      where: { id },
      include: {
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

    if (role === "TEACHER" && existingTest.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this test" }, { status: 403 });
    }

    const body = await req.json();
    const { isPublished } = body;

    if (typeof isPublished !== "boolean") {
      return NextResponse.json({ error: "isPublished boolean is required" }, { status: 400 });
    }

    // Unpublish safety check: block if attempts exist
    if (!isPublished) {
      if (existingTest._count.attempts > 0) {
        return NextResponse.json(
          {
            error: `Cannot unpublish test: this test has ${existingTest._count.attempts} student attempt(s). Cannot unpublish test with existing attempts.`,
            attemptsCount: existingTest._count.attempts,
          },
          { status: 400 }
        );
      }
    }

    // Publish completeness validation: validate every question
    if (isPublished) {
      const validationErrors: string[] = [];

      if (!existingTest.sections || existingTest.sections.length === 0) {
        validationErrors.push("Test must have at least one section.");
      } else {
        let totalQCount = 0;
        for (let sIdx = 0; sIdx < existingTest.sections.length; sIdx++) {
          const sec = existingTest.sections[sIdx];
          const secTitle = sec.title?.trim() || `Section ${sIdx + 1}`;
          const questions = sec.questions || [];
          totalQCount += questions.length;

          if (questions.length === 0) {
            validationErrors.push(`${secTitle}: Section must contain at least one question.`);
          }

          for (let qIdx = 0; qIdx < questions.length; qIdx++) {
            const q = questions[qIdx];
            const qNum = qIdx + 1;
            const qEn = (q.questionEn || "").trim();
            const optA = (q.optionAEn || "").trim();
            const optB = (q.optionBEn || "").trim();
            const optC = (q.optionCEn || "").trim();
            const optD = (q.optionDEn || "").trim();
            const ansRaw = (q.correctOption || "").trim().toUpperCase();
            const isAnsValid = ["A", "B", "C", "D"].includes(ansRaw);

            if (!qEn) validationErrors.push(`${secTitle}, Question ${qNum}: Question text cannot be empty.`);
            if (!optA) validationErrors.push(`${secTitle}, Question ${qNum}: Option A cannot be empty.`);
            if (!optB) validationErrors.push(`${secTitle}, Question ${qNum}: Option B cannot be empty.`);
            if (!optC) validationErrors.push(`${secTitle}, Question ${qNum}: Option C cannot be empty.`);
            if (!optD) validationErrors.push(`${secTitle}, Question ${qNum}: Option D cannot be empty.`);
            if (!isAnsValid) {
              validationErrors.push(`${secTitle}, Question ${qNum}: Invalid correct answer. Must be A, B, C, or D.`);
            }
          }
        }

        if (totalQCount === 0) {
          validationErrors.push("Test must contain at least one question to be published.");
        }
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot publish test: one or more questions are incomplete (${validationErrors.length} question(s) have errors).`,
            details: validationErrors,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        const test = await tx.examTest.update({
          where: { id },
          data: { isPublished },
        });

        if (!isPublished) {
          // On unpublish: disable hasCbtMode
          await tx.pyqPaper.updateMany({
            where: { cbtTestId: id },
            data: { hasCbtMode: false },
          });

          // If was published and has series: decrement totalTests
          if (existingTest.isPublished && existingTest.seriesId) {
            await tx.examSeries.update({
              where: { id: existingTest.seriesId },
              data: { totalTests: { decrement: 1 } },
            });
          }
        } else {
          // On publish: enable hasCbtMode
          await tx.pyqPaper.updateMany({
            where: { cbtTestId: id },
            data: { hasCbtMode: true },
          });

          // If was draft and has series: increment totalTests
          if (!existingTest.isPublished && existingTest.seriesId) {
            await tx.examSeries.update({
              where: { id: existingTest.seriesId },
              data: { totalTests: { increment: 1 } },
            });
          }
        }

        return test;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    revalidateTag("exam-series");
    revalidatePath("/test-series");
    await invalidateAllExamCaches(id);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        isPublished: updated.isPublished,
      },
    });
  } catch (error: any) {
    console.error("[EXAM_TEST_PATCH_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Forbidden: Teacher or Admin required" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Test id is required" }, { status: 400 });
    }

    const existingTest = await prisma.examTest.findUnique({
      where: { id },
    });

    if (!existingTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (role === "TEACHER" && existingTest.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this test" }, { status: 403 });
    }

    // Block deletion if student attempts exist (cascading attempt wipe protection)
    const attemptsCount = await prisma.examAttempt.count({
      where: { testId: id },
    });

    if (attemptsCount > 0) {
      const url = new URL(req.url);
      const forceDelete = url.searchParams.get("force") === "true";
      if (!forceDelete || role !== "ADMIN") {
        return NextResponse.json(
          {
            error: `Cannot delete test: this test has ${attemptsCount} existing student attempt(s). Deleting it will permanently erase candidate records.`,
            attemptsCount,
          },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // Clear linked PYQ papers
      await tx.pyqPaper.updateMany({
        where: { cbtTestId: id },
        data: { hasCbtMode: false, cbtTestId: null },
      });

      // Delete questions, sections, attempts, and test
      const sections = await tx.examSection.findMany({ where: { testId: id }, select: { id: true } });
      const sectionIds = sections.map((s) => s.id);
      if (sectionIds.length > 0) {
        await tx.examQuestion.deleteMany({ where: { sectionId: { in: sectionIds } } });
      }
      await tx.examSection.deleteMany({ where: { testId: id } });

      const attempts = await tx.examAttempt.findMany({ where: { testId: id }, select: { id: true } });
      const attemptIds = attempts.map((a) => a.id);
      if (attemptIds.length > 0) {
        await tx.examAttemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
        await tx.examAttempt.deleteMany({ where: { id: { in: attemptIds } } });
      }

      await tx.examTest.delete({ where: { id } });

      // Keep ExamSeries.totalTests in sync if published test was deleted
      if (existingTest.isPublished && existingTest.seriesId) {
        await tx.examSeries.update({
          where: { id: existingTest.seriesId },
          data: { totalTests: { decrement: 1 } },
        });
      }
    });

    const { revalidatePath, revalidateTag } = await import("next/cache");
    revalidateTag("exam-series");
    revalidatePath("/test-series");
    await invalidateAllExamCaches(id);

    return NextResponse.json({ success: true, message: "Test deleted successfully" });
  } catch (error: any) {
    console.error("[EXAM_TEST_DELETE_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
