/**
 * Course and Lesson Data Transfer Objects (DTO)
 *
 * Enforces explicit allow-list projection of course and lesson data to clients.
 * When viewer has no access (not enrolled, not admin, not free course):
 * Strips videoUrl, links, attachments, notes/PDF urls, and content fields
 * from every non-trial lesson. Trial lessons keep theirs.
 */

export interface SafeLessonDto {
  id: string
  title: string
  /** Hindi title — public metadata, never gated. */
  titleHi?: string | null
  type: string
  duration?: number | null
  durationText?: string | null
  order: number
  isTrial: boolean
  chapterId?: string
  /** Scheduled class time — public metadata (no media). */
  scheduledAt?: Date | string | null
  // Sensitive content fields - only present if viewer has access OR lesson is a trial lesson
  videoUrl?: string | null
  content?: string | null
  /** Hindi twin of `content`; gated exactly like the English field. */
  contentHi?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
  attachmentUrl?: string | null
}

export interface SafeChapterDto {
  id: string
  title: string
  titleHi?: string | null
  order: number
  courseId?: string
  unitId?: string | null
  subtopics?: string[]
  subtopicsHi?: string[]
  lessons: SafeLessonDto[]
}

export interface SafeCourseDto {
  id: string
  title: string
  titleHi?: string | null
  subtitle?: string | null
  subtitleHi?: string | null
  slug: string
  description?: string | null
  descriptionHi?: string | null
  thumbnailUrl?: string | null
  price?: number | null
  originalPrice?: number | null
  discountPercent?: number | null
  isPremium: boolean
  isPublished?: boolean
  status: string
  technology?: string | null
  difficulty?: string | null
  rating?: number | null
  enrollmentCount?: number
  duration?: number | null
  expiresAt?: string | null
  metadataJson?: string | null
  chapters: SafeChapterDto[]
  totalAttachments?: number
}

/**
 * Transforms a raw lesson into a safe DTO according to viewer access.
 */
export function toSafeLessonDto(
  rawLesson: any,
  hasAccess: boolean,
  allowTrialMedia: boolean = true,
  isFreeTutorial: boolean = false
): SafeLessonDto {
  if (!rawLesson) return rawLesson

  const isTrial = Boolean(rawLesson.isTrial)
  // Only reveal video/content if user has access, or if trial media is explicitly permitted for preview
  const isUnlocked = hasAccess || (isTrial && allowTrialMedia)

  const safe: SafeLessonDto = {
    id: rawLesson.id,
    title: rawLesson.title,
    titleHi: rawLesson.titleHi ?? null,
    type: rawLesson.type || "VIDEO",
    duration: rawLesson.duration ?? null,
    durationText: rawLesson.durationText ?? null,
    order: rawLesson.order ?? 0,
    isTrial,
    chapterId: rawLesson.chapterId,
    scheduledAt: rawLesson.scheduledAt ?? null,
  }

  // Free text tutorials are public by spec: lesson content is readable by guests and logged-in users alike.
  // Paid courses and sensitive video media remain strictly protected by isUnlocked.
  // Sliced preview content for gated lessons is explicitly allowed through.
  const allowContent =
    isUnlocked ||
    Boolean((rawLesson as any).isLockedForGuest) ||
    (isFreeTutorial && rawLesson.type !== "VIDEO" && !rawLesson.videoUrl)

  if (allowContent) {
    safe.content = rawLesson.content ?? null
    safe.contentHi = rawLesson.contentHi ?? null
  } else {
    safe.content = null
    safe.contentHi = null
  }

  if (isUnlocked) {
    safe.videoUrl = rawLesson.videoUrl ?? null
    safe.attachmentType = rawLesson.attachmentType ?? null
    safe.attachmentName = rawLesson.attachmentName ?? null
    safe.attachmentUrl = rawLesson.attachmentUrl ?? null
  } else {
    // Viewer has no access and media is not allowed: strip all content and links
    safe.videoUrl = null
    safe.attachmentType = null
    safe.attachmentName = null
    safe.attachmentUrl = null
  }

  if ((rawLesson as any).isLockedForGuest) {
    ;(safe as any).isLockedForGuest = true
    ;(safe as any).gateTitle = (rawLesson as any).gateTitle
    ;(safe as any).gateSubtitle = (rawLesson as any).gateSubtitle
    ;(safe as any).effectivePercentage = (rawLesson as any).effectivePercentage !== undefined ? (rawLesson as any).effectivePercentage : 0
    ;(safe as any).totalItemsCount = (rawLesson as any).totalItemsCount
    ;(safe as any).previewCount = (rawLesson as any).previewCount
    ;(safe as any).gateMode = (rawLesson as any).gateMode
  }

  return safe
}

/**
 * Transforms a raw chapter into a safe DTO.
 */
export function toSafeChapterDto(
  rawChapter: any,
  hasAccess: boolean,
  allowTrialMedia: boolean = true,
  isFreeTutorial: boolean = false
): SafeChapterDto {
  if (!rawChapter) return rawChapter

  return {
    id: rawChapter.id,
    title: rawChapter.title,
    titleHi: rawChapter.titleHi ?? null,
    order: rawChapter.order ?? 0,
    courseId: rawChapter.courseId,
    unitId: rawChapter.unitId ?? null,
    subtopics: Array.isArray(rawChapter.subtopics) ? rawChapter.subtopics : [],
    subtopicsHi: Array.isArray(rawChapter.subtopicsHi) ? rawChapter.subtopicsHi : [],
    gateMode: rawChapter.gateMode || "inherit",
    previewPercentage: rawChapter.previewPercentage,
    lessons: Array.isArray(rawChapter.lessons)
      ? rawChapter.lessons.map((l: any) => toSafeLessonDto(l, hasAccess, allowTrialMedia, isFreeTutorial))
      : [],
  } as any
}

/**
 * Transforms a raw course into a safe DTO with strict allow-list fields.
 */
export function toSafeCourseDto(
  rawCourse: any,
  hasAccess: boolean,
  allowTrialMedia: boolean = true
): SafeCourseDto {
  if (!rawCourse) return rawCourse

  const isPaidCourse = Boolean(rawCourse.isPremium || (rawCourse.price && rawCourse.price > 0))
  let isFreeTutorial = false
  if (!isPaidCourse) {
    if (rawCourse.metadataJson) {
      try {
        const meta = typeof rawCourse.metadataJson === "string" ? JSON.parse(rawCourse.metadataJson) : rawCourse.metadataJson
        if (meta?.format === "tutorial") isFreeTutorial = true
      } catch {}
    }
    if (!isFreeTutorial && rawCourse.externalId) {
      isFreeTutorial = true
    }
  }

  const chapters: SafeChapterDto[] = Array.isArray(rawCourse.chapters)
    ? rawCourse.chapters.map((ch: any) => toSafeChapterDto(ch, hasAccess, allowTrialMedia, isFreeTutorial))
    : []

  // Count total attachments across all chapters if present
  let totalAttachments = 0
  if (Array.isArray(rawCourse.chapters)) {
    for (const ch of rawCourse.chapters) {
      if (Array.isArray(ch.lessons)) {
        for (const l of ch.lessons) {
          if (l.attachmentName || l.attachmentType || l.attachmentUrl) {
            totalAttachments++
          }
        }
      }
    }
  }

  return {
    id: rawCourse.id,
    title: rawCourse.title,
    titleHi: rawCourse.titleHi ?? null,
    subtitle: rawCourse.subtitle ?? null,
    subtitleHi: rawCourse.subtitleHi ?? null,
    slug: rawCourse.slug,
    description: rawCourse.description ?? null,
    descriptionHi: rawCourse.descriptionHi ?? null,
    thumbnailUrl: rawCourse.thumbnailUrl ?? null,
    price: rawCourse.price ?? null,
    originalPrice: rawCourse.originalPrice ?? null,
    discountPercent: rawCourse.discountPercent ?? null,
    isPremium: Boolean(rawCourse.isPremium),
    isPublished: rawCourse.isPublished !== undefined ? Boolean(rawCourse.isPublished) : undefined,
    status: rawCourse.status || "PUBLISHED",
    technology: rawCourse.technology ?? null,
    difficulty: rawCourse.difficulty ?? null,
    rating: rawCourse.rating ?? null,
    enrollmentCount: rawCourse.enrollmentCount ?? 0,
    duration: rawCourse.duration ?? null,
    expiresAt: rawCourse.expiresAt ?? null,
    metadataJson: rawCourse.metadataJson ?? null,
    chapters,
    totalAttachments,
  }
}
