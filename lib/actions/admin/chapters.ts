"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { canEditChapter, canDeleteChapter } from "@/lib/auth/permissions"
import { toCourseAccessUser } from "@/lib/auth/course-access"
import { loadManagedCourse } from "@/lib/auth/course-access-server"
import { logContentAudit } from "@/lib/actions/admin/audit"

const ChapterSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    gateMode: z.enum(["inherit", "free", "preview", "locked"]).optional(),
    previewPercentage: z.number().min(0).max(100).nullable().optional(),
})

async function revalidateCoursePages(courseId: string) {
    revalidatePath(`/admin/courses/${courseId}/edit`)
    revalidatePath(`/admin/tutorials/${courseId}/edit`)
    revalidatePath(`/teacher/tutorials/${courseId}/edit`)
    revalidatePath("/admin/courses")
    revalidatePath("/admin/tutorials")
    revalidatePath("/teacher/tutorials")
    revalidatePath("/courses")
    revalidatePath("/tutorials")
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { slug: true },
        })
        if (course?.slug) {
            revalidatePath(`/courses/${course.slug}`)
            revalidatePath(`/tutorials/${course.slug}`)
        }
    } catch (e) {
        console.warn("Failed to revalidate course slug path:", e)
    }
}

export async function createChapter(courseId: string, data: { title: string; description?: string; gateMode?: string; previewPercentage?: number | null }) {
    const session = await auth()

    if (!session || !canEditChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to create chapter")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const validated = ChapterSchema.parse(data)

    // Get the current max order for this course
    const maxOrder = await prisma.chapter.findFirst({
        where: { courseId },
        orderBy: { order: "desc" },
        select: { order: true },
    })

    const chapter = await prisma.chapter.create({
        data: {
            title: validated.title,
            description: validated.description,
            gateMode: validated.gateMode || "inherit",
            previewPercentage: validated.previewPercentage ?? null,
            courseId,
            order: (maxOrder?.order ?? -1) + 1,
        },
        include: {
            lessons: {
                orderBy: { order: "asc" },
            },
        },
    })

    await revalidateCoursePages(courseId)

    await logContentAudit({
        entityId: chapter.id,
        entityType: "CHAPTER",
        action: "CREATE",
        details: { courseId, title: chapter.title },
    })

    return chapter
}

export async function updateChapter(
    chapterId: string,
    data: { title?: string; description?: string; gateMode?: string; previewPercentage?: number | null }
) {
    const session = await auth()

    if (!session || !canEditChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to update chapter")
    }

    const existingChapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: { courseId: true },
    })
    if (!existingChapter) {
        throw new Error("Chapter not found")
    }
    const managed = await loadManagedCourse(toCourseAccessUser(session.user), existingChapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    // Validate fields if provided
    const updatePayload: Record<string, any> = {}
    if (data.title !== undefined) updatePayload.title = data.title
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.gateMode !== undefined) {
        const raw = String(data.gateMode).toLowerCase()
        if (["inherit", "free", "preview", "locked"].includes(raw)) {
            updatePayload.gateMode = raw
        }
    }
    if (data.previewPercentage !== undefined) {
        updatePayload.previewPercentage =
            data.previewPercentage === null
                ? null
                : Math.max(0, Math.min(100, Math.round(data.previewPercentage)))
    }

    const chapter = await prisma.chapter.update({
        where: { id: chapterId },
        data: updatePayload,
        include: {
            lessons: {
                orderBy: { order: "asc" },
            },
        },
    })

    await revalidateCoursePages(chapter.courseId)

    await logContentAudit({
        entityId: chapter.id,
        entityType: "CHAPTER",
        action: "UPDATE",
        details: updatePayload,
    })

    return chapter
}

export async function updateChaptersGateMode(
    courseId: string,
    chapterIds: string[],
    gateMode: "inherit" | "free" | "preview" | "locked",
    previewPercentage?: number | null
) {
    const session = await auth()

    if (!session || !canEditChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to update chapters")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const cleanPercentage =
        previewPercentage === null || previewPercentage === undefined
            ? null
            : Math.max(0, Math.min(100, Math.round(previewPercentage)))

    await prisma.chapter.updateMany({
        where: {
            id: { in: chapterIds },
            courseId,
        },
        data: {
            gateMode,
            previewPercentage: cleanPercentage,
        },
    })

    await revalidateCoursePages(courseId)

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action: "UPDATE",
        details: { bulkGateMode: gateMode, chapterIds, previewPercentage: cleanPercentage },
    })

    return { success: true }
}

export async function deleteChapter(chapterId: string) {
    const session = await auth()

    if (!session || !canDeleteChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to delete chapter")
    }

    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: { courseId: true, title: true },
    })

    if (!chapter) {
        throw new Error("Chapter not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    // Delete chapter (lessons will be cascade deleted)
    await prisma.chapter.delete({
        where: { id: chapterId },
    })

    await revalidateCoursePages(chapter.courseId)

    await logContentAudit({
        entityId: chapterId,
        entityType: "CHAPTER",
        action: "DELETE",
        details: { courseId: chapter.courseId, title: chapter.title },
    })

    return { success: true }
}

export async function reorderChapters(courseId: string, chapterIds: string[]) {
    const session = await auth()

    if (!session || !canEditChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to reorder chapters")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    // Update order for each chapter
    await Promise.all(
        chapterIds.map((id, index) =>
            prisma.chapter.update({
                where: { id },
                data: { order: index },
            })
        )
    )

    await revalidateCoursePages(courseId)

    await logContentAudit({
        entityId: courseId,
        entityType: "CHAPTER",
        action: "REORDER",
        details: { chapterIds },
    })

    return { success: true }
}

export async function duplicateChapter(chapterId: string) {
    const session = await auth()

    if (!session || !canEditChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to duplicate chapter")
    }

    const sourceChapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
            lessons: {
                orderBy: { order: "asc" },
            },
        },
    })

    if (!sourceChapter) {
        throw new Error("Source chapter not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), sourceChapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const maxOrder = await prisma.chapter.findFirst({
        where: { courseId: sourceChapter.courseId },
        orderBy: { order: "desc" },
        select: { order: true },
    })

    const newChapter = await prisma.chapter.create({
        data: {
            title: `${sourceChapter.title} (Copy)`,
            description: sourceChapter.description,
            courseId: sourceChapter.courseId,
            order: (maxOrder?.order ?? -1) + 1,
            lessons: {
                create: sourceChapter.lessons.map((lesson) => ({
                    title: lesson.title,
                    type: lesson.type,
                    order: lesson.order,
                    xpReward: lesson.xpReward,
                    videoUrl: lesson.videoUrl,
                    content: lesson.content,
                    slides: lesson.slides,
                    duration: lesson.duration,
                })),
            },
        },
        include: {
            lessons: {
                orderBy: { order: "asc" },
            },
        },
    })

    await revalidateCoursePages(sourceChapter.courseId)

    await logContentAudit({
        entityId: newChapter.id,
        entityType: "CHAPTER",
        action: "DUPLICATE",
        details: { sourceChapterId: chapterId, lessonsCount: sourceChapter.lessons.length },
    })

    return newChapter
}


