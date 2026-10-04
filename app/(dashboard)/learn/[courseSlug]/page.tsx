import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"

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
    } catch {
        console.warn("Database offline on /learn/[courseSlug], serving fallback data.")
        course = {
            id: `course-${courseSlug}`,
            title: courseSlug,
            slug: courseSlug,
            chapters: [
                {
                    id: "ch-1",
                    lessons: [{ id: "intro-lesson" }],
                },
            ],
        }
    }

    if (!course) {
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
