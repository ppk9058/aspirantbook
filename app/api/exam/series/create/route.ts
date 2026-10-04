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
      title,
      slug: rawSlug,
      category = "UPSC",
      examName,
      logoType = "general",
      users = "12.5k",
      totalTests = 10,
      freeTests = 2,
      languages = "English, Hindi",
      highlights = [],
      moreTestsCount = 5,
      description = "",
      isPublished = true,
      isPro = true,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const slug = (rawSlug || title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const metadataObj = {
      description,
      highlights: Array.isArray(highlights) && highlights.length > 0 ? highlights : [
        "Full Length Simulated Mock Tests",
        "Subject-Wise Sectional Tests",
        "Official Previous Year Papers",
        "Weekly Live All-India Ranking"
      ],
      logoType,
      users,
      moreTestsCount: Number(moreTestsCount) || 5,
    };

    // Upsert or create series
    const series = await prisma.examSeries.upsert({
      where: { slug },
      update: {
        title: title.trim(),
        category,
        examName: examName || category,
        description: JSON.stringify(metadataObj),
        totalTests: Number(totalTests) || 0,
        freeTests: Number(freeTests) || 0,
        languages,
        isPublished: Boolean(isPublished),
        isPro: Boolean(isPro),
      },
      create: {
        id: slug,
        slug,
        title: title.trim(),
        category,
        examName: examName || category,
        description: JSON.stringify(metadataObj),
        totalTests: Number(totalTests) || 0,
        freeTests: Number(freeTests) || 0,
        languages,
        isPublished: Boolean(isPublished),
        isPro: Boolean(isPro),
        createdById: session.user.id,
      },
    });

    const formattedItem = {
      id: series.slug,
      title: series.title,
      category: series.category,
      examType: "Civil Services",
      logoType,
      users,
      totalTests: series.totalTests,
      freeTests: series.freeTests,
      languages: series.languages,
      highlights: metadataObj.highlights,
      moreTestsCount: metadataObj.moreTestsCount,
      description,
      goalId: category.toLowerCase().replace(/\s+/g, "-"),
      tags: [category.toLowerCase()],
    };

    return NextResponse.json({ success: true, data: formattedItem });
  } catch (error: any) {
    console.error("Failed to create ExamSeries:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
