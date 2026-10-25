import React, { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, permanentRedirect } from "next/navigation"
import { CourseDetailView } from "./CourseDetailView"
import { CourseBundleView } from "@/components/course/CourseBundleView"
import { CourseComingSoonView } from "@/components/course/CourseComingSoonView"
import { getCourseCustomMetadata } from "@/lib/services/course-metadata-service"
import { getBatchBySlug } from "@/lib/batches-service"
import { findBatchBySlugOrId } from "@/components/home/homepage-courses.data"
import { unstable_cache } from "next/cache"
import { toSafeCourseDto } from "@/lib/courses/course-dto"
import { isCourseVisibleToUser, isCourseDetailReady } from "@/lib/courses/visibility"
import { ALL_GOAL_COURSES } from "@/lib/goal-courses-data"
import { AlertCircle } from "lucide-react"
import { getBaseUrl } from "@/lib/seo/core"

export const dynamic = "force-dynamic"

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const session = await auth()
    const userRole = session?.user?.role
    const userId = session?.user?.id

    const course = await prisma.course.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        select: { id: true, slug: true, title: true, description: true, status: true, isPublished: true }
    })

    if (!course) {
        const staticCourse = ALL_GOAL_COURSES.find((c) => c.slug === slug || c.id === slug)
        if (staticCourse) {
            return {
                title: staticCourse.title,
                description: staticCourse.description,
            }
        }
        notFound()
    }

    if (!isCourseVisibleToUser(course, userRole, userId)) {
        notFound()
    }

    return {
        title: `${course.title} | aspirantbook`,
        description: course.description || `Enroll in ${course.title} on aspirantbook`,
        alternates: {
            canonical: `/courses/${course.slug || slug}`,
        },
        openGraph: {
            title: `${course.title} | aspirantbook`,
            description: course.description || `Enroll in ${course.title} on aspirantbook`,
            type: "website",
            url: `/courses/${course.slug || slug}`,
        },
    }
}

export default async function CourseDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
    const { slug } = await params

    // Fetch session, course, and batch concurrently in parallel
    const [session, rawCachedCourse, batch] = await Promise.all([
        auth(),
        prisma.course.findFirst({
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
        }).catch((err: any) => {
            console.warn("Error fetching course:", err)
            return null
        }),
        getBatchBySlug(slug),
    ])

    const cachedCourse = rawCachedCourse
    if (cachedCourse) {
        // Detect if this course is a tutorial (e.g. format: tutorial in metadataJson or externalId set)
        let isTutorialCourse = Boolean(cachedCourse.externalId)
        if (cachedCourse.metadataJson) {
            try {
                const parsed = JSON.parse(cachedCourse.metadataJson)
                if (parsed.format === "tutorial" || parsed.meta?.format === "tutorial" || parsed.type === "TUTORIAL") {
                    isTutorialCourse = true
                }
            } catch {}
        }
        if (isTutorialCourse) {
            const sp = searchParams ? await searchParams : {}
            const searchParamsObj = new URLSearchParams()
            if (sp) {
                for (const [key, val] of Object.entries(sp)) {
                    if (Array.isArray(val)) {
                        val.forEach((v) => searchParamsObj.append(key, v))
                    } else if (typeof val === "string") {
                        searchParamsObj.set(key, val)
                    }
                }
            }
            const qs = searchParamsObj.toString()
            const targetUrl = `/tutorials/${cachedCourse.slug || cachedCourse.id}${qs ? `?${qs}` : ""}`
            permanentRedirect(targetUrl)
        }

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

    // If the course does not exist in the database, check static catalog before 404
    if (!cachedCourse) {
        const staticCourse = ALL_GOAL_COURSES.find((c) => c.slug === slug || c.id === slug)
        if (staticCourse) {
            return (
                <CourseComingSoonView
                    slug={staticCourse.slug}
                    title={staticCourse.title}
                    classTag={staticCourse.category || "Video Course"}
                    targetText={staticCourse.description}
                    scheduleText={staticCourse.duration}
                    price={staticCourse.isPremium ? "Premium Batch" : "Free Access"}
                    image={staticCourse.thumbnailUrl}
                />
            )
        }
        notFound()
    }

    const course = cachedCourse

    const userId = session?.user?.id

    if (!isCourseVisibleToUser(course, userRole, userId)) {
        notFound()
    }

    const isDraft = course.status !== "PUBLISHED" || course.isPublished === false
    const draftBanner = isDraft && (userRole === "ADMIN" || isEditor) ? (
        <div className="bg-amber-500 text-black px-4 py-2 font-semibold text-center text-sm flex items-center justify-center gap-2 sticky top-0 z-50">
            <AlertCircle className="w-4 h-4" />
            <span>Draft Course Preview &mdash; Only visible to Course Creator / Administrators</span>
        </div>
    ) : null

    // If course is visible (published) but has no chapters/lessons ready yet, render Coming Soon
    const isReady = isCourseDetailReady(course)
    if (!isReady) {
        return (
            <>
                {draftBanner}
                <CourseComingSoonView
                    slug={course.slug || course.id}
                    title={course.title}
                    classTag={course.technology || (batch as any)?.classTag || "Video Course"}
                    targetText={course.description || (batch as any)?.targetText}
                    scheduleText={(batch as any)?.scheduleText}
                    price={course.price ? `₹${course.price}` : undefined}
                    image={course.thumbnailUrl || undefined}
                />
            </>
        )
    }

    let isEnrolled = false
    let hasAccess = false
    let progress = 0

    const isPaidCourse = Boolean(course.isPremium || (course.price && course.price > 0))

    if (session?.user?.id) {
        try {
            if (isEditor || !isPaidCourse) {
                hasAccess = true
            }

            const allLessonIds = course.chapters?.flatMap((c: any) => c.lessons?.map((l: any) => l.id) || []) || []

            const [subCheck, enrollment, completedProgress] = await Promise.all([
                (!isEditor && isPaidCourse)
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
            if (isEnrolled) hasAccess = true
            if (allLessonIds.length > 0) {
                progress = Math.round((completedProgress / allLessonIds.length) * 100)
            }
        } catch (e) {
            console.warn("Failed to check user enrollment on /courses/[slug]:", e)
            hasAccess = isEditor || !isPaidCourse
            isEnrolled = false
            progress = 0
        }
    }

    const totalLessons = course.chapters?.reduce(
        (acc: number, ch: any) => acc + (ch.lessons?.length || 0),
        0
    ) || 0

    // On course overview page, do not leak raw video URLs or attachment URLs for unpaid/anonymous visitors
    const safeCourse = toSafeCourseDto(course, hasAccess, hasAccess)

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
            <>
                {draftBanner}
                <CourseBundleView
                    course={safeCourse as any}
                    batch={effectiveBatch as any}
                    userRole={userRole}
                    isEnrolled={isEnrolled}
                    hasAccess={hasAccess}
                />
            </>
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

    const courseJsonLd = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": course.title,
        "description": course.description || undefined,
        "provider": {
            "@type": "Organization",
            "name": "TrillionSkill",
            ...(getBaseUrl() ? { "sameAs": getBaseUrl() } : {}),
        },
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
            />
            {draftBanner}
            <CourseDetailView
                initialCourse={safeCourse as any}
                initialMetadata={initialMetadata}
                isEnrolled={isEnrolled}
                hasAccess={hasAccess}
                progress={progress}
                isEditor={isEditor}
            />
        </>
    )
}
