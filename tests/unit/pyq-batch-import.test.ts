import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { detectExamFromTag } from "../../lib/pyq/exam-detector"
import { additionalInfoText, jaccard, repetitionScore, shingles } from "../../lib/pyq/repetition"
import {
  buildSolutionJson,
  classifyHints,
  contentHash,
  needsReview,
  normalizedQuestionKey,
} from "../../lib/pyq/batch-import"
import { PYQ_TAXONOMY, findTaxonomySubject, findTaxonomyTopic } from "../../lib/pyq/taxonomy"

describe("detectExamFromTag", () => {
  test("canonical exam + year from tag", () => {
    assert.deepEqual(detectExamFromTag("[UPSC CSE 2023]"), { exam: "UPSC CSE", year: "2023" })
    assert.deepEqual(detectExamFromTag("[BPSC 68th CCE 2023]"), { exam: "BPSC 68th CCE", year: "2023" })
    assert.deepEqual(detectExamFromTag("[SSC CGL 2024]"), { exam: "SSC CGL", year: "2024" })
    assert.deepEqual(detectExamFromTag("[UPPCS 2024]"), { exam: "UPPCS", year: "2024" })
  })
  test("alias canonicalization", () => {
    assert.equal(detectExamFromTag("[UPSC 2019]").exam, "UPSC CSE")
    assert.equal(detectExamFromTag("[UPPSC 2022]").exam, "UPPCS")
    assert.equal(detectExamFromTag("[BIHAR PSC 2021]").exam, "BPSC")
  })
  test("never guesses a year", () => {
    assert.deepEqual(detectExamFromTag("[UPSC CSE]"), { exam: "UPSC CSE", year: null })
    assert.deepEqual(detectExamFromTag("none"), { exam: null, year: null })
    assert.deepEqual(detectExamFromTag(null), { exam: null, year: null })
  })
  test("unknown exam passes through verbatim", () => {
    assert.deepEqual(detectExamFromTag("[Rajasthan Police Constable 2022]"), {
      exam: "Rajasthan Police Constable",
      year: "2022",
    })
  })
  test("ordinal numbers are not years", () => {
    assert.equal(detectExamFromTag("[BPSC 70th CCE]").year, null)
  })
})

describe("repetition", () => {
  const a = "Mangroves are salt tolerant ecosystems found in coastal deltas. They protect shorelines."
  const a2 = "They protect shorelines. Mangroves are salt tolerant ecosystems found in coastal deltas."
  const b = "The Monetary Policy Committee has six members and meets bi-monthly."
  test("shingle jaccard detects near-duplicates", () => {
    const score = jaccard(shingles(a), shingles(a2))
    assert.ok(score >= 0.5, `expected >= 0.5, got ${score}`)
    assert.ok(jaccard(shingles(a), shingles(b)) < 0.2)
  })
  test("repetitionScore over reference pool", () => {
    const score = repetitionScore(a2, [a, b])
    assert.ok(score >= 0.5)
    assert.equal(repetitionScore("", [a]), 0)
  })
  test("additionalInfoText flattens sections", () => {
    const text = additionalInfoText([
      { heading: "H", points: [{ text: "Point one", sub: ["sub a"] }] },
    ])
    assert.equal(text, "H Point one sub a")
  })
})

describe("taxonomy", () => {
  test("loaded from master-taxonomy.md", () => {
    assert.ok(PYQ_TAXONOMY.length >= 18)
    assert.ok(findTaxonomySubject("Indian Polity and Constitution"))
    const top = findTaxonomyTopic("Indian Polity and Constitution", "3.3")
    assert.ok(top && top.name.includes("Parliament"))
    assert.equal(findTaxonomyTopic("Indian Polity and Constitution", "99.9"), null)
    assert.equal(findTaxonomySubject("Not A Subject"), null)
  })
})

describe("classifyHints", () => {
  test("valid hints pass through", () => {
    const r = classifyHints("Indian Polity and Constitution", "3.3 Parliament")
    assert.equal(r.sub, "Indian Polity and Constitution")
    assert.equal(r.top, "3.3 Parliament")
    assert.equal(r.classificationFlags.length, 0)
  })
  test("unknown subject flagged Uncategorized", () => {
    const r = classifyHints("Made Up Subject", null)
    assert.equal(r.sub, null)
    assert.ok(r.classificationFlags.includes("subject-not-in-taxonomy"))
  })
  test("bad topic flagged, subject kept", () => {
    const r = classifyHints("Indian Polity and Constitution", "99.9 Nope")
    assert.equal(r.sub, "Indian Polity and Constitution")
    assert.equal(r.top, null)
    assert.ok(r.classificationFlags.includes("topic-not-in-taxonomy"))
  })
  test("defaults used when hint missing", () => {
    const r = classifyHints(null, null, "Indian Economy", "5.4 Money and Monetary Policy")
    assert.equal(r.sub, "Indian Economy")
    assert.equal(r.top, "5.4 Money and Monetary Policy")
  })
})

describe("needsReview", () => {
  const clean = { check: "agree", unsure: null, flags: [], duplicate: false, repetitionMax: 0 }
  test("clean passes", () => assert.equal(needsReview(clean), false))
  test("disagree/unsure", () => {
    assert.equal(needsReview({ ...clean, check: "disagree" }), true)
    assert.equal(needsReview({ ...clean, check: "unsure" }), true)
  })
  test("unsure text", () => assert.equal(needsReview({ ...clean, unsure: "date uncertain" }), true))
  test("missing section flag", () =>
    assert.equal(needsReview({ ...clean, flags: ["missing:MEMORY TIP"] }), true))
  test("duplicate", () => assert.equal(needsReview({ ...clean, duplicate: true }), true))
  test("repetition", () => assert.equal(needsReview({ ...clean, repetitionMax: 0.6 }), true))
})

describe("dedupe keys + hashes", () => {
  test("normalized key ignores case/punct", () => {
    assert.equal(
      normalizedQuestionKey("What is GDP?", ["A) Gross", "B) Net"]),
      normalizedQuestionKey("what is  GDP?!", ["a) gross", "b) net"]),
    )
  })
  test("contentHash deterministic and distinct", () => {
    const h1 = contentHash("What is GDP?", ["A) Gross", "B) Net"])
    const h2 = contentHash("What is  GDP?!", ["a) gross", "b) net"])
    assert.equal(h1, h2)
    assert.notEqual(h1, contentHash("Different?", ["A) X", "B) Y"]))
    assert.ok(h1.startsWith("th-"))
  })
})

describe("buildSolutionJson", () => {
  test("stores structured fields + status + warnings", () => {
    const sol = buildSolutionJson(
      {
        no: "1",
        tag: "[UPSC CSE 2024]",
        subject: "Indian Economy",
        topic: "5.4 Money and Monetary Policy",
        q: "Q?",
        options: ["a", "b", "c", "d"],
        answer: "C",
        answerIndex: 3,
        check: "agree",
        checkNote: null,
        keyPoints: ["kp"],
        additionalInfo: [{ heading: "H", points: [{ text: "p", sub: [] }] }],
        optionAnalysis: [{ letter: "C", verdict: "Correct", reason: "yes" }],
        memoryTip: "tip",
        concepts: ["mpc"],
        unsure: null,
        exam: null,
        year: null,
        flags: [],
      },
      { solutionStatus: "NEEDS_REVIEW", warnings: ["duplicate-of-existing"] },
    )
    assert.equal(sol.status, "NEEDS_REVIEW")
    assert.deepEqual(sol.warnings, ["duplicate-of-existing"])
    assert.equal(sol.memoryTip, "tip")
    assert.deepEqual(sol.hints, { subject: "Indian Economy", topic: "5.4 Money and Monetary Policy" })
  })
})
