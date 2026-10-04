"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { canEditChapter, canDeleteChapter } from "@/lib/auth/permissions"
import { logContentAudit } from "@/lib/actions/admin/audit"

const ChapterSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
})

async function revalidateCoursePages(courseId: string) {
    revalidatePath(`/admin/courses/${courseId}/edit`)
    revalidatePath("/admin/courses")
    revalidatePath("/courses")
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { slug: true },
        })
        if (course?.slug) {
            revalidatePath(`/courses/${course.slug}`)
        }
    } catch (e) {
        console.warn("Failed to revalidate course slug path:", e)
    }
}

export async function createChapter(courseId: string, data: { title: string; description?: string }) {
    const session = await auth()

    if (!session || !canEditChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to create chapter")
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

export async function updateChapter(chapterId: string, data: { title?: string; description?: string }) {
    const session = await auth()

    if (!session || !canEditChapter(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to update chapter")
    }

    const chapter = await prisma.chapter.update({
        where: { id: chapterId },
        data,
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
        details: data,
    })

    return chapter
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


