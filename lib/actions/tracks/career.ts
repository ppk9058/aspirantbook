"use server"

import { prisma } from "@/lib/prisma"

export async function getCareerTracks(roleFilter?: string) {
    const where = roleFilter && roleFilter !== "All"
        ? {
            type: "CAREER" as const,
            isPublished: true,
            title: { contains: roleFilter, mode: "insensitive" as const }
        }
        : {
            type: "CAREER" as const,
            isPublished: true
        }

    const tracks = await prisma.track.findMany({
        where,
        include: {
            courses: {
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            difficulty: true,
                        }
                    }
                },
                orderBy: { order: "asc" }
            },
        },
        orderBy: { order: "asc" }
    })

    return tracks.map(track => ({
        ...track,
        courseCount: track.courses.length,
        projectCount: 2, // Placeholder - can be calculated from actual projects
        participants: Math.floor(Math.random() * 500000) + 100000, // Placeholder
    }))
}

export async function getCareerTrackBySlug(slug: string) {
    const track = await prisma.track.findUnique({
        where: { slug, type: "CAREER" },
        include: {
            courses: {
                include: {
                    course: {
                        include: {
                            chapters: {
                                include: {
                                    lessons: true
                                }
                            }
                        }
                    }
                },
                orderBy: { order: "asc" }
            }
        }
    })

    if (!track) return null

    // Calculate total hours and other stats
    const totalHours = track.courses.reduce((acc, tc) => {
        const courseLessons = tc.course.chapters.flatMap(ch => ch.lessons)
        const courseHours = courseLessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) / 60
        return acc + courseHours
    }, 0)

    return {
        ...track,
        totalHours: Math.round(totalHours),
        courseCount: track.courses.length,
        projectCount: 2,
        participants: Math.floor(Math.random() * 500000) + 100000,
    }
}
