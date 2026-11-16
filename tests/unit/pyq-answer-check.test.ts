import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  GATE_ANSWER_MISMATCH,
  buildAnswerCheckExportText,
  parseAnswerCheckText,
  storedAnswerLetter,
} from "../../lib/pyq/answer-check"

describe("parseAnswerCheckText", () => {
  test("comma list", () => {
    const r = parseAnswerCheckText("1-B, 2-C, 3-A, 4-E")
    assert.deepEqual(r.results, [
      { no: 1, letter: "B" },
      { no: 2, letter: "C" },
      { no: 3, letter: "A" },
      { no: 4, letter: "E" },
    ])
    assert.equal(r.errors.length, 0)
  })
  test("newline + numbered variants", () => {
    const r = parseAnswerCheckText("1. B\n2) c\n3: A\n4 D")
    assert.equal(r.results.length, 4)
    assert.equal(r.results[0].letter, "B")
    assert.equal(r.results[1].letter, "C")
  })
  test("lowercase normalized", () => {
    assert.deepEqual(parseAnswerCheckText("1-b").results, [{ no: 1, letter: "B" }])
  })
  test("bad tokens land in errors, never crash", () => {
    const r = parseAnswerCheckText("1-B, garbage, 2-X")
    assert.equal(r.results.length, 1)
    assert.ok(r.errors.includes("garbage"))
    assert.ok(r.errors.includes("2-X"))
  })
  test("duplicate number flagged", () => {
    const r = parseAnswerCheckText("1-B, 1-C")
    assert.equal(r.results.length, 1)
    assert.ok(r.errors.includes("duplicate:1"))
  })
})

describe("buildAnswerCheckExportText", () => {
  test("numbers questions, omits answers", () => {
    const text = buildAnswerCheckExportText([
      { no: 1, shortId: "s1", q: "Which is the largest planet?", options: ["Jupiter", "Earth"] },
      { no: 2, shortId: "s2", q: "Second?", options: ["A opt", "B opt", "C opt"] },
    ])
    assert.ok(text.startsWith("1. Which is the largest planet?\nA) Jupiter\nB) Earth\n\n2. Second?"))
    assert.ok(!text.includes("ANSWER"))
  })
})

describe("storedAnswerLetter", () => {
  test("letter forms", () => {
    assert.equal(storedAnswerLetter("B"), "B")
    assert.equal(storedAnswerLetter("(b)"), "B")
    assert.equal(storedAnswerLetter("b"), "B")
    assert.equal(storedAnswerLetter("B) Mars"), "B")
    assert.equal(storedAnswerLetter("Option C: something"), "C")
  })
  test("unparseable returns null", () => {
    assert.equal(storedAnswerLetter("Mars"), null)
    assert.equal(storedAnswerLetter(""), null)
  })
})

describe("gate constant", () => {
  test("answer-mismatch gate id", () => {
    assert.equal(GATE_ANSWER_MISMATCH, "answer-mismatch")
  })
})
