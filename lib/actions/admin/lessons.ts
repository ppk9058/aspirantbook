"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { LessonType } from "@prisma/client"
import { canEditContent, canDeleteContent } from "@/lib/auth/permissions"
import { toCourseAccessUser } from "@/lib/auth/course-access"
import { loadManagedCourse } from "@/lib/auth/course-access-server"
import { logContentAudit } from "@/lib/actions/admin/audit"
import { chunkContent, computeContentHash } from "@/lib/authwall/chunker"

const LessonSchema = z.object({
    title: z.string().min(1, "Title is required"),
    type: z.nativeEnum(LessonType),
    videoUrl: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
    slides: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
    xpReward: z.number().default(10),
})

async function revalidateLessonPages(courseId: string, lessonId?: string) {
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
            if (lessonId) {
                revalidatePath(`/learn/${course.slug}/${lessonId}`)
            }
            revalidatePath(`/learn/${course.slug}`)
        }
    } catch (e) {
        console.warn("Failed to revalidate course lesson paths:", e)
    }
}

export async function createLesson(
    chapterId: string,
    data: {
        title: string
        type: LessonType
        videoUrl?: string | null
        content?: string | null
        slides?: string | null
        duration?: number | null
        xpReward?: number
    }
) {
    const session = await auth()

    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to create lesson")
    }

    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: { courseId: true },
    })
    if (!chapter) {
        throw new Error("Chapter not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const validated = LessonSchema.parse(data)

    // Get the current max order for this chapter
    const maxOrder = await prisma.lesson.findFirst({
        where: { chapterId },
        orderBy: { order: "desc" },
        select: { order: true },
    })

    const contentBlocks = validated.content ? chunkContent(validated.content) : []
    const blockCount = contentBlocks.length > 0 ? contentBlocks.length : undefined
    const contentHash = contentBlocks.length > 0 ? computeContentHash(contentBlocks) : undefined

    const lesson = await prisma.lesson.create({
        data: {
            title: validated.title,
            type: validated.type,
            videoUrl: validated.videoUrl || undefined,
            content: validated.content || undefined,
            slides: validated.slides || undefined,
            duration: validated.duration || undefined,
            xpReward: validated.xpReward || 10,
            blockCount,
            contentHash,
            chapterId,
            order: (maxOrder?.order ?? -1) + 1,
        },
        include: {
            chapter: {
                select: { courseId: true },
            },
        },
    })

    await revalidateLessonPages(lesson.chapter.courseId, lesson.id)

    await logContentAudit({
        entityId: lesson.id,
        entityType: "LESSON",
        action: "CREATE",
        details: { chapterId, title: lesson.title, type: lesson.type },
    })

    return lesson
}

export async function updateLesson(
    lessonId: string,
    data: {
        title?: string
        type?: LessonType
        videoUrl?: string | null
        content?: string | null
        slides?: string | null
        duration?: number | null
        xpReward?: number
        gateMode?: string
        previewPercentage?: number | null
    }
) {
    const session = await auth()

    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to update lesson")
    }

    const existingLesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { chapter: { select: { courseId: true } } },
    })
    if (!existingLesson) {
        throw new Error("Lesson not found")
    }
    const managed = await loadManagedCourse(toCourseAccessUser(session.user), existingLesson.chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const contentBlocks = data.content ? chunkContent(data.content) : undefined
    const blockCount = contentBlocks ? contentBlocks.length : undefined
    const contentHash = contentBlocks ? computeContentHash(contentBlocks) : undefined

    const updatePayload: Record<string, any> = {}
    if (data.title !== undefined) updatePayload.title = data.title
    if (data.type !== undefined) updatePayload.type = data.type
    if (data.videoUrl !== undefined) updatePayload.videoUrl = data.videoUrl
    if (data.content !== undefined) {
        updatePayload.content = data.content
        updatePayload.blockCount = blockCount
        updatePayload.contentHash = contentHash
    }
    if (data.slides !== undefined) updatePayload.slides = data.slides
    if (data.duration !== undefined) updatePayload.duration = data.duration
    if (data.xpReward !== undefined) updatePayload.xpReward = data.xpReward

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

    const lesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: updatePayload,
        include: {
            chapter: {
                select: { courseId: true },
            },
        },
    })

    await revalidateLessonPages(lesson.chapter.courseId, lesson.id)

    await logContentAudit({
        entityId: lesson.id,
        entityType: "LESSON",
        action: "UPDATE",
        details: updatePayload,
    })

    return lesson
}

export async function updateLessonsGateMode(
    courseId: string,
    lessonIds: string[],
    gateMode: "inherit" | "free" | "preview" | "locked",
    previewPercentage?: number | null
) {
    const session = await auth()

    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to update lessons")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const cleanPercentage =
        previewPercentage === null || previewPercentage === undefined
            ? null
            : Math.max(0, Math.min(100, Math.round(previewPercentage)))

    await prisma.lesson.updateMany({
        where: {
            id: { in: lessonIds },
            chapter: { courseId },
        },
        data: {
            gateMode,
            previewPercentage: cleanPercentage,
        },
    })

    await revalidateLessonPages(courseId)

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action: "UPDATE",
        details: { bulkGateMode: gateMode, lessonIds, previewPercentage: cleanPercentage },
    })

    return { success: true }
}

export async function deleteLesson(lessonId: string) {
    const session = await auth()

    if (!session || !canDeleteContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to delete lesson")
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            chapter: {
                select: { courseId: true },
            },
        },
    })

    if (!lesson) {
        throw new Error("Lesson not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), lesson.chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const courseId = lesson.chapter.courseId

    await prisma.lesson.delete({
        where: { id: lessonId },
    })

    await revalidateLessonPages(courseId, lessonId)

    await logContentAudit({
        entityId: lessonId,
        entityType: "LESSON",
        action: "DELETE",
        details: { courseId, title: lesson.title },
    })

    return { success: true }
}

export async function reorderLessons(chapterId: string, lessonIds: string[]) {
    const session = await auth()

    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to reorder lessons")
    }

    // Get courseId for revalidation
    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: { courseId: true },
    })

    if (!chapter) {
        throw new Error("Chapter not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    // Update order for each lesson
    await Promise.all(
        lessonIds.map((id, index) =>
            prisma.lesson.update({
                where: { id },
                data: { order: index },
            })
        )
    )

    await revalidateLessonPages(chapter.courseId)

    await logContentAudit({
        entityId: chapterId,
        entityType: "LESSON",
        action: "REORDER",
        details: { lessonIds },
    })

    return { success: true }
}

export async function duplicateLesson(lessonId: string) {
    const session = await auth()

    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to duplicate lesson")
    }

    const sourceLesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            chapter: {
                select: { courseId: true },
            },
        },
    })

    if (!sourceLesson) {
        throw new Error("Lesson not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), sourceLesson.chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const maxOrder = await prisma.lesson.findFirst({
        where: { chapterId: sourceLesson.chapterId },
        orderBy: { order: "desc" },
        select: { order: true },
    })

    const newLesson = await prisma.lesson.create({
        data: {
            title: `${sourceLesson.title} (Copy)`,
            type: sourceLesson.type,
            videoUrl: sourceLesson.videoUrl,
            content: sourceLesson.content,
            slides: sourceLesson.slides,
            duration: sourceLesson.duration,
            xpReward: sourceLesson.xpReward,
            chapterId: sourceLesson.chapterId,
            order: (maxOrder?.order ?? -1) + 1,
        },
        include: {
            chapter: {
                select: { courseId: true },
            },
        },
    })

    await revalidateLessonPages(newLesson.chapter.courseId, newLesson.id)

    await logContentAudit({
        entityId: newLesson.id,
        entityType: "LESSON",
        action: "DUPLICATE",
        details: { sourceLessonId: lessonId, chapterId: sourceLesson.chapterId },
    })

    return newLesson
}

export async function saveLessonDraft(
    lessonId: string,
    blocks: any[],
    note: string = "Teacher edited in studio"
) {
    const session = await auth()
    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to save draft")
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { chapter: { select: { courseId: true } } },
    })

    if (!lesson) {
        throw new Error("Lesson not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), lesson.chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    // Create a new draft LessonVersion
    const version = await prisma.lessonVersion.create({
        data: {
            lessonId,
            status: "draft",
            blocks: blocks as any,
            schemaVersion: 1,
            createdBy: session.user.id || session.user.email || "teacher",
            note,
            source: "editor",
        },
    })

    // Update lesson pointer to draft and sync content
    await prisma.lesson.update({
        where: { id: lessonId },
        data: {
            currentDraftVersionId: version.id,
            content: JSON.stringify(blocks),
        },
    })

    await revalidateLessonPages(lesson.chapter.courseId, lesson.id)

    return { success: true, versionId: version.id }
}

export async function publishLessonVersion(
    lessonId: string,
    blocks?: any[],
    note: string = "Published by teacher in studio"
) {
    const session = await auth()
    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to publish lesson")
    }

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            chapter: { select: { courseId: true } },
            versions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
    })

    if (!lesson) {
        throw new Error("Lesson not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), lesson.chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    // Determine blocks to publish
    let targetBlocks = blocks
    if (!targetBlocks && lesson.currentDraftVersionId) {
        const draftVer = await prisma.lessonVersion.findUnique({
            where: { id: lesson.currentDraftVersionId },
        })
        if (draftVer && draftVer.blocks) {
            targetBlocks = draftVer.blocks as any
        }
    }
    if (!targetBlocks) {
        targetBlocks = (lesson.versions[0]?.blocks as any) || []
    }

    // Create published version
    const version = await prisma.lessonVersion.create({
        data: {
            lessonId,
            status: "published",
            blocks: targetBlocks as any,
            schemaVersion: 1,
            createdBy: session.user.id || session.user.email || "teacher",
            note,
            source: "editor",
        },
    })

    const blocksArr = Array.isArray(targetBlocks) ? targetBlocks : [targetBlocks]
    const blocksCount = blocksArr.length
    const contentHash = computeContentHash(blocksArr)

    // Update lesson
    await prisma.lesson.update({
        where: { id: lessonId },
        data: {
            currentPublishedVersionId: version.id,
            currentDraftVersionId: null, // Draft is published, no pending changes
            locked: false,
            content: JSON.stringify(targetBlocks),
            blockCount: blocksCount,
            contentHash,
        },
    })

    await revalidateLessonPages(lesson.chapter.courseId, lesson.id)

    await logContentAudit({
        entityId: lesson.id,
        entityType: "LESSON",
        action: "PUBLISH",
        details: { courseId: lesson.chapter.courseId, versionId: version.id },
    })

    return { success: true, versionId: version.id }
}

export async function getLessonBlocksAndVersions(lessonId: string) {
    try {
        const session = await auth()
        if (!session) {
            return {
                ok: false,
                error: "Unauthorized: Please sign in to edit lessons",
                lesson: null,
                activeBlocks: [],
                hasDraft: false,
                currentPublishedVersionId: null,
                currentDraftVersionId: null,
                versions: [],
            }
        }

        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                versions: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
            },
        })

        if (!lesson) {
            return {
                ok: false,
                error: "Lesson not found",
                lesson: null,
                activeBlocks: [],
                hasDraft: false,
                currentPublishedVersionId: null,
                currentDraftVersionId: null,
                versions: [],
            }
        }

        // Determine active blocks to load in editor
        let activeBlocks: any[] = []
        let hasDraft = false

        if (lesson.currentDraftVersionId) {
            const draftVer = lesson.versions.find((v) => v.id === lesson.currentDraftVersionId)
            if (draftVer && draftVer.blocks) {
                activeBlocks = Array.isArray(draftVer.blocks) ? draftVer.blocks : []
                hasDraft = true
            }
        }

        if (activeBlocks.length === 0 && lesson.currentPublishedVersionId) {
            const pubVer = lesson.versions.find((v) => v.id === lesson.currentPublishedVersionId)
            if (pubVer && pubVer.blocks) {
                activeBlocks = Array.isArray(pubVer.blocks) ? pubVer.blocks : []
            }
        }

        if (activeBlocks.length === 0 && lesson.content) {
            try {
                const parsed = JSON.parse(lesson.content)
                if (Array.isArray(parsed)) activeBlocks = parsed
                else if (parsed.blocks && Array.isArray(parsed.blocks)) activeBlocks = parsed.blocks
            } catch {
                activeBlocks = [{ bid: "legacy-p", t: "p", x: lesson.content }]
            }
        }

        return {
            ok: true,
            lesson,
            activeBlocks,
            hasDraft,
            currentPublishedVersionId: lesson.currentPublishedVersionId,
            currentDraftVersionId: lesson.currentDraftVersionId,
            versions: lesson.versions || [],
        }
    } catch (err: any) {
        console.error("Error in getLessonBlocksAndVersions:", err)
        return {
            ok: false,
            error: err?.message || "Failed to load lesson content",
            lesson: null,
            activeBlocks: [],
            hasDraft: false,
            currentPublishedVersionId: null,
            currentDraftVersionId: null,
            versions: [],
        }
    }
}

export async function restoreLessonVersion(versionId: string) {
    const session = await auth()
    if (!session || !canEditContent(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to restore lesson version")
    }

    const versionToRestore = await prisma.lessonVersion.findUnique({
        where: { id: versionId },
        include: {
            lesson: {
                include: {
                    chapter: {
                        select: { courseId: true }
                    }
                }
            }
        }
    })

    if (!versionToRestore) {
        throw new Error("Version not found")
    }

    const managed = await loadManagedCourse(toCourseAccessUser(session.user), versionToRestore.lesson.chapter.courseId)
    if ("error" in managed) {
        throw new Error(managed.error)
    }

    const lesson = versionToRestore.lesson
    const blocks = Array.isArray(versionToRestore.blocks) ? versionToRestore.blocks : []

    // Create a new version representing this restoration
    const restoredVersion = await prisma.lessonVersion.create({
        data: {
            lessonId: lesson.id,
            status: "draft",
            blocks: blocks as any,
            source: "restore",
            note: `Restored from version ${versionId} (created ${versionToRestore.createdAt.toISOString()})`,
            createdBy: session.user.id || session.user.email || "teacher",
            schemaVersion: versionToRestore.schemaVersion || 1,
        }
    })

    // Set as the current draft for review before live publishing
    await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
            currentDraftVersionId: restoredVersion.id
        }
    })

    await logContentAudit({
        entityId: lesson.id,
        entityType: "LESSON",
        action: "RESTORE_VERSION",
        details: { courseId: lesson.chapter.courseId, restoredFromVersionId: versionId, newDraftVersionId: restoredVersion.id },
    })

    return { success: true, restoredDraftId: restoredVersion.id, blocks }
}


