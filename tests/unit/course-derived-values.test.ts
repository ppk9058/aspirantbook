/**
 * STEP 2 — DERIVED VALUES ONLY
 * Unit/theme/lecture counts, total hours, date ranges, "N lectures, X hours",
 * stats auto-fill, syllabus question counts, year range — all computed from entered data.
 * Tested with 1 unit, 3 units, 6 units, 12 units, 30 units.
 */
import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  deriveCourseStats,
  formatUnitDateRange,
  deriveYearRange,
  formatLectureAndHours,
  formatIstDate,
} from "../../lib/courses/derive"
import { buildSyllabusStats } from "../../lib/courses/syllabus"

interface MockLesson {
  id: string
  title: string
  duration: number
  scheduledAt: string
}

interface MockChapter {
  id: string
  title: string
  lessons: MockLesson[]
}

interface MockUnit {
  id: string
  title: string
  chapters: MockChapter[]
}

function generateMockCourse(unitCount: number, themesPerUnit = 2, lecturesPerTheme = 3) {
  const units: MockUnit[] = []
  let globalLectureIdx = 0

  for (let u = 1; u <= unitCount; u++) {
    const chapters: MockChapter[] = []
    for (let c = 1; c <= themesPerUnit; c++) {
      const lessons: MockLesson[] = []
      for (let l = 1; l <= lecturesPerTheme; l++) {
        globalLectureIdx++
        // Stagger each lecture by 1 day starting from 2026-11-01T14:30:00Z (7:00 PM IST)
        const date = new Date(Date.UTC(2026, 10, globalLectureIdx, 13, 30, 0))
        lessons.push({
          id: `les-${u}-${c}-${l}`,
          title: `Lecture ${globalLectureIdx}`,
          duration: 90, // 90 mins each = 1.5 hours
          scheduledAt: date.toISOString(),
        })
      }
      chapters.push({
        id: `ch-${u}-${c}`,
        title: `Theme ${c} of Unit ${u}`,
        lessons,
      })
    }
    units.push({
      id: `unit-${u}`,
      title: `Unit ${u}`,
      chapters,
    })
  }

  return units
}

describe("STEP 2 — DERIVED VALUES ONLY", () => {
  const testScales = [1, 3, 6, 12, 30]

  for (const count of testScales) {
    test(`derives exact counts, hours and date ranges for ${count} unit(s)`, () => {
      const units = generateMockCourse(count, 2, 3)
      const allChapters = units.flatMap((u) => u.chapters)
      const allLectures = allChapters.flatMap((c) => c.lessons)

      const expectedThemes = count * 2
      const expectedLectures = count * 2 * 3
      const expectedTotalMinutes = expectedLectures * 90
      const expectedTotalHours = Math.round((expectedTotalMinutes / 60) * 10) / 10

      // 1. Course Stats Derivation
      const stats = deriveCourseStats({ chapters: allChapters })
      assert.equal(stats.lectureCount, expectedLectures, `Lecture count must equal ${expectedLectures}`)
      assert.equal(stats.totalMinutes, expectedTotalMinutes, `Minutes must equal ${expectedTotalMinutes}`)
      assert.equal(stats.totalHours, expectedTotalHours, `Hours must equal ${expectedTotalHours}`)

      // First and last class dates must match earliest and latest lecture
      assert.ok(stats.firstClassDate)
      assert.ok(stats.lastClassDate)
      assert.equal(stats.firstClassDate?.toISOString(), allLectures[0].scheduledAt)
      assert.equal(stats.lastClassDate?.toISOString(), allLectures[allLectures.length - 1].scheduledAt)

      // 2. Unit-level date ranges
      for (let i = 0; i < units.length; i++) {
        const u = units[i]
        const unitRange = formatUnitDateRange({ chapters: u.chapters })
        assert.ok(unitRange.length > 0, `Unit ${i + 1} must have a formatted date range`)
        const uLessons = u.chapters.flatMap((c) => c.lessons)
        const expectedStart = formatIstDate(uLessons[0].scheduledAt)
        const expectedEnd = formatIstDate(uLessons[uLessons.length - 1].scheduledAt)
        assert.equal(unitRange, `${expectedStart} – ${expectedEnd}`)
      }

      // 3. "N lectures, X hours" string derivation
      const formattedEn = formatLectureAndHours(stats.lectureCount, stats.totalHours, "en")
      assert.equal(formattedEn, `${expectedLectures} lectures • ${expectedTotalHours} hours`)

      const formattedHi = formatLectureAndHours(stats.lectureCount, stats.totalHours, "hi")
      assert.equal(formattedHi, `${expectedLectures} लेक्चर्स • ${expectedTotalHours} घंटे`)
    })
  }

  test("derives year range from question years (derived, not typed)", () => {
    // Normal year spread
    assert.deepEqual(deriveYearRange([2019, 2020, 2021, 2024, 2025]), {
      en: "2019 to 2025",
      hi: "2019 से 2025",
    })

    // Single year
    assert.deepEqual(deriveYearRange([2024]), {
      en: "2024",
      hi: "2024",
    })

    // Out-of-order strings with duplicates
    assert.deepEqual(deriveYearRange(["2023", "2018", "2023", "2021"]), {
      en: "2018 to 2023",
      hi: "2018 से 2023",
    })

    // Empty list
    assert.deepEqual(deriveYearRange([]), {
      en: "",
      hi: "",
    })
  })

  test("derives syllabus question counts cleanly via buildSyllabusStats", () => {
    const mockLookup = (sub: string, top: string | null) => {
      if (sub === "Polity") return [{ year: 2021, count: 12 }, { year: 2022, count: 15 }]
      if (sub === "History") return [{ year: 2020, count: 8 }, { year: 2022, count: 10 }]
      return []
    }

    const sections = [
      { id: "sec-1", title: "Indian Polity", pyqSubject: "Polity", pyqTopic: null },
      { id: "sec-2", title: "Modern History", pyqSubject: "History", pyqTopic: null },
      { id: "sec-3", title: "Ethics", pyqSubject: "Ethics", pyqTopic: null }, // no rows
      { id: "sec-4", title: "General Orientation" }, // unlinked
    ]

    const stats = buildSyllabusStats(sections, mockLookup)
    assert.equal(stats[0].totalQuestions, 27)
    assert.equal(stats[0].hasPyqData, true)

    assert.equal(stats[1].totalQuestions, 18)
    assert.equal(stats[1].hasPyqData, true)

    assert.equal(stats[2].totalQuestions, 0)
    assert.equal(stats[2].hasPyqData, false)

    assert.equal(stats[3].totalQuestions, 0)
    assert.equal(stats[3].hasPyqData, false)
  })
})
