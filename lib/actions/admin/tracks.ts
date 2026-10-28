"use server"

import { prisma } from "@/lib/prisma"
import { TrackType } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { assertAdmin } from "@/lib/auth/action-guards"
import { z } from "zod"

const TrackSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    type: z.nativeEnum(TrackType),
    isPublished: z.boolean().optional(),
})

async function requireAdmin() {
    assertAdmin(await getCurrentUserContext())
}

export async function getTracks() {
    await requireAdmin()
    try {
        const tracks = await prisma.track.findMany({
            orderBy: { order: "asc" },
            include: {
                _count: {
                    select: { courses: true },
                },
            },
        })
        return { success: true, tracks }
    } catch (error) {
        console.error("Failed to fetch tracks:", error)
        return { success: false, error: "Failed to fetch tracks" }
    }
}

export async function createTrack(data: z.infer<typeof TrackSchema>) {
    await requireAdmin()
    try {
        const validated = TrackSchema.parse(data)

        // Generate slug from title
        const slug = validated.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "")

        // Check if slug exists
        const existing = await prisma.track.findUnique({ where: { slug } })
        if (existing) {
            return { success: false, error: "A track with this title already exists" }
        }

        const track = await prisma.track.create({
            data: {
                ...validated,
                slug,
            },
        })

        revalidatePath("/admin/tracks")

        safeRevalidateTags(CACHE_TAGS.tracks)
        return { success: true, track }
    } catch (error) {
        console.error("Failed to create track:", error)
        return { success: false, error: "Failed to create track" }
    }
}

export async function updateTrack(id: string, data: Partial<z.infer<typeof TrackSchema>>) {
    await requireAdmin()
    try {
        const validated = TrackSchema.partial().parse(data)
        const track = await prisma.track.update({
            where: { id },
            data: validated,
        })

        revalidatePath("/admin/tracks")

        safeRevalidateTags(CACHE_TAGS.tracks)
        return { success: true, track }
    } catch (error) {
        console.error("Failed to update track:", error)
        return { success: false, error: "Failed to update track" }
    }
}

export async function deleteTrack(id: string) {
    await requireAdmin()
    try {
        await prisma.track.delete({
            where: { id },
        })

        revalidatePath("/admin/tracks")

        safeRevalidateTags(CACHE_TAGS.tracks)
        return { success: true }
    } catch (error) {
        console.error("Failed to delete track:", error)
        return { success: false, error: "Failed to delete track" }
    }
}

export async function addCourseToTrack(trackId: string, courseId: string) {
    await requireAdmin()
    try {
        // Get current highest order
        const lastCourse = await prisma.trackCourse.findFirst({
            where: { trackId },
            orderBy: { order: "desc" },
        })

        const newOrder = (lastCourse?.order ?? -1) + 1

        await prisma.trackCourse.create({
            data: {
                trackId,
                courseId,
                order: newOrder,
            },
        })

        revalidatePath(`/admin/tracks/${trackId}`)

        safeRevalidateTags(CACHE_TAGS.tracks)
        return { success: true }
    } catch (error) {
        console.error("Failed to add course to track:", error)
        return { success: false, error: "Failed to add course to track" }
    }
}

export async function removeCourseFromTrack(trackId: string, courseId: string) {
    await requireAdmin()
    try {
        await prisma.trackCourse.delete({
            where: {
                trackId_courseId: {
                    trackId,
                    courseId,
                },
            },
        })

        revalidatePath(`/admin/tracks/${trackId}`)

        safeRevalidateTags(CACHE_TAGS.tracks)
        return { success: true }
    } catch (error) {
        console.error("Failed to remove course from track:", error)
        return { success: false, error: "Failed to remove course from track" }
    }
}

export async function reorderTrackCourses(trackId: string, items: { id: string; order: number }[]) {
    await requireAdmin()
    try {
        const transaction = items.map((item) =>
            prisma.trackCourse.update({
                where: { id: item.id },
                data: { order: item.order },
            })
        )

        await prisma.$transaction(transaction)
        revalidatePath(`/admin/tracks/${trackId}`)
        safeRevalidateTags(CACHE_TAGS.tracks)
        return { success: true }
    } catch (error) {
        console.error("Failed to reorder courses:", error)
        return { success: false, error: "Failed to reorder courses" }
    }
}

export async function getAvailableCourses(trackId: string) {
    await requireAdmin()
    try {
        const courses = await prisma.course.findMany({
            where: {
                tracks: {
                    none: {
                        trackId,
                    },
                },
                status: "PUBLISHED",
            },
            select: {
                id: true,
                title: true,
                thumbnailUrl: true,
            },
        })
        return { success: true, courses }
    } catch (error) {
        console.error("Failed to fetch available courses:", error)
        return { success: false, error: "Failed to fetch available courses" }
    }
}
