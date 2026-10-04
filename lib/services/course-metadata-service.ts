import { promises as fs } from "fs"
import path from "path"

import {
    CourseCustomMetadata,
    DEFAULT_FEATURES_TITLE,
    DEFAULT_FEATURES,
    DEFAULT_SKILLS_TITLE,
    DEFAULT_SKILLS,
    DEFAULT_PROJECT_COUNT,
} from "@/types/course-metadata"

export type { CourseCustomMetadata }
export {
    DEFAULT_FEATURES_TITLE,
    DEFAULT_FEATURES,
    DEFAULT_SKILLS_TITLE,
    DEFAULT_SKILLS,
    DEFAULT_PROJECT_COUNT,
}

const METADATA_FILE_PATH = path.join(process.cwd(), "data", "course-metadata.json")

// In-memory cache for fast read performance
let cachedMetadataMap: Record<string, CourseCustomMetadata> | null = null
let lastReadTime = 0
const CACHE_TTL_MS = 2000 // 2 seconds

async function readMetadataFile(): Promise<Record<string, CourseCustomMetadata>> {
    const now = Date.now()
    if (cachedMetadataMap && now - lastReadTime < CACHE_TTL_MS) {
        return cachedMetadataMap
    }

    try {
        const raw = await fs.readFile(METADATA_FILE_PATH, "utf-8")
        cachedMetadataMap = JSON.parse(raw)
        lastReadTime = now
        return cachedMetadataMap || {}
    } catch (err: any) {
        if (err.code === "ENOENT") {
            // File does not exist yet, initialize with empty map
            cachedMetadataMap = {}
            return cachedMetadataMap
        }
        console.error("Error reading course-metadata.json:", err)
        return cachedMetadataMap || {}
    }
}

async function writeMetadataFile(data: Record<string, CourseCustomMetadata>): Promise<void> {
    await fs.mkdir(path.dirname(METADATA_FILE_PATH), { recursive: true })
    await fs.writeFile(METADATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8")
    cachedMetadataMap = data
    lastReadTime = Date.now()
}

/**
 * Retrieve metadata for a course. Falls back to platform defaults if not explicitly customized yet.
 */
import { prisma } from "@/lib/prisma"

/**
 * Retrieve metadata for a course. Reads from DB Course.metadataJson first,
 * falling back to legacy course-metadata.json file (read-only), then defaults.
 */
export async function getCourseCustomMetadata(
    courseIdOrSlug: string,
    fallbackProjectCount?: number
): Promise<CourseCustomMetadata> {
    // 1. Try reading from database Course.metadataJson first
    try {
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
    } catch (e) {
        // Fallback to legacy file check
    }

    // 2. Legacy disk fallback (read-only)
    const map = await readMetadataFile()
    const found = map[courseIdOrSlug]

    if (found) {
        return {
            courseId: courseIdOrSlug,
            featuresTitle: found.featuresTitle || DEFAULT_FEATURES_TITLE,
            features: Array.isArray(found.features) && found.features.length > 0 ? found.features : DEFAULT_FEATURES,
            projectCount:
                found.projectCount !== undefined && found.projectCount !== null
                    ? found.projectCount
                    : fallbackProjectCount ?? DEFAULT_PROJECT_COUNT,
            skillsTitle: found.skillsTitle || DEFAULT_SKILLS_TITLE,
            skills: Array.isArray(found.skills) && found.skills.length > 0 ? found.skills : DEFAULT_SKILLS,
            updatedAt: found.updatedAt,
        }
    }

    return {
        courseId: courseIdOrSlug,
        featuresTitle: DEFAULT_FEATURES_TITLE,
        features: [...DEFAULT_FEATURES],
        projectCount: fallbackProjectCount ?? DEFAULT_PROJECT_COUNT,
        skillsTitle: DEFAULT_SKILLS_TITLE,
        skills: [...DEFAULT_SKILLS],
    }
}

/**
 * Persist updates to a course's custom metadata directly in Course.metadataJson.
 * Never writes to data/course-metadata.json.
 */
export async function saveCourseCustomMetadata(
    courseId: string,
    updates: Partial<CourseCustomMetadata>
): Promise<CourseCustomMetadata> {
    const existing = await getCourseCustomMetadata(courseId)

    const updated: CourseCustomMetadata = {
        ...existing,
        ...updates,
        courseId,
        features: updates.features !== undefined ? updates.features : existing.features,
        skills: updates.skills !== undefined ? updates.skills : existing.skills,
        updatedAt: new Date().toISOString(),
    }

    try {
        const course = await prisma.course.findFirst({
            where: {
                OR: [{ id: courseId }, { slug: courseId }],
            },
            select: { id: true, metadataJson: true },
        })

        if (course) {
            let metaJsonObj: Record<string, any> = {}
            if (course.metadataJson) {
                try {
                    metaJsonObj = JSON.parse(course.metadataJson)
                } catch {}
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
        }
    } catch (err) {
        console.error("Failed to persist course custom metadata to Course.metadataJson:", err)
    }

    return updated
}
