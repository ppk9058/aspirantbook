/**
 * Lesson duration + lesson kind helpers.
 *
 * One place decides:
 *  - whether a lesson is a video lesson or a document lesson
 *  - what duration to display (and that document lessons show none)
 *  - how a real duration (minutes, from the video metadata) is formatted
 *
 * The admin form, the lesson list, the player and the course detail page all
 * import from here so the same stored value is shown everywhere.
 */

export interface LessonMediaLike {
  type?: string | null
  videoUrl?: string | null
  attachmentUrl?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
  duration?: number | null
  durationText?: string | null
}

/** A lesson with real video media (or declared as a video lecture). */
export function isVideoLesson(lesson: LessonMediaLike | null | undefined): boolean {
  if (!lesson) return false
  const videoUrl = typeof lesson.videoUrl === "string" ? lesson.videoUrl.trim() : ""
  if (videoUrl) return true
  return (lesson.type || "").toUpperCase() === "VIDEO"
}

/** A document / reading lesson: no video media, so it must never show a video player. */
export function isDocumentLesson(lesson: LessonMediaLike | null | undefined): boolean {
  if (!lesson) return false
  return !isVideoLesson(lesson)
}

/** True when a lesson has an attachment worth a View / Download button. */
export function hasLessonDocument(lesson: LessonMediaLike | null | undefined): boolean {
  if (!lesson) return false
  return Boolean(lesson.attachmentUrl || lesson.attachmentName)
}

/**
 * Parses a human duration string into minutes.
 * Accepts "1h 45m 00s", "1h 45m", "1:45:00", "45 min", "45".
 */
export function parseDurationTextToMinutes(text: string | null | undefined): number | null {
  if (typeof text !== "string") return null
  const value = text.trim().toLowerCase()
  if (!value) return null

  // Clock format: 1:45:00 or 45:00
  const clock = value.match(/^(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?$/)
  if (clock) {
    const first = Number(clock[1])
    const second = Number(clock[2])
    const third = clock[3] !== undefined ? Number(clock[3]) : null
    if (third !== null) return first * 60 + second + Math.round(third / 60)
    return first + Math.round(second / 60)
  }

  const hours = value.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/)
  const minutes = value.match(/(\d+)\s*(?:m|min|mins|minute|minutes)(?![a-z])/)
  const seconds = value.match(/(\d+)\s*(?:s|sec|secs|second|seconds)/)
  const bare = value.match(/^(\d+)$/)

  const totalMinutes =
    (hours ? Number(hours[1]) * 60 : 0) +
    (minutes ? Number(minutes[1]) : 0) +
    (seconds ? Math.round(Number(seconds[1]) / 60) : 0) +
    (!hours && !minutes && !seconds && bare ? Number(bare[1]) : 0)

  if (totalMinutes <= 0) return null
  return totalMinutes
}

/** Formats minutes as "1h 45m" / "45m" / "2h". */
export function formatDurationMinutes(minutes: number | null | undefined): string | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return null
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

/**
 * Anything above this is not a single lesson's playing time in minutes; legacy
 * seed rows stored seconds in the `duration` column, so the text wins there.
 */
export const MAX_PLAUSIBLE_LESSON_MINUTES = 600

/** Stored minutes, else minutes parsed from the legacy durationText. */
export function resolveLessonDurationMinutes(
  lesson: LessonMediaLike | null | undefined
): number | null {
  if (!lesson) return null
  const parsedText = parseDurationTextToMinutes(lesson.durationText)
  if (typeof lesson.duration === "number" && lesson.duration > 0) {
    const stored = Math.round(lesson.duration)
    // A plausible stored value is authoritative (the admin flow writes it from
    // the real video metadata). An implausible one is legacy/bad data: fall back
    // to the human text when it parses.
    if (stored <= MAX_PLAUSIBLE_LESSON_MINUTES) return stored
    if (parsedText) return parsedText
    return stored
  }
  return parsedText
}

/**
 * The duration label shown in the list and the player, or null when the lesson is
 * a document lesson (documents have no playing time, so no duration is shown).
 */
export function lessonDurationLabel(lesson: LessonMediaLike | null | undefined): string | null {
  if (!lesson || isDocumentLesson(lesson)) return null
  const minutes = resolveLessonDurationMinutes(lesson)
  return formatDurationMinutes(minutes)
}
