import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";
import { z } from "zod";

export interface TestUserStatus {
  testId: string;
  state: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
  inProgressAttemptId?: string;
  deadline?: string;
  latestSubmittedAttemptId?: string;
  attemptCount: number;
  latestScore?: number;
  bestScore?: number;
  totalMarks?: number;
}

const PostBatchSchema = z.object({
  testIds: z.array(z.string().min(1).max(100)).max(100),
});

async function processUserStatus(
  userId: string,
  params: { testId?: string; testIds?: string[]; seriesId?: string }
) {
  const where: any = { userId };

  if (params.testIds && params.testIds.length > 0) {
    where.testId = { in: params.testIds.slice(0, 100) };
  } else if (params.testId) {
    where.testId = params.testId;
  } else if (params.seriesId) {
    where.test = {
      OR: [
        { seriesId: params.seriesId },
        { series: { slug: params.seriesId } },
      ],
    };
  }

  // Single indexed query to fetch all relevant attempts for the user
  const attempts = await prisma.examAttempt.findMany({
    where,
    select: {
      id: true,
      testId: true,
      status: true,
      score: true,
      totalMarks: true,
      startedAt: true,
      submittedAt: true,
      test: {
        select: {
          id: true,
          durationMinutes: true,
          totalMarks: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const nowMs = Date.now();
  const statusMap: Record<string, TestUserStatus> = {};
  const processedAttempts: any[] = [];

  // Group by testId and determine authoritative state
  const attemptsByTest: Record<string, typeof attempts> = {};
  for (const att of attempts) {
    if (!attemptsByTest[att.testId]) {
      attemptsByTest[att.testId] = [];
    }
    attemptsByTest[att.testId].push(att);
  }

  for (const [tId, tAttempts] of Object.entries(attemptsByTest)) {
    let state: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" = "NOT_STARTED";
    let inProgressAttemptId: string | undefined;
    let deadlineIso: string | undefined;
    let latestSubmittedAttemptId: string | undefined;
    let latestScore: number | undefined;
    let bestScore: number | undefined;
    let totalMarks: number = 0;
    let attemptCount = 0;

    for (const att of tAttempts) {
      totalMarks = att.test.totalMarks;

      if (att.status === "IN_PROGRESS") {
        const durationMins = att.test.durationMinutes;
        const deadlineMs = att.startedAt.getTime() + durationMins * 60 * 1000;
        const graceMs = deadlineMs + 30 * 1000;

        if (nowMs > graceMs) {
          // Lazy finalize expired in-progress attempt
          try {
            await gradeExamAttempt(att.id, new Date());
            att.status = "SUBMITTED";
            att.submittedAt = new Date();
          } catch (err) {
            console.warn(`[user-status] Lazy grading failed for attempt ${att.id}:`, err);
          }
        } else {
          // Valid active attempt
          state = "IN_PROGRESS";
          inProgressAttemptId = att.id;
          deadlineIso = new Date(deadlineMs).toISOString();
        }
      }

      if (att.status === "SUBMITTED" || (att as any).status === "TIMED_OUT") {
        attemptCount++;
        if (!latestSubmittedAttemptId) {
          latestSubmittedAttemptId = att.id;
          latestScore = att.score;
        }
        if (bestScore === undefined || (att.score !== null && att.score > bestScore)) {
          bestScore = att.score;
        }
      }

      processedAttempts.push({
        id: att.id,
        testId: att.testId,
        status: att.status,
        score: att.score,
        submittedAt: att.submittedAt,
      });
    }

    if (state !== "IN_PROGRESS" && attemptCount > 0) {
      state = "SUBMITTED";
    }

    statusMap[tId] = {
      testId: tId,
      state,
      inProgressAttemptId,
      deadline: deadlineIso,
      latestSubmittedAttemptId,
      attemptCount,
      latestScore,
      bestScore,
      totalMarks,
    };
  }

  return {
    statusMap,
    attempts: processedAttempts,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, data: {}, attempts: [] }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get("seriesId") || undefined;
    const testId = searchParams.get("testId") || undefined;
    const testIdsParam = searchParams.get("testIds");

    const testIds = testIdsParam
      ? testIdsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100)
      : undefined;

    const { statusMap, attempts } = await processUserStatus(session.user.id, {
      seriesId,
      testId,
      testIds,
    });

    return NextResponse.json({
      success: true,
      data: statusMap,
      attempts,
    }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[GET /api/exam/attempt/user-status]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, data: {}, attempts: [] }, { status: 200 });
    }

    const body = await req.json().catch(() => null);
    const parseRes = PostBatchSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json(
        { success: false, error: "Invalid testIds payload. Must be an array of up to 100 IDs." },
        { status: 400 }
      );
    }

    const { statusMap, attempts } = await processUserStatus(session.user.id, {
      testIds: parseRes.data.testIds,
    });

    return NextResponse.json({
      success: true,
      data: statusMap,
      attempts,
    }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[POST /api/exam/attempt/user-status]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
