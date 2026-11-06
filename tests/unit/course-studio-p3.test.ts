/**
 * P3 pure-logic tests (written before the implementations).
 * No database access.
 */
import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { buildLectureIcs, buildCourseIcs, buildGoogleCalendarUrl, foldIcsLine, escapeIcsText } from "../../lib/calendar/ics"
import {
  deriveCourseStats,
  deriveLateJoiner,
  deriveStartLabel,
  recordingReady,
  formatIstDate,
  unitDateRange,
  formatLectureTime,
} from "../../lib/courses/derive"
import { normalizePhoneToE164, isE164 } from "../../lib/courses/phone"
import { parseCourseMetadata, stripUnsafeImageUrl, DEFAULT_SECTION_FLAGS } from "../../lib/courses/metadata-schema"
import { toSafeLessonDto, toSafeCourseDto } from "../../lib/courses/course-dto"

const IST = (iso: string) => new Date(iso)

describe("ICS generator (RFC 5545)", () => {
  test("CRLF line endings, stable UID, DTSTAMP, UTC DTSTART", () => {
    const ics = buildLectureIcs({
      uid: "lesson-123@aspirantbook",
      title: "Polity Lecture 1",
      description: "Constitutional framework",
      start: IST("2026-11-02T09:30:00.000Z"),
      durationMinutes: 90,
      url: "https://example.com/courses/x/learn/y",
    })
    assert.ok(ics.includes("\r\n"))
    assert.ok(!/[^\r]\n/.test(ics), "every LF must be preceded by CR")
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"))
    assert.ok(ics.includes("UID:lesson-123@aspirantbook"))
    assert.ok(ics.includes("DTSTART:20261102T093000Z"))
    assert.ok(ics.includes("DTEND:20261102T110000Z"))
    assert.ok(/\r\nDTSTAMP:\d{8}T\d{6}Z\r\n/.test(ics))
    assert.ok(ics.trimEnd().endsWith("END:VCALENDAR"))
  })

  test("text escaping and 75-octet folding", () => {
    assert.equal(escapeIcsText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne")
    const long = "SUMMARY:" + "x".repeat(200)
    const folded = foldIcsLine(long)
    const lines = folded.split("\r\n")
    assert.ok(lines.length > 1)
    for (const line of lines) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75, `line too long: ${line.length}`)
    }
    assert.equal(folded.replace(/\r\n /g, ""), long)
  })

  test("multi-byte characters fold on octet boundaries without splitting UTF-8", () => {
    const line = "SUMMARY:" + "हिंदी".repeat(40)
    const folded = foldIcsLine(line)
    for (const part of folded.split("\r\n")) {
      assert.ok(Buffer.byteLength(part, "utf8") <= 75)
      assert.ok(!part.includes("\uFFFD"))
    }
    assert.equal(Buffer.from(folded.replace(/\r\n /g, ""), "utf8").toString("utf8"), line)
  })

  test("course export produces one VEVENT per lecture and skips undated lessons", () => {
    const ics = buildCourseIcs({
      courseTitle: "UPSC GS Foundation",
      courseUid: "course-abc",
      lectures: [
        { uid: "l1", title: "L1", start: IST("2026-11-02T09:30:00.000Z"), durationMinutes: 60 },
        { uid: "l2", title: "L2", start: null as any, durationMinutes: 60 },
        { uid: "l3", title: "L3", start: IST("2026-11-04T09:30:00.000Z"), durationMinutes: 60 },
      ],
    })
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2)
    assert.ok(ics.includes("L1"))
    assert.ok(ics.includes("L3"))
    assert.ok(!ics.includes("SUMMARY:L2"))
  })

  test("Google Calendar URL is encoded and dated in UTC", () => {
    const url = buildGoogleCalendarUrl({
      title: "Polity & Governance",
      details: "Bring notes",
      start: IST("2026-11-02T09:30:00.000Z"),
      durationMinutes: 90,
      location: "Online",
    })
    assert.ok(url.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE&"))
    assert.ok(url.includes("dates=20261102T093000Z%2F20261102T110000Z"))
    assert.ok(url.includes("text=Polity%20%26%20Governance"))
  })
})

describe("derive: course metrics", () => {
  const lessons = [
    { id: "l1", title: "A", duration: 60, videoUrl: "https://v/1", scheduledAt: IST("2026-11-01T09:30:00.000Z") },
    { id: "l2", title: "B", duration: 30, videoUrl: null, scheduledAt: IST("2026-11-08T09:30:00.000Z") },
    { id: "l3", title: "C", duration: null, durationText: "45 mins", videoUrl: "https://v/3", scheduledAt: null },
  ]

  test("counts lectures and total hours", () => {
    const stats = deriveCourseStats({ chapters: [{ lessons }] })
    assert.equal(stats.lectureCount, 3)
    assert.equal(stats.totalMinutes, 135)
    assert.equal(stats.totalHours, 2.3)
  })

  test("first class date is the earliest scheduledAt", () => {
    const stats = deriveCourseStats({ chapters: [{ lessons }] })
    assert.equal(stats.firstClassDate?.toISOString(), "2026-11-01T09:30:00.000Z")
    assert.equal(stats.lastClassDate?.toISOString(), "2026-11-08T09:30:00.000Z")
  })

  test("recording ready only when a videoUrl exists", () => {
    assert.equal(recordingReady({ videoUrl: "https://v/1" }), true)
    assert.equal(recordingReady({ videoUrl: null }), false)
    assert.equal(recordingReady({ videoUrl: "   " }), false)
  })

  test("late joiner counts lectures already started that have recordings", () => {
    const now = IST("2026-11-10T00:00:00.000Z")
    const result = deriveLateJoiner({ chapters: [{ lessons }], now })
    // l1 (started, recorded) and l3 (no date, recorded) count; l2 is in the future.
    assert.equal(result.count, 2)
    assert.equal(result.visible, true)
    assert.equal(result.text, "2 lectures are already recorded — start from the beginning and catch up.")
  })

  test("late joiner hides when nothing has started or nothing is recorded", () => {
    // Only future-dated lectures -> nothing to catch up on.
    const future = deriveLateJoiner({
      chapters: [
        {
          lessons: [
            { id: "f1", duration: 60, videoUrl: "https://v/1", scheduledAt: IST("2026-12-01T09:30:00.000Z") },
          ],
        },
      ],
      now: IST("2026-10-01T00:00:00.000Z"),
    })
    assert.equal(future.visible, false)
    assert.equal(future.count, 0)

    const noRecordings = deriveLateJoiner({
      chapters: [{ lessons: [{ id: "x", duration: 10, videoUrl: null, scheduledAt: IST("2026-01-01T00:00:00.000Z") }] }],
      now: IST("2026-11-10T00:00:00.000Z"),
    })
    assert.equal(noRecordings.visible, false)
  })

  test("late joiner template supports {n} and hides when the course ended", () => {
    const result = deriveLateJoiner({
      chapters: [{ lessons }],
      now: IST("2026-11-10T00:00:00.000Z"),
      template: "Already {n} lectures in — join now.",
      hideAfter: IST("2026-11-09T00:00:00.000Z"),
    })
    assert.equal(result.visible, false)

    const custom = deriveLateJoiner({
      chapters: [{ lessons }],
      now: IST("2026-11-10T00:00:00.000Z"),
      template: "Already {n} lectures in — join now.",
    })
    assert.equal(custom.text, "Already 2 lectures in — join now.")
  })

  test("start label says Started/Starts in IST", () => {
    assert.equal(deriveStartLabel(IST("2026-11-01T09:30:00.000Z"), IST("2026-11-10T00:00:00.000Z")), "Started 1 Nov 2026")
    assert.equal(deriveStartLabel(IST("2026-12-01T09:30:00.000Z"), IST("2026-11-10T00:00:00.000Z")), "Starts 1 Dec 2026")
    assert.equal(deriveStartLabel(null, IST("2026-11-10T00:00:00.000Z")), "")
  })

  test("IST formatting is timezone-stable (no hydration mismatch)", () => {
    // 2026-11-02T19:30Z is 1:00 AM on 3 Nov in Asia/Kolkata.
    assert.equal(formatIstDate(IST("2026-11-02T19:30:00.000Z")), "3 Nov 2026")
    assert.equal(formatLectureTime(IST("2026-11-02T19:30:00.000Z")), "1:00 AM IST")
  })

  test("unit date range spans its chapters", () => {
    const range = unitDateRange({
      chapters: [{ lessons }],
    })
    assert.equal(range.start?.toISOString(), "2026-11-01T09:30:00.000Z")
    assert.equal(range.end?.toISOString(), "2026-11-08T09:30:00.000Z")
  })
})

describe("phone normalisation", () => {
  test("accepts common Indian formats", () => {
    assert.equal(normalizePhoneToE164("9876543210"), "+919876543210")
    assert.equal(normalizePhoneToE164("+91 98765 43210"), "+919876543210")
    assert.equal(normalizePhoneToE164("098765-43210"), "+919876543210")
    assert.equal(normalizePhoneToE164("91 9876543210"), "+919876543210")
  })

  test("rejects garbage and short numbers", () => {
    for (const bad of ["", "123", "abcdefghij", "0000000000", "98765", "+1 555 010 9999"]) {
      assert.equal(normalizePhoneToE164(bad), null, `expected null for ${bad}`)
    }
  })

  test("isE164", () => {
    assert.equal(isE164("+919876543210"), true)
    assert.equal(isE164("9876543210"), false)
  })
})

describe("metadata schema v2 (zod)", () => {
  test("legacy metadata without v2 keys still parses", () => {
    const parsed = parseCourseMetadata(JSON.stringify({ language: "HINDI", teachers: [{ name: "A" }] }))
    assert.equal(parsed.ok, true)
    if (parsed.ok) {
      assert.equal(parsed.data.schemaVersion, undefined)
      assert.equal(parsed.data.teachers?.[0]?.name, "A")
    }
  })

  test("unknown keys survive (passthrough)", () => {
    const parsed = parseCourseMetadata(JSON.stringify({ customEngineKey: { a: 1 } }))
    assert.equal(parsed.ok, true)
    if (parsed.ok) assert.deepEqual((parsed.data as any).customEngineKey, { a: 1 })
  })

  test("rejects wrong types with field errors", () => {
    const parsed = parseCourseMetadata(JSON.stringify({ heroMetrics: [{ value: 1 }], sections: { about: "yes" } }))
    assert.equal(parsed.ok, false)
    if (!parsed.ok) {
      assert.ok(parsed.errors.some((e) => e.startsWith("heroMetrics")))
      assert.ok(parsed.errors.some((e) => e.startsWith("sections.about")))
    }
  })

  test("enforces max lengths and array sizes", () => {
    const parsed = parseCourseMetadata(JSON.stringify({ pillTags: Array.from({ length: 50 }, () => "x") }))
    assert.equal(parsed.ok, false)

    const long = parseCourseMetadata(JSON.stringify({ subtitle: "x".repeat(500) }))
    assert.equal(long.ok, false)
  })

  test("invalid JSON is reported, not thrown", () => {
    const parsed = parseCourseMetadata("{oops")
    assert.equal(parsed.ok, false)
  })

  test("default section flags", () => {
    assert.deepEqual(DEFAULT_SECTION_FLAGS, {
      about: true,
      plan: true,
      syllabus: true,
      teachers: true,
      questions: true,
      lectures: true,
      callback: true,
    })
  })

  test("image URL guard rejects script/data URLs and allows https/uploaded paths", () => {
    assert.equal(stripUnsafeImageUrl("https://cdn.example.com/a.png"), "https://cdn.example.com/a.png")
    assert.equal(stripUnsafeImageUrl("/uploads/courses/a.png"), "/uploads/courses/a.png")
    assert.equal(stripUnsafeImageUrl("javascript:alert(1)"), null)
    assert.equal(stripUnsafeImageUrl("data:image/svg+xml;base64,AAA"), null)
    assert.equal(stripUnsafeImageUrl("  https://x/y.png  "), "https://x/y.png")
  })
})

describe("DTO sanitizer keeps new Hindi/attachment fields gated", () => {
  const rawLesson = {
    id: "l1",
    title: "Lecture",
    titleHi: "व्याख्यान",
    type: "VIDEO",
    order: 1,
    isTrial: false,
    videoUrl: "https://cdn/secret.mp4",
    content: "paid notes",
    contentHi: "पेड नोट्स",
    attachmentUrl: "https://cdn/secret.pdf",
    attachmentName: "notes.pdf",
    scheduledAt: IST("2026-11-01T09:30:00.000Z"),
  }

  test("guest gets no video/content/attachment/Hindi content", () => {
    const safe = toSafeLessonDto(rawLesson, false, false)
    assert.equal(safe.videoUrl, null)
    assert.equal(safe.content, null)
    assert.equal(safe.attachmentUrl, null)
    assert.equal((safe as any).contentHi ?? null, null)
    // Public metadata still comes through
    assert.equal(safe.titleHi, "व्याख्यान")
    assert.equal(new Date(safe.scheduledAt as any).toISOString(), "2026-11-01T09:30:00.000Z")
  })

  test("enrolled viewer gets the Hindi twin exactly like the English field", () => {
    const safe = toSafeLessonDto(rawLesson, true, true)
    assert.equal(safe.videoUrl, "https://cdn/secret.mp4")
    assert.equal((safe as any).contentHi, "पेड नोट्स")
    assert.equal(safe.attachmentUrl, "https://cdn/secret.pdf")
  })

  test("course-level Hindi fields pass through the safe course DTO", () => {
    const safe = toSafeCourseDto(
      {
        id: "c1",
        title: "T",
        titleHi: "शीर्षक",
        subtitle: "S",
        subtitleHi: "उपशीर्षक",
        slug: "s",
        description: "D",
        descriptionHi: "विवरण",
        price: 0,
        isPremium: false,
        chapters: [{ id: "ch1", title: "C", order: 1, lessons: [rawLesson] }],
      },
      false,
      false
    )
    assert.equal(safe.titleHi, "शीर्षक")
    assert.equal(safe.subtitleHi, "उपशीर्षक")
    assert.equal(safe.descriptionHi, "विवरण")
    assert.equal(safe.chapters[0].lessons[0].videoUrl, null)
  })
})
