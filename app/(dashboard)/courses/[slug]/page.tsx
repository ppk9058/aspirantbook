import React, { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { CourseDetailView } from "./CourseDetailView"
import { CourseBundleView } from "@/components/course/CourseBundleView"
import { CourseComingSoonView } from "@/components/course/CourseComingSoonView"
import { getCourseCustomMetadata } from "@/lib/services/course-metadata-service"
import { getBatchBySlug } from "@/lib/batches-service"
import { findBatchBySlugOrId } from "@/components/home/homepage-courses.data"
import { unstable_cache } from "next/cache"

const getCachedCourseBySlug = unstable_cache(
    async (slug: string) => {
        return prisma.course.findFirst({
            where: { OR: [{ slug }, { id: slug }] },
            include: {
                chapters: {
                    orderBy: { order: "asc" },
                    include: {
                        lessons: {
                            orderBy: { order: "asc" },
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                duration: true,
                                order: true,
                                content: true,
                                videoUrl: true,
                                isTrial: true,
                                attachmentType: true,
                                attachmentName: true,
                                attachmentUrl: true,
                                durationText: true,
                                versions: {
                                    orderBy: { createdAt: "desc" },
                                    take: 1,
                                    select: { blocks: true },
                                },
                            },
                        },
                    },
                },
            },
        })
    },
    ["course-by-slug-cache"],
    { revalidate: 60, tags: ["courses"] }
)

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    // Fetch session, course, and batch concurrently in parallel
    const [session, rawCachedCourse, batch] = await Promise.all([
        auth(),
        getCachedCourseBySlug(slug).catch((err) => {
            console.warn("Error fetching cached course:", err)
            return null
        }),
        getBatchBySlug(slug),
    ])

    const cachedCourse = rawCachedCourse
    if (cachedCourse) {
        for (const ch of cachedCourse.chapters || []) {
            for (const l of ch.lessons || []) {
                if ((!l.content || l.content.length === 0) && (l as any).versions?.[0]?.blocks) {
                    l.content = JSON.stringify((l as any).versions[0].blocks)
                }
            }
        }
    }

    const userRole = session?.user?.role
    const isEditor = userRole === "ADMIN" || userRole === "TEACHER"

    // If the course does not exist in the database:
    // DO NOT redirect to text tutorial! Render Coming Soon page for the video course.
    if (!cachedCourse) {
        const cardInfo = findBatchBySlugOrId(slug) || batch
        const title =
            cardInfo?.title ||
            slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

        return (
            <CourseComingSoonView
                slug={slug}
                title={title}
                classTag={cardInfo?.classTag || "Video Course"}
                targetText={cardInfo?.targetText || "This video course is coming soon."}
                scheduleText={cardInfo?.scheduleText}
                price={cardInfo?.price || "Coming Soon"}
                image={cardInfo?.image}
                language={cardInfo?.language || "HINGLISH"}
            />
        )
    }

    const course = cachedCourse

    if (course.status !== "PUBLISHED" && !isEditor) {
        notFound()
    }

    let isEnrolled = false
    let hasAccess = false
    let progress = 0

    if (session?.user?.id) {
        try {
            if (isEditor || !course.isPremium) {
                hasAccess = true
            }

            const allLessonIds = course.chapters?.flatMap((c: any) => c.lessons?.map((l: any) => l.id) || []) || []

            const [subCheck, enrollment, completedProgress] = await Promise.all([
                (!isEditor && course.isPremium)
                    ? prisma.subscription.findFirst({
                          where: {
                              userId: session.user.id,
                              status: "ACTIVE",
                              endDate: { gte: new Date() },
                          },
                          select: { id: true },
                      })
                    : Promise.resolve(null),

                prisma.enrollment.findUnique({
                    where: {
                        userId_courseId: {
                            userId: session.user.id,
                            courseId: course.id,
                        },
                    },
                    select: { id: true },
                }),

                allLessonIds.length > 0
                    ? prisma.progress.count({
                          where: {
                              userId: session.user.id,
                              lessonId: { in: allLessonIds },
                              completed: true,
                          },
                      })
                    : Promise.resolve(0),
            ])

            if (subCheck) hasAccess = true
            isEnrolled = !!enrollment
            if (allLessonIds.length > 0) {
                progress = Math.round((completedProgress / allLessonIds.length) * 100)
            }
        } catch (e) {
            console.warn("Failed to check user enrollment on /courses/[slug]:", e)
            hasAccess = isEditor || !course.isPremium
            isEnrolled = false
            progress = 0
        }
    }

    const totalLessons = course.chapters?.reduce(
        (acc: number, ch: any) => acc + (ch.lessons?.length || 0),
        0
    ) || 0

    // If course is a video course bundle with pricing/attachments or video lessons
    const isVideoBundle =
        Boolean(course.price && course.price > 0) ||
        course.slug.includes("bpsc") ||
        course.chapters?.some((c: any) =>
            c.lessons?.some((l: any) => Boolean(l.videoUrl) || l.type === "VIDEO" || l.attachmentType || l.attachmentName)
        )

    if (isVideoBundle) {
        let parsedMetadata: any = null
        if (course.metadataJson) {
            try {
                parsedMetadata = JSON.parse(course.metadataJson)
            } catch (e) {
                console.error("Failed to parse course metadataJson:", e)
            }
        }
        const effectiveBatch = {
            ...(batch || {}),
            ...(parsedMetadata || {}),
            teachers: (parsedMetadata?.teachers && parsedMetadata.teachers.length > 0) ? parsedMetadata.teachers : batch?.teachers,
            weeklySchedule: (parsedMetadata?.schedule && parsedMetadata.schedule.length > 0) ? parsedMetadata.schedule : (batch?.weeklySchedule || (batch as any)?.schedule),
            aboutHighlights: (parsedMetadata?.aboutHighlights && parsedMetadata.aboutHighlights.length > 0) ? parsedMetadata.aboutHighlights : batch?.aboutHighlights,
            faqs: (parsedMetadata?.faqs && parsedMetadata.faqs.length > 0) ? parsedMetadata.faqs : batch?.faqs,
            language: parsedMetadata?.language || batch?.language || "HINGLISH",
            classTag: parsedMetadata?.classTag || course.technology || batch?.classTag || "Skills",
        }
        return (
            <CourseBundleView
                course={course}
                batch={effectiveBatch as any}
                userRole={userRole}
                isEnrolled={isEnrolled}
                hasAccess={hasAccess}
            />
        )
    }

    const fallbackProjects = Math.max(1, Math.round(totalLessons * 0.5))
    let initialMetadata = await getCourseCustomMetadata(course.id, fallbackProjects)

    // If metadata file used platform defaults, populate from stored metadataJson if present
    if (course.metadataJson) {
        try {
            const parsed = JSON.parse(course.metadataJson)
            const meta = parsed.meta || parsed
            const importedFeatures = meta.includes || meta.features || parsed.features
            if (Array.isArray(importedFeatures) && importedFeatures.length > 0) {
                initialMetadata = {
                    ...initialMetadata,
                    features: importedFeatures,
                    featuresTitle: meta.featuresTitle || meta.includesTitle || parsed.featuresTitle || initialMetadata.featuresTitle,
                }
            }
            const importedSkills = meta.skills || parsed.skills
            if (Array.isArray(importedSkills) && importedSkills.length > 0) {
                initialMetadata = {
                    ...initialMetadata,
                    skills: importedSkills,
                    skillsTitle: meta.skillsTitle || parsed.skillsTitle || initialMetadata.skillsTitle,
                }
            }
            if (typeof parsed.projectCount === "number" && parsed.projectCount > 0) {
                initialMetadata.projectCount = parsed.projectCount
            }
        } catch {}
    }

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FFFDF9] dark:bg-[#070D1E] animate-pulse" />}>
            <CourseDetailView
                initialCourse={course}
                initialMetadata={initialMetadata}
                isEnrolled={isEnrolled}
                hasAccess={hasAccess}
                progress={progress}
                isEditor={isEditor}
            />
        </Suspense>
    )
}
