"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { deleteFromS3 } from "@/lib/aws-s3"
import { canCreateCourse, canEditCourse, canDeleteCourse, isEditorUser } from "@/lib/auth/permissions"
import { logContentAudit } from "@/lib/actions/admin/audit"
import {
    courseDraftUpdateSchema,
    courseInlineUpdateSchema,
    parseOrThrow,
} from "@/lib/validation/admin-payloads"
import {
    creatorIdFor,
    decideCourseDelete,
    toCourseAccessUser,
} from "@/lib/auth/course-access"
import {
    assertManagedCourseForAction,
    assertManagedChapterForAction,
    assertManagedLessonForAction,
} from "@/lib/auth/course-access-server"

const CourseDraftSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
    technology: z.string().min(1, "Technology is required"),
    isPremium: z.boolean().default(false),
})

export async function createCourseDraft(prevState: any, formData: FormData) {
    const session = await auth()

    if (!session || !canCreateCourse(session.user)) {
        return { error: "Unauthorized: Insufficient permissions to create course" }
    }

    const validatedFields = CourseDraftSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description"),
        difficulty: formData.get("difficulty"),
        technology: formData.get("technology"),
        isPremium: formData.get("isPremium") === "on",
    })

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { title, description, difficulty, technology, isPremium } = validatedFields.data

    try {
        // Generate base slug from title
        let slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        // Check if slug exists and append random string if needed
        const existingCourse = await prisma.course.findUnique({
            where: { slug },
        })

        if (existingCourse) {
            slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`
        }

        const statusVal = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
        // A8: only an ADMIN publishes directly; teachers always start as drafts.
        const isTeacher = session.user.role === "TEACHER"
        const effectiveStatus = isTeacher ? "DRAFT" : statusVal
        const isPublished = effectiveStatus === "PUBLISHED"

        const course = await prisma.course.create({
            data: {
                title,
                slug,
                description,
                difficulty,
                technology,
                isPremium: isTeacher ? false : isPremium,
                status: effectiveStatus,
                isPublished,
                createdById: creatorIdFor(toCourseAccessUser(session.user)),
                thumbnailUrl: "/placeholder-course.svg", // Default placeholder
            },
        })

        await logContentAudit({
            entityId: course.id,
            entityType: "COURSE",
            action: isPublished ? "PUBLISH" : "CREATE",
            details: { title, slug, technology, difficulty },
        })

        const returnUrl = formData.get("returnUrl") as string
        if (returnUrl) {
            redirect(returnUrl.replace("[id]", course.id).replace(":id", course.id))
        }

        redirect(`/admin/tutorials/${course.id}/edit`)
    } catch (error: any) {
        console.error("Course creation error:", error)
        // Return the actual error message if it's not a redirect
        if (error.message === "NEXT_REDIRECT") {
            throw error
        }
        return { error: error.message || "Failed to create course" }
    }
}

export async function updateCourseDraft(courseId: string, rawData: any) {
    const session = await auth()

    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to edit course")
    }

    // A8: teachers may only edit courses they created.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    // A12: allowlisted fields only. Unknown keys are stripped, so a caller can
    // never mass-assign relations, ids, counters or audit columns.
    const data: any = parseOrThrow(courseDraftUpdateSchema, rawData ?? {})

    if (data.status) {
        data.isPublished = data.status === "PUBLISHED"
    }

    if (typeof data.prerequisites === "string") {
        data.prerequisites = data.prerequisites
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
    }

    // Server-side Zod validation and clamping for Authwall gate settings
    if (data.isGated !== undefined) {
        data.isGated = Boolean(data.isGated)
    }
    if (data.previewPercentage !== undefined) {
        const rawPct = Number(data.previewPercentage)
        data.previewPercentage = Math.max(0, Math.min(100, Math.round(Number.isFinite(rawPct) ? rawPct : 20)))
    }
    if (data.seoMode !== undefined) {
        data.seoMode = String(data.seoMode).toLowerCase() === "bot-full" ? "bot-full" : "preview"
    }

    const updated = await prisma.course.update({
        where: { id: courseId },
        data,
    })

    revalidatePath(`/admin/courses/${courseId}/edit`)
    revalidatePath(`/admin/tutorials/${courseId}/edit`)
    revalidatePath(`/teacher/tutorials/${courseId}/edit`)
    revalidatePath("/admin/courses")
    revalidatePath("/admin/tutorials")
    revalidatePath("/teacher/tutorials")
    revalidatePath("/courses")
    revalidatePath("/tutorials")
    if (updated.slug) {
        revalidatePath(`/courses/${updated.slug}`)
        revalidatePath(`/tutorials/${updated.slug}`)
    }

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action: data.status === "PUBLISHED" ? "PUBLISH" : "UPDATE",
        details: { fields: Object.keys(data), isGated: updated.isGated, previewPercentage: updated.previewPercentage },
    })

    return updated
}

export async function updateCourseInline(courseId: string, fields: Record<string, any>) {
    const session = await auth()

    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to edit course")
    }

    // A8: teachers may only edit courses they created.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const data: Record<string, any> = parseOrThrow(courseInlineUpdateSchema, fields ?? {})
    if (typeof data.prerequisites === "string") {
        data.prerequisites = data.prerequisites.split(",").map((s: string) => s.trim()).filter(Boolean)
    }
    if (data.status !== undefined) {
        data.isPublished = data.status === "PUBLISHED"
    }

    const updated = await prisma.course.update({
        where: { id: courseId },
        data,
    })

    revalidatePath(`/admin/courses/${courseId}/edit`)
    revalidatePath(`/admin/tutorials/${courseId}/edit`)
    revalidatePath(`/teacher/tutorials/${courseId}/edit`)
    revalidatePath("/admin/courses")
    revalidatePath("/admin/tutorials")
    revalidatePath("/teacher/tutorials")
    revalidatePath("/courses")
    revalidatePath("/tutorials")
    if (updated.slug) {
        revalidatePath(`/courses/${updated.slug}`)
        revalidatePath(`/tutorials/${updated.slug}`)
    }

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action:
            fields.status === "PUBLISHED"
                ? "PUBLISH"
                : fields.status === "DRAFT"
                ? "UNPUBLISH"
                : "UPDATE",
        details: { updatedFields: Object.keys(fields) },
    })

    return { success: true, course: updated }
}

export async function updateCourseThumbnail(courseId: string, thumbnailUrl: string) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "update")

    const course = await prisma.course.findUnique({
        where: { id: courseId },
    })

    // Delete old thumbnail from S3 if it exists and is not placeholder
    if (course?.thumbnailUrl && !course.thumbnailUrl.includes("placeholder")) {
        try {
            const key = course.thumbnailUrl.split(".com/")[1]
            if (key) await deleteFromS3(key)
        } catch (error) {
            console.error("Error deleting old thumbnail:", error)
        }
    }

    await prisma.course.update({
        where: { id: courseId },
        data: { thumbnailUrl },
    })

    revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function deleteDraft(courseId: string) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership.
    const accessUser = toCourseAccessUser(session.user)
    await assertManagedCourseForAction(accessUser, courseId, "delete")

    // Only allow deleting drafts
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            chapters: {
                include: {
                    lessons: true,
                },
            },
        },
    })

    if (!course) {
        throw new Error("Course not found")
    }

    if (course.status !== "DRAFT") {
        throw new Error("Can only delete draft courses")
    }

    // A8: a course with learners is archived, never destroyed.
    const enrollmentCount = await prisma.enrollment.count({ where: { courseId } })
    if (decideCourseDelete(enrollmentCount) === "archive") {
        await prisma.course.update({
            where: { id: courseId },
            data: { status: "ARCHIVED", isPublished: false },
        })
        await logContentAudit({
            entityId: courseId,
            entityType: "COURSE",
            action: "UPDATE",
            details: { archived: true, reason: "has enrollments", enrollmentCount },
        })
        revalidatePath("/admin/courses")
        return { archived: true, enrollmentCount }
    }

    // Delete all associated files from S3
    if (course.thumbnailUrl && !course.thumbnailUrl.includes("placeholder")) {
        try {
            const key = course.thumbnailUrl.split(".com/")[1]
            if (key) await deleteFromS3(key)
        } catch (error) {
            console.error("Error deleting thumbnail:", error)
        }
    }

    for (const chapter of course.chapters) {
        for (const lesson of chapter.lessons) {
            if (lesson.videoUrl) {
                try {
                    const key = lesson.videoUrl.split(".com/")[1]
                    if (key) await deleteFromS3(key)
                } catch (error) {
                    console.error("Error deleting video:", error)
                }
            }
        }
    }

    await prisma.course.delete({
        where: { id: courseId },
    })

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action: "DELETE",
        details: { title: course.title, chaptersCount: course.chapters.length },
    })

    revalidatePath("/admin/courses")
}

export async function togglePublishStatus(courseId: string) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "publish")

    const course = await prisma.course.findUnique({
        where: { id: courseId },
    })

    if (!course) {
        throw new Error("Course not found")
    }

    const newStatus = course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"

    await prisma.course.update({
        where: { id: courseId },
        data: { status: newStatus },
    })

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action: newStatus === "PUBLISHED" ? "PUBLISH" : "UNPUBLISH",
        details: { previousStatus: course.status },
    })

    revalidatePath(`/admin/courses/${courseId}/edit`)
    revalidatePath("/admin/courses")
    revalidatePath("/courses")

    return { status: newStatus }
}

// Chapter Management

export async function createChapter(courseId: string, data: { title: string; description?: string }) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "manage")

    const lastChapter = await prisma.chapter.findFirst({
        where: { courseId },
        orderBy: { order: "desc" },
    })

    const order = (lastChapter?.order ?? -1) + 1

    await prisma.chapter.create({
        data: {
            title: data.title,
            description: data.description,
            courseId,
            order,
        },
    })

    revalidatePath(`/admin/courses/${courseId}/edit`)
}

export async function updateChapter(chapterId: string, data: { title: string; description?: string }) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership, resolved from the chapter's course.
    await assertManagedChapterForAction(toCourseAccessUser(session.user), chapterId, "manage")

    const chapter = await prisma.chapter.update({
        where: { id: chapterId },
        data: {
            title: data.title,
            description: data.description,
        },
    })

    revalidatePath(`/admin/courses/${chapter.courseId}/edit`)
}

export async function deleteChapter(chapterId: string) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership, resolved from the chapter's course.
    await assertManagedChapterForAction(toCourseAccessUser(session.user), chapterId, "delete")

    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: { lessons: true },
    })

    if (!chapter) {
        throw new Error("Chapter not found")
    }

    // Delete lesson videos from S3
    for (const lesson of chapter.lessons) {
        if (lesson.videoUrl) {
            try {
                const key = lesson.videoUrl.split(".com/")[1]
                if (key) await deleteFromS3(key)
            } catch (error) {
                console.error("Error deleting video:", error)
            }
        }
    }

    await prisma.chapter.delete({
        where: { id: chapterId },
    })

    revalidatePath(`/admin/courses/${chapter.courseId}/edit`)
}

// Lesson Management

export async function createLesson(chapterId: string, data: any) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership, resolved from the chapter's course.
    await assertManagedChapterForAction(toCourseAccessUser(session.user), chapterId, "manage")

    const lastLesson = await prisma.lesson.findFirst({
        where: { chapterId },
        orderBy: { order: "desc" },
    })

    const order = (lastLesson?.order ?? -1) + 1

    await prisma.lesson.create({
        data: {
            ...data,
            chapterId,
            order,
        },
    })

    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
    })

    if (chapter) {
        revalidatePath(`/admin/courses/${chapter.courseId}/edit`)
    }
}

export async function updateLesson(lessonId: string, data: any) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership, resolved from the lesson's chapter/course.
    await assertManagedLessonForAction(toCourseAccessUser(session.user), lessonId, "manage")

    const lesson = await prisma.lesson.update({
        where: { id: lessonId },
        data,
        include: { chapter: true },
    })

    revalidatePath(`/admin/courses/${lesson.chapter.courseId}/edit`)
}

export async function deleteLesson(lessonId: string) {
    const session = await auth()

    if (!session || !isEditorUser(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: ownership, resolved from the lesson's chapter/course.
    await assertManagedLessonForAction(toCourseAccessUser(session.user), lessonId, "delete")

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { chapter: true },
    })

    if (!lesson) {
        throw new Error("Lesson not found")
    }

    // Delete video from S3 if exists
    if (lesson.videoUrl) {
        try {
            const key = lesson.videoUrl.split(".com/")[1]
            if (key) await deleteFromS3(key)
        } catch (error) {
            console.error("Error deleting video:", error)
        }
    }

    await prisma.lesson.delete({
        where: { id: lessonId },
    })

    revalidatePath(`/admin/courses/${lesson.chapter.courseId}/edit`)
}

export async function getTutorialCoursesAction() {
    const session = await auth()
    if (!session || !isEditorUser(session.user)) {
        return []
    }
    const accessUser = toCourseAccessUser(session.user)
    const courses = await prisma.course.findMany({
        // A8: teachers only see the courses they own in the studio.
        where: accessUser.role === "ADMIN" ? undefined : { createdById: accessUser.userId },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            slug: true,
            externalId: true,
            metadataJson: true,
        },
    })
    return courses
        .filter((c) => {
            let meta: any = null
            try {
              meta = c.metadataJson ? JSON.parse(c.metadataJson) : null
            } catch {}
            return meta?.format === "tutorial" || Boolean(c.externalId) || Boolean(meta?.meta)
        })
        .map((c) => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            externalId: c.externalId,
        }))
}
