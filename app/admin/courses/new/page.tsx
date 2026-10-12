import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export const dynamic = "force-dynamic"

export default async function NewVideoCoursePage() {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }

    let targetCourseId = ""

    try {
        const uniqueSuffix = Math.random().toString(36).substring(2, 7)
        const initialSlug = `new-video-course-${uniqueSuffix}`

        // Create generalized draft video course with default structure & pricing
        const course = await prisma.course.create({
            data: {
                title: "New Video Course",
                slug: initialSlug,
                description: "Comprehensive video course with chapter-wise syllabus, live video lectures, and PDF study notes.",
                difficulty: "BEGINNER",
                technology: "Skills & Tech",
                price: 3299,
                originalPrice: 4499,
                discountPercent: 27,
                couponCode: "OFF50",
                couponDiscount: 50,
                expiresAt: "Oct 30, 2026",
                hasTrialLesson: true,
                isPremium: true,
                status: "PUBLISHED",
                isPublished: true,
                thumbnailUrl: "/placeholder-course.svg",
                chapters: {
                    create: {
                        title: "01 Orientation & Course Introduction",
                        order: 1,
                    },
                },
            },
        })

        targetCourseId = course.id
    } catch (err: any) {
        console.error("Error creating generalized video course draft:", err.message)
    }

    const basePath = user.role === "TEACHER" ? "/teacher" : "/admin"
    if (targetCourseId) {
        redirect(`${basePath}/courses/${targetCourseId}/edit`)
    } else {
        redirect(`${basePath}/courses`)
    }
}
