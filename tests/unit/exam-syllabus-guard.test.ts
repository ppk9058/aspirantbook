import test, { describe } from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ExamSyllabusSection } from "../../components/course/detail/ExamSyllabusSection"

describe("ExamSyllabusSection Guards & Localization", () => {
  test("prevents NaN in tabs, header, and info box when counts are undefined", () => {
    const mockPapers: any = [
      {
        id: "p1",
        key: "GS1",
        title: "General Studies Paper I",
        titleHi: "सामान्य अध्ययन पेपर 1",
        marks: null,
        durationMinutes: null,
        sections: [
          {
            id: "s1",
            title: "Modern History",
            totalQuestions: undefined, // Simulates missing / undefined count
            byYear: [],
            subtopics: ["National Movement"],
          },
          {
            id: "s2",
            title: "New Syllabus Section", // Placeholder section name
            totalQuestions: 0,
            byYear: [],
            subtopics: [],
          },
        ],
      },
    ]

    // Render English
    const htmlEn = renderToStaticMarkup(
      React.createElement(ExamSyllabusSection, {
        lang: "en",
        papers: mockPapers,
        courseCategory: "UPSC",
      })
    )

    assert.ok(!htmlEn.includes("NaN"), `HTML contains NaN: ${htmlEn}`)
    assert.ok(!htmlEn.includes("New Syllabus Section"), "Should not render placeholder section name")
    assert.ok(!htmlEn.includes("BPSC"), "Should not contain BPSC leak")

    // Render Hindi
    const htmlHi = renderToStaticMarkup(
      React.createElement(ExamSyllabusSection, {
        lang: "hi",
        papers: mockPapers,
        courseCategory: "UPSC",
      })
    )

    assert.ok(!htmlHi.includes("NaN"), `Hindi HTML contains NaN: ${htmlHi}`)
    assert.ok(!htmlHi.includes("बीपीएससी मेन्स"), "Hindi HTML should not hardcode बीपीएससी मेन्स")
    assert.ok(!htmlHi.includes("New Syllabus Section"), "Hindi HTML should not render placeholder section name")
    assert.ok(htmlHi.includes("UPSC परीक्षाओं में") || htmlHi.includes("हाल की परीक्षाओं में") || htmlHi.includes("पाठ्यक्रम"), "Hindi HTML should use course category or generic label")
  })
})
