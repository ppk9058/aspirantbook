/**
 * P3: syllabus statistics + rating distribution (pure parts).
 * Written before the implementation.
 */
import assert from "node:assert/strict"
import { test, describe } from "node:test"

import { buildSyllabusStats, mostAskedOrder, type PyqYearCount } from "../../lib/courses/syllabus"
import { deriveRatingDistribution } from "../../lib/courses/ratings"

describe("syllabus stats", () => {
  const sections = [
    { id: "s1", title: "Modern History", pyqSubject: "History", pyqTopic: "Modern" },
    { id: "s2", title: "Polity", pyqSubject: "Polity", pyqTopic: null },
    { id: "s3", title: "No PYQ link", pyqSubject: null, pyqTopic: null },
  ]
  const counts: Record<string, PyqYearCount[]> = {
    "History|Modern": [
      { year: 2024, count: 12 },
      { year: 2023, count: 8 },
    ],
    "Polity|": [
      { year: 2024, count: 20 },
      { year: 2022, count: 5 },
    ],
  }
  const lookup = (subject: string, topic: string | null) => counts[`${subject}|${topic ?? ""}`] || []

  test("maps real per-year question counts per section", () => {
    const stats = buildSyllabusStats(sections, lookup)
    assert.equal(stats.length, 3)
    assert.equal(stats[0].totalQuestions, 20)
    assert.deepEqual(stats[0].byYear, [
      { year: 2024, count: 12 },
      { year: 2023, count: 8 },
    ])
    assert.equal(stats[0].yearsPresent, 2)
    assert.equal(stats[0].hasPyqData, true)
  })

  test("sections without a PYQ link degrade gracefully (no fake numbers)", () => {
    const stats = buildSyllabusStats(sections, lookup)
    assert.equal(stats[2].totalQuestions, 0)
    assert.deepEqual(stats[2].byYear, [])
    assert.equal(stats[2].hasPyqData, false)
  })

  test("most-asked ordering is by real question count only", () => {
    const stats = buildSyllabusStats(sections, lookup)
    const ordered = mostAskedOrder(stats)
    assert.deepEqual(
      ordered.map((s) => s.id),
      ["s2", "s1"]
    )
    // Sections with zero questions are never presented as "most asked".
    assert.equal(ordered.some((s) => s.id === "s3"), false)
  })
})

describe("rating distribution", () => {
  test("counts real reviews and computes percentages", () => {
    const result = deriveRatingDistribution([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 1 }])
    assert.equal(result.total, 4)
    assert.equal(result.average, 3.8)
    assert.deepEqual(
      result.buckets.map((b) => [b.stars, b.count, b.percent]),
      [
        [5, 2, 50],
        [4, 1, 25],
        [3, 0, 0],
        [2, 0, 0],
        [1, 1, 25],
      ]
    )
    assert.equal(result.visible, true)
  })

  test("hides the section when there are no reviews", () => {
    const result = deriveRatingDistribution([])
    assert.equal(result.visible, false)
    assert.equal(result.average, 0)
    assert.equal(result.total, 0)
  })

  test("ignores out-of-range ratings instead of inventing data", () => {
    const result = deriveRatingDistribution([{ rating: 9 }, { rating: 0 }, { rating: 4 }])
    assert.equal(result.total, 1)
    assert.equal(result.average, 4)
  })
})
