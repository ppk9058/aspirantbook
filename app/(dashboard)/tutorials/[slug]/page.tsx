import React from "react"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"
import { auth } from "@/auth"
import { AspirantbookTutorialView } from "@/components/editor/AspirantbookTutorialView"

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

export default async function TutorialSlugPage({
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

    return (
        <AspirantbookTutorialView
            course={course as any}
            chapters={course.chapters as any}
            isEditor={isEditor}
        />
    )
}

