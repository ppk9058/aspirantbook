import React from "react"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"
import { auth } from "@/auth"
import { AspirantbookTutorialView } from "@/components/editor/AspirantbookTutorialView"
import { toSafeCourseDto } from "@/lib/courses/course-dto"

export const dynamic = "force-dynamic"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const session = await auth()
    const userRole = session?.user?.role
    const userId = session?.user?.id

    const course = await prisma.course.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        select: { id: true, title: true, description: true, status: true, isPublished: true },
    })

    if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
        notFound()
    }

    return {
        title: course.title,
        description: course.description,
    }
}

import { headers } from "next/headers"
import { resolveAccess } from "@/lib/authwall/resolveAccess"
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify"

export default async function TutorialSlugPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const session = await auth()
    const userRole = session?.user?.role
    const userId = session?.user?.id
    const headersList = await headers()
    const isBot = await isVerifiedSearchEngineCrawler(headersList)

    const course = await prisma.course.findFirst({
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
                            order: true,
                            content: true,
                            duration: true,
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

    if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
        notFound()
    }

    for (const ch of course.chapters || []) {
        for (const l of ch.lessons || []) {
            if ((!l.content || l.content.length === 0) && (l as any).versions?.[0]?.blocks) {
                l.content = JSON.stringify((l as any).versions[0].blocks)
            }
        }
    }

    const isEditor = userRole === "ADMIN" || userRole === "TEACHER"
    const isPaidCourse = Boolean(course.isPremium || (course.price && course.price > 0))

    let hasAccess = false
    if (session?.user?.id) {
        if (isEditor || !isPaidCourse) {
            hasAccess = true
        } else {
            try {
                const [subCheck, enrollment] = await Promise.all([
                    prisma.subscription.findFirst({
                        where: {
                            userId: session.user.id,
                            status: "ACTIVE",
                            endDate: { gte: new Date() },
                        },
                        select: { id: true },
                    }),
                    prisma.enrollment.findUnique({
                        where: {
                            userId_courseId: {
                                userId: session.user.id,
                                courseId: course.id,
                            },
                        },
                        select: { id: true },
                    }),
                ])
                if (subCheck || enrollment) {
                    hasAccess = true
                }
            } catch (e) {
                console.warn("Failed checking tutorial user enrollment:", e)
                hasAccess = isEditor || !isPaidCourse
            }
        }
    } else {
        hasAccess = !isPaidCourse
    }

    // Apply Server-Side Slicing via Centralized resolveAccess
    const viewer = {
        userId: session?.user?.id || null,
        role: userRole || null,
        isVerifiedBot: isBot,
    }

    for (const ch of course.chapters || []) {
        for (const l of ch.lessons || []) {
            const access = resolveAccess({
                viewer,
                content: l.content,
                containerGate: course,
                itemGate: {
                    gateMode: (ch as any).gateMode,
                    previewPercentage: (ch as any).previewPercentage,
                },
                isOwner: (course as any).createdById === userId || (course as any).userId === userId,
            })

            if (access.isLockedForGuest) {
                if (typeof l.content === "string" && l.content.trim().startsWith("{")) {
                    l.content = JSON.stringify({ blocks: access.previewBlocks })
                } else if (typeof l.content === "string" && l.content.trim().startsWith("[")) {
                    l.content = JSON.stringify(access.previewBlocks)
                } else {
                    l.content = access.previewBlocks
                        .map((b) => (typeof b === "string" ? b : b.html || b.content || ""))
                        .join("\n")
                }
                ;(l as any).isLockedForGuest = true
                ;(l as any).gateTitle = access.gateTitle
                ;(l as any).gateSubtitle = access.gateSubtitle
                ;(l as any).effectivePercentage = access.effectivePercentage
            }
        }
    }

    const safeCourse = toSafeCourseDto(course, hasAccess, hasAccess)

    // Paywalled schema.org metadata for search crawlers
    const jsonLd = course.isGated
        ? {
              "@context": "https://schema.org",
              "@type": "TechArticle",
              headline: course.title,
              description: course.description,
              isAccessibleForFree: false,
              hasPart: {
                  "@type": "WebPageElement",
                  isAccessibleForFree: false,
                  cssSelector: "[role='region'][aria-label='Content Gate']",
              },
          }
        : null

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <AspirantbookTutorialView
                course={safeCourse as any}
                chapters={safeCourse.chapters as any}
                isEditor={isEditor}
            />
        </>
    )
}

