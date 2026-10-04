import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

const getCachedSeriesList = unstable_cache(
  async (category: string | null) => {
    const where: any = { isPublished: true };
    if (category && category !== "All") {
      where.category = { equals: category, mode: "insensitive" };
    }
    return await prisma.examSeries.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },
  ["exam-series-list-catalog"],
  { revalidate: 60, tags: ["exam-series"] }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let seriesList: any[];
    try {
      seriesList = await getCachedSeriesList(category);
    } catch (cacheErr) {
      const where: any = { isPublished: true };
      if (category && category !== "All") {
        where.category = { equals: category, mode: "insensitive" };
      }
      seriesList = await prisma.examSeries.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }

    const formatted = seriesList.map((s) => {
      let meta: any = {};
      try {
        if (s.description && s.description.startsWith("{")) {
          meta = JSON.parse(s.description);
        }
      } catch (e) {}

      return {
        id: s.slug || s.id,
        title: s.title,
        category: s.category,
        examType: "Civil Services",
        logoType: meta.logoType || (s.slug.includes("upsc") ? "upsc" : s.slug.includes("bpsc") ? "bpsc" : "general"),
        users: meta.users || (s.usersCount > 0 ? `${(s.usersCount / 1000).toFixed(1)}k` : "12.5k"),
        totalTests: s.totalTests || 10,
        freeTests: s.freeTests || 2,
        languages: s.languages || "English, Hindi",
        highlights: Array.isArray(meta.highlights) && meta.highlights.length > 0
          ? meta.highlights
          : [
              "Full Length Simulated Mock Tests",
              "Subject-Wise Sectional Tests",
              "Official Previous Year Papers",
              "Weekly All-India Live Ranking"
            ],
        moreTestsCount: meta.moreTestsCount || 10,
        description: meta.description || s.description || "",
        goalId: s.category.toLowerCase().replace(/\s+/g, "-"),
        tags: [s.category.toLowerCase()],
      };
    });

    return NextResponse.json(
      { success: true, data: formatted },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to list ExamSeries:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
