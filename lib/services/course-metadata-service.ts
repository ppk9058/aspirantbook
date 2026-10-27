import {
    CourseCustomMetadata,
    DEFAULT_FEATURES_TITLE,
    DEFAULT_FEATURES,
    DEFAULT_SKILLS_TITLE,
    DEFAULT_SKILLS,
    DEFAULT_PROJECT_COUNT,
} from "@/types/course-metadata"
import { prisma } from "@/lib/prisma"

export type { CourseCustomMetadata }
export {
    DEFAULT_FEATURES_TITLE,
    DEFAULT_FEATURES,
    DEFAULT_SKILLS_TITLE,
    DEFAULT_SKILLS,
    DEFAULT_PROJECT_COUNT,
}

/**
 * Course custom metadata lives in `Course.metadataJson` (the database is the
 * only source of truth).
 *
 * B2: this module used to keep a module-level `cachedMetadataMap` with a 2s TTL
 * and to fall back to `data/course-metadata.json`. The cache made a save
 * invisible on other serverless instances, and the disk read resurrected stale
 * values. Both are gone. Database errors now propagate instead of being
 * swallowed, so a caller can never report success for a write that failed.
 */

export async function getCourseCustomMetadata(
    courseIdOrSlug: string,
    fallbackProjectCount?: number
): Promise<CourseCustomMetadata> {
    const course = await prisma.course.findFirst({
        where: {
            OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }],
        },
        select: { id: true, metadataJson: true },
    })

    if (course?.metadataJson) {
        const parsed = JSON.parse(course.metadataJson)
        const meta = parsed.meta || parsed
        const features = meta.includes || meta.features || parsed.features
        const skills = meta.skills || parsed.skills
        const projectCount = typeof parsed.projectCount === "number" ? parsed.projectCount : undefined
        const featuresTitle = meta.featuresTitle || meta.includesTitle || parsed.featuresTitle
        const skillsTitle = meta.skillsTitle || parsed.skillsTitle

        if (features || skills || projectCount !== undefined) {
            return {
                courseId: course.id,
                featuresTitle: featuresTitle || DEFAULT_FEATURES_TITLE,
                features: Array.isArray(features) && features.length > 0 ? features : DEFAULT_FEATURES,
                projectCount: projectCount !== undefined ? projectCount : fallbackProjectCount ?? DEFAULT_PROJECT_COUNT,
                skillsTitle: skillsTitle || DEFAULT_SKILLS_TITLE,
                skills: Array.isArray(skills) && skills.length > 0 ? skills : DEFAULT_SKILLS,
            }
        }
    }

    return {
        courseId: course?.id ?? courseIdOrSlug,
        featuresTitle: DEFAULT_FEATURES_TITLE,
        features: [...DEFAULT_FEATURES],
        projectCount: fallbackProjectCount ?? DEFAULT_PROJECT_COUNT,
        skillsTitle: DEFAULT_SKILLS_TITLE,
        skills: [...DEFAULT_SKILLS],
    }
}

/**
 * Persist updates to a course's custom metadata directly in Course.metadataJson.
 * Throws on a database error and when the course does not exist — the caller
 * must never return success for a write that did not happen.
 */
export async function saveCourseCustomMetadata(
    courseId: string,
    updates: Partial<CourseCustomMetadata>
): Promise<CourseCustomMetadata> {
    const course = await prisma.course.findFirst({
        where: {
            OR: [{ id: courseId }, { slug: courseId }],
        },
        select: { id: true, metadataJson: true },
    })

    if (!course) {
        throw new Error(`Course not found: ${courseId}`)
    }

    const updated: CourseCustomMetadata = {
        ...(await getCourseCustomMetadata(course.id)),
        ...updates,
        courseId: course.id,
        updatedAt: new Date().toISOString(),
    }

    let metaJsonObj: Record<string, any> = {}
    if (course.metadataJson) {
        try {
            metaJsonObj = JSON.parse(course.metadataJson)
        } catch {
            metaJsonObj = {}
        }
    }

    if (updates.features !== undefined) metaJsonObj.features = updates.features
    if (updates.featuresTitle !== undefined) metaJsonObj.featuresTitle = updates.featuresTitle
    if (updates.skills !== undefined) metaJsonObj.skills = updates.skills
    if (updates.skillsTitle !== undefined) metaJsonObj.skillsTitle = updates.skillsTitle
    if (updates.projectCount !== undefined) metaJsonObj.projectCount = updates.projectCount

    await prisma.course.update({
        where: { id: course.id },
        data: {
            metadataJson: JSON.stringify(metaJsonObj),
        },
    })

    return updated
}
