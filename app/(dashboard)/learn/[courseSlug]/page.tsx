import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ courseSlug: string }> }) {
    const { courseSlug } = await params
    const session = await auth()
    const userRole = session?.user?.role
    const userId = session?.user?.id

    const course = await prisma.course.findFirst({
        where: { OR: [{ slug: courseSlug }, { id: courseSlug }] },
        select: { id: true, title: true, status: true, isPublished: true, createdById: true }
    })

    if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
        notFound()
    }

    return { title: course.title }
}

export default async function CourseLandingPage({
    params,
}: {
    params: Promise<{ courseSlug: string }>
}) {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const { courseSlug } = await params
    const userRole = session?.user?.role
    const userId = session?.user?.id

    let course: any = null

    try {
        // Find the course
        course = await prisma.course.findUnique({
            where: { slug: courseSlug },
            include: {
                chapters: {
                    orderBy: { order: "asc" },
                    include: {
                        lessons: {
                            orderBy: { order: "asc" },
                            take: 1,
                        },
                    },
                },
            },
        })
    } catch (err: any) {
        console.warn("Database error on /learn/[courseSlug]:", err?.message)
        course = null
    }

    if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
        notFound()
    }

    // Find the first lesson
    const firstChapter = course.chapters[0]
    const firstLesson = firstChapter?.lessons[0]

    if (!firstLesson) {
        // No lessons yet, redirect back to course detail
        redirect(`/courses/${courseSlug}`)
    }

    // Redirect to the first lesson
    redirect(`/learn/${courseSlug}/${firstLesson.id}`)
}
