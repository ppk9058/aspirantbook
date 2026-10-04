import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get("seriesId");
    const testId = searchParams.get("testId");

    const where: any = {
      userId: session.user.id,
      status: "SUBMITTED",
    };

    if (testId) {
      where.testId = testId;
    } else if (seriesId) {
      where.test = {
        OR: [
          { seriesId },
          { series: { slug: seriesId } },
        ],
      };
    }

    const attempts = await prisma.examAttempt.findMany({
      where,
      select: {
        id: true,
        testId: true,
        status: true,
        score: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: attempts }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/exam/attempt/user-status]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
