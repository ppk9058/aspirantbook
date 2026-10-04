import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
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

    const { testId } = await params;
    if (!testId) {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    const test = await prisma.examTest.findUnique({
      where: { id: testId },
      include: {
        series: {
          select: { id: true, title: true, slug: true },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
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
                order: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (role === "TEACHER" && test.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only access tests you created" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: { test } }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/exam/teacher/:testId/questions]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
