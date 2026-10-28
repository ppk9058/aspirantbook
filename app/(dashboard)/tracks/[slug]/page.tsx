import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { LearningPath, type LearningPathCourse } from "@/components/track/LearningPath"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, ListChecks } from "lucide-react"

interface TrackDetailPageProps {
    params: Promise<{
        slug: string
    }>
}

/**
 * Phase D: this page advertised a hardcoded "~20 Hours" and a "Certificate" that
 * no feature issues, and the learning path was fed no progress at all
 * (`LearningPath` hardcoded `isCompleted = false`). Both are read from real rows
 * now: lesson counts come from the course outline and completion from the
 * viewer's Progress/Enrollment records.
 */
export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
    const { slug } = await params
    const [track, session] = await Promise.all([
        prisma.track.findUnique({
            where: { slug: slug, isPublished: true },
            include: {
                courses: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                slug: true,
                                title: true,
                                description: true,
                                chapters: {
                                    select: {
                                        id: true,
                                        lessons: { select: { id: true } },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        }),
        auth(),
    ])

    if (!track) {
        notFound()
    }

    const userId = session?.user?.id
    const courseIds = track.courses.map((entry) => entry.course.id)

    const [progressRows, enrollments] = userId
        ? await Promise.all([
              prisma.progress.findMany({
                  where: {
                      userId,
                      completed: true,
                      lesson: { chapter: { courseId: { in: courseIds } } },
                  },
                  select: {
                      lesson: {
                          select: { chapter: { select: { courseId: true } } },
                      },
                  },
              }),
              prisma.enrollment.findMany({
                  where: { userId, courseId: { in: courseIds } },
                  select: { courseId: true, completedAt: true },
              }),
          ])
        : [[], []]

    const completedByCourse = new Map<string, number>()
    for (const row of progressRows) {
        const courseId = row.lesson?.chapter?.courseId
        if (!courseId) continue
        completedByCourse.set(courseId, (completedByCourse.get(courseId) ?? 0) + 1)
    }
    const completedEnrollments = new Set(
        enrollments.filter((e) => e.completedAt).map((e) => e.courseId)
    )

    const courses: LearningPathCourse[] = track.courses.map((entry) => {
        const totalLessons = entry.course.chapters.reduce(
            (sum, chapter) => sum + chapter.lessons.length,
            0
        )
        const completedLessons = completedEnrollments.has(entry.course.id)
            ? totalLessons
            : completedByCourse.get(entry.course.id) ?? 0

        return {
            id: entry.id,
            isRequired: entry.isRequired,
            totalLessons,
            completedLessons: Math.min(completedLessons, totalLessons),
            course: {
                id: entry.course.id,
                slug: entry.course.slug,
                title: entry.course.title,
                description: entry.course.description,
            },
        }
    })

    const totalLessons = courses.reduce((sum, c) => sum + c.totalLessons, 0)
    const completedLessons = courses.reduce(
        (sum, c) => sum + Math.min(c.completedLessons, c.totalLessons),
        0
    )

    return (
        <div className="container py-8 max-w-4xl">
            <div className="mb-12 text-center">
                <div className="flex justify-center mb-4">
                    <Badge variant={track.type === "CAREER" ? "default" : "secondary"} className="text-lg px-4 py-1">
                        {track.type === "CAREER" ? "Career Track" : "Skill Track"}
                    </Badge>
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-4">{track.title}</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    {track.description}
                </p>

                <div className="flex flex-wrap justify-center gap-8 mt-8 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        <span className="font-medium">
                            {courses.length} {courses.length === 1 ? "Course" : "Courses"}
                        </span>
                    </div>
                    <div
                        className="flex items-center gap-2"
                        data-testid="track-lesson-count"
                    >
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">
                            {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2" data-testid="track-completion">
                        <ListChecks className="h-5 w-5" />
                        <span className="font-medium">
                            {completedLessons} of {totalLessons} completed
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-8 text-center">Your Learning Path</h2>
                {courses.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                        This track has no published courses yet.
                    </p>
                ) : (
                    <LearningPath courses={courses} />
                )}
            </div>
        </div>
    )
}
