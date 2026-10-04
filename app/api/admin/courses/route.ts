import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can create courses" }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      technology = "General Studies",
      difficulty = "BEGINNER",
      description = "Comprehensive video course with chapter-wise syllabus, live video lectures, and PDF study notes.",
      price = 3299,
      originalPrice = 4499,
      discountPercent = 27,
      couponCode = "OFF50",
      couponDiscount = 50,
      expiresAt = "Oct 30, 2026",
      isPremium = true,
      hasTrialLesson = true,
      status = "PUBLISHED",
      firstSectionTitle = "01 Orientation & Syllabus Foundation",
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 })
    }

    // Generate clean slug
    let baseSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    if (!baseSlug) baseSlug = `course-${Date.now()}`

    let slug = baseSlug
    const existing = await prisma.course.findUnique({ where: { slug } })
    if (existing) {
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
    }

    const isPublished = status === "PUBLISHED"

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        technology: technology.trim(),
        difficulty: (difficulty as any) || "BEGINNER",
        price: Number(price) || 0,
        originalPrice: Number(originalPrice) || 0,
        discountPercent: Number(discountPercent) || 0,
        couponCode: couponCode ? couponCode.trim().toUpperCase() : "OFF50",
        couponDiscount: Number(couponDiscount) || 50,
        expiresAt: expiresAt || "Oct 30, 2026",
        hasTrialLesson: Boolean(hasTrialLesson),
        isPremium: Boolean(isPremium),
        status: (status as any) || "PUBLISHED",
        isPublished,
        thumbnailUrl: "/placeholder-course.svg",
        chapters: {
          create: [
            {
              title: firstSectionTitle.trim() || "01 Orientation & Syllabus Foundation",
              order: 1,
            },
          ],
        },
      },
      include: {
        chapters: {
          include: { lessons: true },
        },
      },
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/courses error:", error)
    return NextResponse.json({ error: error.message || "Failed to create course" }, { status: 500 })
  }
}
