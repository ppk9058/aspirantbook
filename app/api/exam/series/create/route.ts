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
      category,
      examName,
      logoType = "general",
      languages = "English, Hindi",
      highlights = [],
      description = "",
      isPublished = true,
      isPro = true,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const slug = (rawSlug || title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const cleanHighlights = Array.isArray(highlights)
      ? highlights.map((h: any) => String(h).trim()).filter((h: string) => h.length > 0)
      : [];

    const cleanDescription = description && typeof description === "string" ? description.trim() : null;

    // Upsert or create series with real columns
    const series = await prisma.examSeries.upsert({
      where: { slug },
      update: {
        title: title.trim(),
        category: category.trim(),
        examName: examName || category.trim(),
        description: cleanDescription,
        logoType: logoType || "general",
        highlights: cleanHighlights,
        languages: languages || "English, Hindi",
        isPublished: Boolean(isPublished),
        isPro: Boolean(isPro),
      },
      create: {
        id: slug,
        slug,
        title: title.trim(),
        category: category.trim(),
        examName: examName || category.trim(),
        description: cleanDescription,
        logoType: logoType || "general",
        highlights: cleanHighlights,
        totalTests: 0,
        freeTests: 0,
        usersCount: 0,
        languages: languages || "English, Hindi",
        isPublished: Boolean(isPublished),
        isPro: Boolean(isPro),
        createdById: session.user.id,
      },
    });

    const formattedItem = {
      id: series.slug,
      slug: series.slug,
      title: series.title,
      category: series.category,
      examName: series.examName,
      examType: "Civil Services",
      logoType: series.logoType || "general",
      users: `${series.usersCount || 0}`,
      totalTests: series.totalTests || 0,
      freeTests: series.freeTests || 0,
      languages: series.languages,
      highlights: series.highlights || [],
      description: series.description || "",
      goalId: series.category.toLowerCase().replace(/\s+/g, "-"),
      tags: [series.category.toLowerCase()],
      isFree: series.isFree ?? false,
      isPro: series.isPro ?? false,
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
