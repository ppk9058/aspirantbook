/**
 * Pure derivation helpers for the course detail page.
 *
 * Everything date-related formats in Asia/Kolkata so server and client render the
 * same string (avoids hydration mismatches for IST-majority learners).
 */

const IST_TIME_ZONE = "Asia/Kolkata"

export interface DeriveLesson {
  id: string
  title?: string | null
  duration?: number | null
  durationText?: string | null
  videoUrl?: string | null
  scheduledAt?: Date | string | null
}

export interface DeriveChapter {
  lessons?: DeriveLesson[] | null
}

export interface DeriveInput {
  chapters?: DeriveChapter[] | null
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Returns the parts of a Date in Asia/Kolkata. */
function istParts(date: Date): { day: number; month: number; year: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  return { day: get("day"), month: get("month"), year: get("year"), hour: get("hour") % 24, minute: get("minute") }
}

/** "3 Nov 2026" (IST). */
export function formatIstDate(date: Date | string | null | undefined): string {
  const d = toDate(date)
  if (!d) return ""
  const p = istParts(d)
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`
}

/** "1:00 AM IST". */
export function formatLectureTime(date: Date | string | null | undefined): string {
  const d = toDate(date)
  if (!d) return ""
  const p = istParts(d)
  const suffix = p.hour >= 12 ? "PM" : "AM"
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12
  return `${hour12}:${String(p.minute).padStart(2, "0")} ${suffix} IST`
}

function parseDurationMinutes(lesson: DeriveLesson): number {
  if (typeof lesson.duration === "number" && lesson.duration > 0) return lesson.duration
  const text = (lesson.durationText || "").toLowerCase()
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour)/)
  if (hours) return Math.round(Number(hours[1]) * 60)
  const minutes = text.match(/(\d+)\s*(m|min|minute)/)
  if (minutes) return Number(minutes[1])
  return 0
}

function allLessons(input: DeriveInput): DeriveLesson[] {
  return (input.chapters || []).flatMap((chapter) => chapter?.lessons || [])
}

export function recordingReady(lesson: { videoUrl?: string | null }): boolean {
  return typeof lesson.videoUrl === "string" && lesson.videoUrl.trim().length > 0
}

export interface CourseStats {
  lectureCount: number
  totalMinutes: number
  totalHours: number
  firstClassDate: Date | null
  lastClassDate: Date | null
}

export function deriveCourseStats(input: DeriveInput): CourseStats {
  const lessons = allLessons(input)
  let totalMinutes = 0
  let firstClassDate: Date | null = null
  let lastClassDate: Date | null = null

  for (const lesson of lessons) {
    totalMinutes += parseDurationMinutes(lesson)
    const scheduled = toDate(lesson.scheduledAt)
    if (!scheduled) continue
    if (!firstClassDate || scheduled < firstClassDate) firstClassDate = scheduled
    if (!lastClassDate || scheduled > lastClassDate) lastClassDate = scheduled
  }

  return {
    lectureCount: lessons.length,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    firstClassDate,
    lastClassDate,
  }
}

export interface LateJoinerResult {
  count: number
  visible: boolean
  text: string
}

/**
 * Late-joiner note. `{n}` is the number of lectures that are already available
 * (started or unscheduled) AND have a recording. Hidden when 0, or after `hideAfter`.
 */
export function deriveLateJoiner(input: {
  chapters?: DeriveChapter[] | null
  now: Date
  template?: string | null
  hideAfter?: Date | null
}): LateJoinerResult {
  const now = input.now
  let count = 0

  for (const lesson of allLessons({ chapters: input.chapters })) {
    if (!recordingReady(lesson)) continue
    const scheduled = toDate(lesson.scheduledAt)
    if (scheduled && scheduled.getTime() > now.getTime()) continue
    count += 1
  }

  if (input.hideAfter && now.getTime() > input.hideAfter.getTime()) {
    return { count, visible: false, text: "" }
  }
  if (count <= 0) return { count: 0, visible: false, text: "" }

  const template = input.template && input.template.trim().length > 0 ? input.template : null
  if (template) {
    return { count, visible: true, text: template.replace(/\{n\}/g, String(count)) }
  }
  const noun = count === 1 ? "lecture is" : "lectures are"
  return { count, visible: true, text: `${count} ${noun} already recorded — start from the beginning and catch up.` }
}

/** "Started 1 Nov 2026" / "Starts 1 Dec 2026" / "" when unknown. */
export function deriveStartLabel(firstClassDate: Date | string | null | undefined, now: Date): string {
  const date = toDate(firstClassDate)
  if (!date) return ""
  const verb = date.getTime() <= now.getTime() ? "Started" : "Starts"
  return `${verb} ${formatIstDate(date)}`
}

export function unitDateRange(input: DeriveInput): { start: Date | null; end: Date | null } {
  const stats = deriveCourseStats(input)
  return { start: stats.firstClassDate, end: stats.lastClassDate }
}

export function formatUnitDateRange(input: DeriveInput): string {
  const range = unitDateRange(input)
  if (!range.start && !range.end) return ""
  if (range.start && !range.end) return formatIstDate(range.start)
  if (!range.start && range.end) return formatIstDate(range.end)
  const startStr = formatIstDate(range.start)
  const endStr = formatIstDate(range.end)
  if (startStr === endStr) return startStr
  return `${startStr} – ${endStr}`
}

export function deriveYearRange(years: Array<number | string>): { en: string; hi: string } {
  const numYears = years
    .map((y) => (typeof y === "number" ? y : parseInt(String(y), 10)))
    .filter((y) => !Number.isNaN(y) && y > 1900 && y < 2100)
    .sort((a, b) => a - b)
  if (numYears.length === 0) return { en: "", hi: "" }
  const min = numYears[0]
  const max = numYears[numYears.length - 1]
  if (min === max) {
    return { en: String(min), hi: String(min) }
  }
  return {
    en: `${min} to ${max}`,
    hi: `${min} से ${max}`,
  }
}

export function formatLectureAndHours(lectureCount: number, totalHours: number, lang: "en" | "hi" = "en"): string {
  if (lang === "hi") {
    return `${lectureCount} लेक्चर्स • ${totalHours} घंटे`
  }
  const lUnit = lectureCount === 1 ? "lecture" : "lectures"
  const hUnit = totalHours === 1 ? "hour" : "hours"
  return `${lectureCount} ${lUnit} • ${totalHours} ${hUnit}`
}
