import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import UserDetailClient from "./UserDetailClient"

export default async function UserDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const user = await prisma.user.findUnique({
        where: { id: id },
        include: {
            payments: {
                orderBy: { createdAt: "desc" },
            },
            subscriptions: {
                include: {
                    payments: {
                        orderBy: { createdAt: "desc" },
                    },
                },
                orderBy: { createdAt: "desc" },
            },
            enrollments: {
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            difficulty: true,
                            thumbnailUrl: true,
                            isPremium: true,
                        },
                    },
                },
                orderBy: { enrolledAt: "desc" },
            },
            progress: {
                include: {
                    lesson: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                        },
                    },
                },
                orderBy: { lastAccessed: "desc" },
                take: 10,
            },
            achievements: {
                include: {
                    achievement: true,
                },
                orderBy: { unlockedAt: "desc" },
            },
            submissions: {
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            assessmentAttempts: {
                include: {
                    assessment: {
                        select: {
                            title: true,
                            passingScore: true,
                        },
                    },
                },
                orderBy: { startedAt: "desc" },
            },
        },
    })

    if (!user) {
        notFound()
    }

    // Get all courses for enrollment dropdown
    const allCourses = await prisma.course.findMany({
        where: { status: "PUBLISHED" },
        select: {
            id: true,
            title: true,
        },
        orderBy: { title: "asc" },
    })

    return <UserDetailClient user={user} allCourses={allCourses} />
}
