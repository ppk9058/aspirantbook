/**
 * RFC 5545 (.ics) generation — timezone-free UTC output, IST for display surfaces.
 *
 * Rules implemented here:
 *  - CRLF line endings everywhere
 *  - 75-octet line folding with a single leading space on continuation lines
 *  - text escaping for `,` `;` `\` and newlines
 *  - stable UIDs + DTSTAMP so a re-download does not duplicate events
 */

export interface IcsLecture {
  uid: string
  title: string
  description?: string | null
  start: Date | null
  durationMinutes?: number | null
  url?: string | null
  location?: string | null
}

const CRLF = "\r\n"
const MAX_OCTETS = 75
const DEFAULT_DURATION_MINUTES = 60

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0")
}

/** `YYYYMMDDTHHMMSSZ` — the only date form we emit (UTC, per RFC 5545 §3.3.5). */
export function toIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** Escapes a TEXT value per RFC 5545 §3.3.11. */
export function escapeIcsText(value: string): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
}

/**
 * Folds a content line into chunks of at most 75 octets (not characters),
 * never splitting a multi-byte UTF-8 sequence.
 */
export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= MAX_OCTETS) return line

  const parts: string[] = []
  let current = ""
  let currentBytes = 0
  // Reserve one octet for the leading space on continuation lines.
  let limit = MAX_OCTETS

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8")
    if (currentBytes + charBytes > limit) {
      parts.push(current)
      current = ""
      currentBytes = 0
      limit = MAX_OCTETS - 1
    }
    current += char
    currentBytes += charBytes
  }
  if (current.length > 0) parts.push(current)

  return parts[0] + parts.slice(1).map((part) => CRLF + " " + part).join("")
}

function pushLine(lines: string[], line: string) {
  lines.push(foldIcsLine(line))
}

function eventLines(lecture: IcsLecture, now: Date, calendarName: string | null): string[] {
  if (!lecture.start) return []
  const start = lecture.start
  const end = new Date(start.getTime() + (lecture.durationMinutes || DEFAULT_DURATION_MINUTES) * 60 * 1000)
  const lines: string[] = []
  pushLine(lines, "BEGIN:VEVENT")
  pushLine(lines, `UID:${escapeIcsText(lecture.uid)}`)
  pushLine(lines, `DTSTAMP:${toIcsUtc(now)}`)
  pushLine(lines, `DTSTART:${toIcsUtc(start)}`)
  pushLine(lines, `DTEND:${toIcsUtc(end)}`)
  pushLine(lines, `SUMMARY:${escapeIcsText(lecture.title)}`)
  if (lecture.description) pushLine(lines, `DESCRIPTION:${escapeIcsText(lecture.description)}`)
  if (lecture.location) pushLine(lines, `LOCATION:${escapeIcsText(lecture.location)}`)
  if (calendarName) pushLine(lines, `CATEGORIES:${escapeIcsText(calendarName)}`)
  if (lecture.url) pushLine(lines, `URL:${escapeIcsText(lecture.url)}`)
  pushLine(lines, "STATUS:CONFIRMED")
  pushLine(lines, "END:VEVENT")
  return lines
}

function wrapCalendar(events: string[][], now: Date, calendarName: string): string {
  const lines: string[] = []
  pushLine(lines, "BEGIN:VCALENDAR")
  pushLine(lines, "VERSION:2.0")
  pushLine(lines, "PRODID:-//AspirantBook//Course Studio//EN")
  pushLine(lines, "CALSCALE:GREGORIAN")
  pushLine(lines, "METHOD:PUBLISH")
  pushLine(lines, `X-WR-CALNAME:${escapeIcsText(calendarName)}`)
  for (const event of events) lines.push(...event)
  pushLine(lines, "END:VCALENDAR")
  return lines.join(CRLF) + CRLF
}

/** Single lecture .ics. `now` is injectable so DTSTAMP is deterministic in tests. */
export function buildLectureIcs(
  lecture: IcsLecture & { calendarName?: string },
  options: { now?: Date } = {}
): string {
  const now = options.now || new Date()
  const name = lecture.calendarName || "Course lecture"
  return wrapCalendar([eventLines(lecture, now, name)], now, name)
}

/** Whole-course .ics: one VEVENT per dated lecture, undated lectures are skipped. */
export function buildCourseIcs(input: {
  courseTitle: string
  courseUid: string
  lectures: IcsLecture[]
  now?: Date
}): string {
  const now = input.now || new Date()
  const events = input.lectures
    .map((lecture) => eventLines({ ...lecture, uid: `${lecture.uid}@${input.courseUid}` }, now, input.courseTitle))
    .filter((lines) => lines.length > 0)
  return wrapCalendar(events, now, input.courseTitle)
}

/** Google Calendar "add event" URL (no API key, zero cost). */
export function buildGoogleCalendarUrl(input: {
  title: string
  details?: string | null
  start: Date
  durationMinutes?: number | null
  location?: string | null
}): string {
  const start = input.start
  const end = new Date(start.getTime() + (input.durationMinutes || DEFAULT_DURATION_MINUTES) * 60 * 1000)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
  })
  if (input.details) params.set("details", input.details)
  if (input.location) params.set("location", input.location)
  // URLSearchParams encodes spaces as "+"; calendar clients expect %20.
  return `https://calendar.google.com/calendar/render?${params.toString().replace(/\+/g, "%20")}`
}

/** Filename-safe slug for the downloaded file. */
export function icsFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
  return `${slug || "course"}.ics`
}
