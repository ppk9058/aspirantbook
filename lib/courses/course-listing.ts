import { prisma } from "@/lib/prisma"
import { classifyCourse } from "@/lib/course-classifier"
import { cleanDescriptionSnippet } from "@/lib/utils"

export interface PublishedCourseItem {
  id: string
  title: string
  slug: string
  description: string
  thumbnailUrl: string | null
  difficulty: string
  rating: number
  enrollmentCount: number
  duration: number
  isPremium: boolean
  technology: string | null
  isTutorial: boolean
  goalId?: string
  category?: string
  subject?: string
  tags?: string[]
}

/**
 * Raised when the published courses catalogue query failed (connection refused,
 * pool exhausted, timeout...). It is deliberately distinct from "the query
 * succeeded with zero rows". A failure must NEVER be cached as an empty catalogue.
 */
export class CourseListingUnavailableError extends Error {
  readonly code = "COURSE_LISTING_UNAVAILABLE"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "CourseListingUnavailableError"
  }
}

export interface CourseListingSnapshot {
  courses: PublishedCourseItem[]
  available: boolean
  error?: CourseListingUnavailableError
}

export function isBuildTimePrerender(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build"
}

export async function queryPublishedCourses(): Promise<PublishedCourseItem[]> {
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { status: "PUBLISHED" },
        { isPublished: true, status: { not: "ARCHIVED" } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnailUrl: true,
      difficulty: true,
      rating: true,
      enrollmentCount: true,
      duration: true,
      isPremium: true,
      technology: true,
      chapters: {
        select: {
          lessons: {
            select: { type: true, videoUrl: true },
          },
        },
      },
    },
  })

  return courses.map((c) => {
    const classified = classifyCourse(c)
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description ? cleanDescriptionSnippet(c.description, 200) : "",
      thumbnailUrl: c.thumbnailUrl,
      difficulty: c.difficulty,
      rating: c.rating,
      enrollmentCount: c.enrollmentCount,
      duration: c.duration,
      isPremium: c.isPremium,
      technology: c.technology,
      isTutorial: classified.isTutorial,
      goalId: classified.goalId,
      category: classified.category,
      subject: classified.subject,
      tags: classified.tags,
    }
  })
}

export async function fetchPublishedCoursesForListing(): Promise<PublishedCourseItem[]> {
  try {
    return await queryPublishedCourses()
  } catch (error) {
    throw new CourseListingUnavailableError(
      "The published courses query failed; no courses were read.",
      { cause: error }
    )
  }
}

export async function loadPublishedCoursesForListing(
  read: () => Promise<PublishedCourseItem[]> = fetchPublishedCoursesForListing
): Promise<CourseListingSnapshot> {
  try {
    const courses = await read()
    return { courses, available: true }
  } catch (error) {
    const unavailable =
      error instanceof CourseListingUnavailableError
        ? error
        : new CourseListingUnavailableError(
            "The published courses query failed; no courses were read.",
            { cause: error }
          )
    return { courses: [], available: false, error: unavailable }
  }
}

export function resolveCourseListingForRender(
  snapshot: CourseListingSnapshot,
  buildTime: boolean = isBuildTimePrerender()
): PublishedCourseItem[] {
  if (snapshot.available) {
    return snapshot.courses
  }

  const error =
    snapshot.error ??
    new CourseListingUnavailableError(
      "The published courses query failed; no courses were read."
    )

  if (buildTime) {
    console.error(
      "[courses] build ran without a readable database; skipping the catalogue data " +
        "(the boot health check revalidates this route before traffic is served)",
      error
    )
    return []
  }

  console.error(
    "[courses] published courses could not be read at request time; keeping the last good page",
    error
  )
  throw error
}
