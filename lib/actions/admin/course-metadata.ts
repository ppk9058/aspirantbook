"use server"

import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { canEditCourse } from "@/lib/auth/permissions"
import { toCourseAccessUser } from "@/lib/auth/course-access"
import { assertManagedCourseForAction } from "@/lib/auth/course-access-server"
import { logContentAudit } from "@/lib/actions/admin/audit"
import { prisma } from "@/lib/prisma"
import {
    CourseCustomMetadata,
    getCourseCustomMetadata,
    saveCourseCustomMetadata,
} from "@/lib/services/course-metadata-service"

async function revalidateCourseRoutes(courseId: string) {
    revalidatePath("/courses")
    revalidatePath(`/admin/courses/${courseId}/edit`)
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { slug: true },
        })
        if (course?.slug) {
            revalidatePath(`/courses/${course.slug}`)
        }
    } catch {
        // Safe fallback
    }
}

/**
 * Fetch course custom metadata
 */
export async function fetchCourseMetadata(courseId: string): Promise<CourseCustomMetadata> {
    return await getCourseCustomMetadata(courseId)
}

/**
 * Update course custom metadata (inclusions, project count, skills)
 */
export async function updateCourseMetadataAction(
    courseId: string,
    data: Partial<CourseCustomMetadata>
): Promise<{ success: boolean; metadata: CourseCustomMetadata }> {
    const session = await auth()

    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to edit course metadata")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const updated = await saveCourseCustomMetadata(courseId, data)
    await revalidateCourseRoutes(courseId)

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action: "UPDATE",
        details: { customMetadataUpdates: Object.keys(data) },
    })

    return { success: true, metadata: updated }
}

/**
 * Add a feature inclusion item
 */
export async function addCourseFeatureAction(
    courseId: string,
    text: string
): Promise<{ success: boolean; metadata: CourseCustomMetadata }> {
    const trimmed = text.trim()
    if (!trimmed) throw new Error("Feature text cannot be empty")

    const session = await auth()
    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const current = await getCourseCustomMetadata(courseId)
    const newFeatures = [...current.features, trimmed]
    const updated = await saveCourseCustomMetadata(courseId, { features: newFeatures })

    await revalidateCourseRoutes(courseId)
    return { success: true, metadata: updated }
}

/**
 * Update an existing feature item by index
 */
export async function updateCourseFeatureAction(
    courseId: string,
    index: number,
    text: string
): Promise<{ success: boolean; metadata: CourseCustomMetadata }> {
    const trimmed = text.trim()
    if (!trimmed) throw new Error("Feature text cannot be empty")

    const session = await auth()
    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const current = await getCourseCustomMetadata(courseId)
    const newFeatures = [...current.features]
    if (index >= 0 && index < newFeatures.length) {
        newFeatures[index] = trimmed
    }
    const updated = await saveCourseCustomMetadata(courseId, { features: newFeatures })

    await revalidateCourseRoutes(courseId)
    return { success: true, metadata: updated }
}

/**
 * Delete a feature item by index
 */
export async function deleteCourseFeatureAction(
    courseId: string,
    index: number
): Promise<{ success: boolean; metadata: CourseCustomMetadata }> {
    const session = await auth()
    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const current = await getCourseCustomMetadata(courseId)
    const newFeatures = current.features.filter((_, i) => i !== index)
    const updated = await saveCourseCustomMetadata(courseId, { features: newFeatures })

    await revalidateCourseRoutes(courseId)
    return { success: true, metadata: updated }
}

/**
 * Add an acquired skill item
 */
export async function addCourseSkillAction(
    courseId: string,
    text: string
): Promise<{ success: boolean; metadata: CourseCustomMetadata }> {
    const trimmed = text.trim()
    if (!trimmed) throw new Error("Skill text cannot be empty")

    const session = await auth()
    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const current = await getCourseCustomMetadata(courseId)
    const newSkills = [...current.skills, trimmed]
    const updated = await saveCourseCustomMetadata(courseId, { skills: newSkills })

    await revalidateCourseRoutes(courseId)
    return { success: true, metadata: updated }
}

/**
 * Update an existing skill item by index
 */
export async function updateCourseSkillAction(
    courseId: string,
    index: number,
    text: string
): Promise<{ success: boolean; metadata: CourseCustomMetadata }> {
    const trimmed = text.trim()
    if (!trimmed) throw new Error("Skill text cannot be empty")

    const session = await auth()
    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const current = await getCourseCustomMetadata(courseId)
    const newSkills = [...current.skills]
    if (index >= 0 && index < newSkills.length) {
        newSkills[index] = trimmed
    }
    const updated = await saveCourseCustomMetadata(courseId, { skills: newSkills })

    await revalidateCourseRoutes(courseId)
    return { success: true, metadata: updated }
}

/**
 * Delete a skill item by index
 */
export async function deleteCourseSkillAction(
    courseId: string,
    index: number
): Promise<{ success: boolean; metadata: CourseCustomMetadata }> {
    const session = await auth()
    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const current = await getCourseCustomMetadata(courseId)
    const newSkills = current.skills.filter((_, i) => i !== index)
    const updated = await saveCourseCustomMetadata(courseId, { skills: newSkills })

    await revalidateCourseRoutes(courseId)
    return { success: true, metadata: updated }
}

/**
 * Save teachers list to course metadataJson
 */
export async function saveCourseTeachersAction(
    courseId: string,
    teachers: any[]
): Promise<{ success: boolean; teachers: any[] }> {
    const session = await auth()
    if (!session || !canEditCourse(session.user)) {
        throw new Error("Unauthorized: Insufficient permissions to edit course teachers")
    }

    // A8: teachers may only edit courses they own.
    await assertManagedCourseForAction(toCourseAccessUser(session.user), courseId, "edit")

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, slug: true, metadataJson: true },
    })

    if (!course) {
        throw new Error("Course not found")
    }

    let meta: any = {}
    if (course.metadataJson) {
        try {
            meta = JSON.parse(course.metadataJson)
        } catch {
            meta = {}
        }
    }

    meta.teachers = teachers

    await prisma.course.update({
        where: { id: courseId },
        data: { metadataJson: JSON.stringify(meta) },
    })

    await revalidateCourseRoutes(courseId)

    await logContentAudit({
        entityId: courseId,
        entityType: "COURSE",
        action: "UPDATE",
        details: { teachersCount: teachers.length },
    })

    return { success: true, teachers }
}
