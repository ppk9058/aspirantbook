import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTestRankings } from "@/lib/exam-ranking";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId } = await params;
    if (!testId || typeof testId !== "string") {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    // Search & Filter params
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    // Fetch test details
    const test = await prisma.examTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        totalMarks: true,
        totalQuestions: true,
        durationMinutes: true,
        isPublished: true,
        createdById: true,
        series: { select: { title: true, examName: true } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (!test.isPublished) {
      const isCreator = test.createdById === session.user.id;
      const isAdmin = (session.user as any).role === "ADMIN";
      if (!isCreator && !isAdmin) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }
    }

    // Fetch deduplicated qualifying rankings using canonical ranking helper
    const { totalCandidates, rankedAttempts } = await getTestRankings(testId);

    const rankList = rankedAttempts.map((a) => ({
      id: a.userId,
      userId: a.userId,
      attemptId: a.attemptId,
      name: a.name,
      avatar: a.avatar,
      score: a.score,
      rank: a.rank,
      correct: a.correctCount,
      wrong: a.wrongCount,
      timeSecs: a.timeTakenSecs,
      percentile: a.percentile,
      accuracy: a.accuracy,
      isCurrentUser: a.userId === session.user.id,
    }));

    // Filter by search if requested
    let filtered = rankList;
    if (search) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Identify current user rank
    let currentUserRank = null;
    const myAttempt = rankList.find((r) => r.isCurrentUser);
    if (myAttempt) {
      currentUserRank = myAttempt;
    }

    // Real score distribution buckets (calculated across deduped candidates)
    const totalMarks = test.totalMarks;
    const step = Math.max(1, Math.round(totalMarks / 5));
    const buckets = [
      { min: 0, max: step, label: `0-${step}`, count: 0 },
      { min: step, max: step * 2, label: `${step}-${step * 2}`, count: 0 },
      { min: step * 2, max: step * 3, label: `${step * 2}-${step * 3}`, count: 0 },
      { min: step * 3, max: step * 4, label: `${step * 3}-${step * 4}`, count: 0 },
      { min: step * 4, max: totalMarks, label: `${step * 4}-${totalMarks}`, count: 0 },
    ];
    for (const a of rankedAttempts) {
      const s = a.score || 0;
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (s >= buckets[i].min || i === 0) {
          buckets[i].count++;
          break;
        }
      }
    }
    const marksDistribution = buckets.map((b) => ({ range: b.label, count: b.count }));

    return NextResponse.json({
      data: {
        testTitle: test.title,
        totalCandidates,
        toppers: rankList.slice(0, 3),
        leaderboard: filtered,
        currentUserRank,
        marksDistribution,
      },
    });
  } catch (error) {
    console.error("[EXAM_LEADERBOARD_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
