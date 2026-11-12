import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  calculatePackageMetricsSummary,
  computePackageMetrics,
  isAnalyticsUser,
  getAnalyticsUserWhere,
} from "../../lib/exam/metrics"
import {
  formatTestType,
  formatDifficulty,
  formatLanguage,
} from "../../lib/exam/labels"
import { SYSTEM_SERIES_SLUGS } from "../../lib/exam/ensure-system-series"

describe("Exam Metrics & Single Source of Truth Tests", () => {
  test("calculatePackageMetricsSummary correctly computes status and attempt counts", () => {
    const mockTests = [
      { id: "t1", isPublished: true, isArchived: false, attempts: 10, marks: 100 },
      { id: "t2", isPublished: false, isArchived: false, attempts: 5, marks: 50 },
      { id: "t3", isPublished: true, isArchived: true, attempts: 2, marks: 100 },
      { id: "t4", isPublished: false, isArchived: true, attempts: 0, marks: 50 },
    ]

    const summary = calculatePackageMetricsSummary(mockTests)
    assert.equal(summary.total, 4)
    assert.equal(summary.published, 1)
    assert.equal(summary.draft, 1)
    assert.equal(summary.archived, 2)
    assert.equal(summary.attempts, 17)
  })

  test("calculatePackageMetricsSummary handles empty array safely", () => {
    const summary = calculatePackageMetricsSummary([])
    assert.equal(summary.total, 0)
    assert.equal(summary.published, 0)
    assert.equal(summary.draft, 0)
    assert.equal(summary.archived, 0)
    assert.equal(summary.attempts, 0)
  })

  test("computePackageMetrics calculates average score percentage correctly without zero division", () => {
    const seriesWithTests = {
      id: "series-1",
      tests: [
        {
          id: "t1",
          isPublished: true,
          isArchived: false,
          marks: 100,
          attempts: [
            { score: 80, user: { role: "STUDENT", email: "s1@test.com" } },
            { score: 60, user: { role: "STUDENT", email: "s2@test.com" } },
            // Staff attempt should be excluded
            { score: 100, user: { role: "ADMIN", email: "admin@test.com" } },
          ],
        },
      ],
    }

    const metrics = computePackageMetrics(seriesWithTests, false)
    assert.equal(metrics.testsTotal, 1)
    assert.equal(metrics.testsPublished, 1)
    assert.equal(metrics.attemptsTotal, 2) // excluding staff
    assert.equal(metrics.uniqueStudents, 2)
    assert.equal(metrics.classAverageScore, 70) // (80 + 60) / 2 = 70
    assert.equal(metrics.classAveragePercentage, 70)
  })

  test("computePackageMetrics safely handles series with 0 attempts and 0 tests", () => {
    const emptySeries = { id: "empty", tests: [] }
    const metrics = computePackageMetrics(emptySeries)
    assert.equal(metrics.testsTotal, 0)
    assert.equal(metrics.testsPublished, 0)
    assert.equal(metrics.attemptsTotal, 0)
    assert.equal(metrics.uniqueStudents, 0)
    assert.equal(metrics.classAverageScore, 0)
    assert.equal(metrics.classAveragePercentage, 0)
  })

  test("isAnalyticsUser correctly filters out staff and test emails", () => {
    assert.equal(isAnalyticsUser({ role: "STUDENT", email: "student@example.com" }), true)
    assert.equal(isAnalyticsUser({ role: "ADMIN", email: "student@example.com" }), false)
    assert.equal(isAnalyticsUser({ role: "TEACHER", email: "student@example.com" }), false)
    // The @test.local exclusion is deliberately disabled when APP_ENV=test so
    // the Docker fixtures are measurable; pin the environment this asserts.
    const previousAppEnv = process.env.APP_ENV
    process.env.APP_ENV = "production"
    try {
      assert.equal(isAnalyticsUser({ role: "STUDENT", email: "user@test.local" }), false)
    } finally {
      process.env.APP_ENV = previousAppEnv
    }
    assert.equal(isAnalyticsUser({ role: "STUDENT", email: "test-bot@aspirant.com" }), false)
  })

  test("getAnalyticsUserWhere returns role excluding staff and test domains", () => {
    const where = getAnalyticsUserWhere(false)
    assert.deepEqual(where.role, { notIn: ["ADMIN", "TEACHER"] })
    assert.ok(Array.isArray(where.NOT))
  })
})

describe("Exam Labels & Enums Formatting Tests", () => {
  test("formatTestType maps test types correctly", () => {
    assert.equal(formatTestType("FULL_MOCK"), "Full Mock")
    assert.equal(formatTestType("SECTIONAL"), "Sectional Test")
    assert.equal(formatTestType("CHAPTER"), "Chapter Quiz")
    assert.equal(formatTestType("PYQ"), "Previous Year Paper")
    assert.equal(formatTestType("DAILY_QUIZ"), "Daily Quiz")
    assert.equal(formatTestType("UNKNOWN"), "UNKNOWN")
  })

  test("formatDifficulty maps difficulties correctly", () => {
    assert.equal(formatDifficulty("EASY"), "Easy")
    assert.equal(formatDifficulty("MEDIUM"), "Medium")
    assert.equal(formatDifficulty("HARD"), "Hard")
  })

  test("formatLanguage maps language codes correctly", () => {
    assert.equal(formatLanguage("en"), "English")
    assert.equal(formatLanguage("hi"), "Hindi")
    assert.equal(formatLanguage("bilingual"), "Bilingual")
  })
})

describe("System Series Slugs Tests", () => {
  test("SYSTEM_SERIES_SLUGS contains unassigned tests system series", () => {
    assert.ok(SYSTEM_SERIES_SLUGS.includes("unassigned-tests-system-series"))
    assert.ok(SYSTEM_SERIES_SLUGS.includes("current-affairs-system-series"))
    assert.ok(SYSTEM_SERIES_SLUGS.includes("pyq-system-series"))
  })
})
