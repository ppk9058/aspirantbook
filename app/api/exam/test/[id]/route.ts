import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    const updated = await prisma.$transaction(async (tx) => {
      const test = await tx.examTest.update({
        where: { id },
        data: { isPublished },
      });

      // Update linked PYQ papers
      if (!isPublished) {
        // On unpublish: disable hasCbtMode, retain cbtTestId
        await tx.pyqPaper.updateMany({
          where: { cbtTestId: id },
          data: { hasCbtMode: false },
        });
      } else {
        // On publish: enable hasCbtMode
        await tx.pyqPaper.updateMany({
          where: { cbtTestId: id },
          data: { hasCbtMode: true },
        });
      }

      return test;
    });

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
    });

    return NextResponse.json({ success: true, message: "Test deleted successfully" });
  } catch (error: any) {
    console.error("[EXAM_TEST_DELETE_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
