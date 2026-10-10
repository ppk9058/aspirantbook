import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { getRecommendedTestSeries } from "@/lib/exam-recommendations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get("seriesId") || undefined;
    const queryUserId = searchParams.get("userId") || undefined;
    const queryGoal = searchParams.get("goal") || undefined;

    const session = await auth();
    const cookieStore = await cookies();
    const cookieGoal = queryGoal || cookieStore.get("trillion_selected_goal")?.value || null;

    // Use session user or explicit queryUserId in test environments
    const userId = session?.user?.id || queryUserId || null;
    const userRole = session?.user?.role || null;

    const recommendations = await getRecommendedTestSeries({
      currentSeriesId: seriesId,
      userId,
      userRole,
      cookieGoal,
      limit: 6,
    });

    return NextResponse.json(
      { success: true, data: recommendations },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to get series recommendations:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
