import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Fetch all submitted attempts for this test
    const attempts = await prisma.examAttempt.findMany({
      where: {
        testId,
        status: "SUBMITTED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [
        { score: "desc" },
        { timeTakenSecs: "asc" },
      ],
      take: 100,
    });

    const totalCandidates = attempts.length;
    const rankList = attempts.map((a, idx) => ({
      name: a.user.name || "Candidate",
      avatar: a.user.image,
      score: a.score,
      rank: idx + 1,
      correct: a.correctCount,
      wrong: a.wrongCount,
      timeSecs: a.timeTakenSecs,
      percentile:
        a.percentile ??
        (totalCandidates > 0
          ? Math.round(((totalCandidates - idx) / totalCandidates) * 100)
          : 0),
      accuracy: Math.round(
        (a.correctCount / Math.max(1, a.correctCount + a.wrongCount)) * 100
      ),
      isCurrentUser: a.user.id === session.user.id,
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

    // Real score distribution buckets
    const totalMarks = test.totalMarks || 100;
    const step = Math.max(1, Math.round(totalMarks / 5));
    const buckets = [
      { min: 0, max: step, label: `0-${step}`, count: 0 },
      { min: step, max: step * 2, label: `${step}-${step * 2}`, count: 0 },
      { min: step * 2, max: step * 3, label: `${step * 2}-${step * 3}`, count: 0 },
      { min: step * 3, max: step * 4, label: `${step * 3}-${step * 4}`, count: 0 },
      { min: step * 4, max: totalMarks, label: `${step * 4}-${totalMarks}`, count: 0 },
    ];
    for (const a of attempts) {
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
