import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { buildHindiExportText, type HindiExportItem } from "@/lib/pyq/hindi-export"
import { evaluateHindiBlock, type HindiImportRow } from "@/lib/pyq/hindi-import"
import { parseSolutionBatch, type ParsedSolutionQuestion } from "@/lib/pyq/solution-format"

const item: HindiExportItem = {
  no: 1,
  shortId: "ceq-test-01",
  tag: "UPSC CSE 2024",
  subject: "Geography",
  topic: "10 Geomorphology",
  q: "What is a plant bud?",
  options: ["An embryonic shoot", "An embryonic leaf", "An endosperm", "A seed"],
  answerLetter: "A",
  keyPoints: ["Bud = embryonic shoot"],
  additionalInfo: [
    { heading: "Bud types", points: [{ text: "Terminal bud at the tip.", sub: ["Also called apical bud."] }] },
  ],
  optionAnalysis: [
    { letter: "A", verdict: "Correct", reason: "a bud is an undeveloped shoot." },
    { letter: "B", verdict: "Incorrect", reason: "leaves grow out of a bud." },
  ],
  memoryTip: "Bud = baby shoot",
  concepts: ["plant-bud"],
}

describe("hindi export (Format v1 with LANG/REF)", () => {
  const text = buildHindiExportText([item])

  test("contains REF, LANG: hi and the source fields", () => {
    assert.ok(text.includes("REF: ceq-test-01"))
    assert.ok(text.includes("LANG: hi"))
    assert.ok(text.includes("Q: What is a plant bud?"))
    assert.ok(text.includes("a) An embryonic shoot"))
    assert.ok(text.includes("ANSWER: A"))
    assert.ok(text.includes("KEY POINTS:"))
    assert.ok(text.includes("# Bud types"))
    assert.ok(text.includes("  - Also called apical bud."))
    assert.ok(text.includes("a) Correct - a bud is an undeveloped shoot."))
    assert.ok(text.includes("MEMORY TIP: Bud = baby shoot"))
    assert.ok(text.includes("CONCEPTS: plant-bud"))
  })

  test("export text round-trips through the Format v1 parser", () => {
    const batch = parseSolutionBatch(text)
    assert.equal(batch.errorBlocks.length, 0)
    assert.equal(batch.questions.length, 1)
    const q = batch.questions[0]
    assert.equal(q.lang, "hi")
    assert.equal(q.ref, "ceq-test-01")
    assert.equal(q.q, "What is a plant bud?")
    assert.equal(q.answer, "A")
    assert.deepEqual(q.keyPoints, ["Bud = embryonic shoot"])
    assert.equal(q.additionalInfo[0].heading, "Bud types")
    assert.deepEqual(q.additionalInfo[0].points[0].sub, ["Also called apical bud."])
    assert.equal(q.optionAnalysis[1].verdict, "Incorrect")
  })

  test("no reference to private review fields in export", () => {
    assert.ok(!text.includes("CHECK:"))
    assert.ok(!text.includes("UNSURE:"))
  })
})

describe("hindi import (evaluateHindiBlock)", () => {
  function parsedFrom(text: string): ParsedSolutionQuestion {
    const batch = parseSolutionBatch(text)
    assert.equal(batch.errorBlocks.length, 0)
    assert.equal(batch.questions.length, 1)
    return batch.questions[0]
  }

  const hiBlock = [
    "====",
    "NO: 1",
    "REF: ceq-test-01",
    "LANG: hi",
    "TAG: UPSC CSE 2024",
    "SUBJECT: Geography",
    "TOPIC: 10 Geomorphology",
    "Q: पौधे की कोपिका क्या है?",
    "a) एक आद्यांकुरित प्ररोह",
    "b) एक आद्यांकुरित पत्ती",
    "c) एक एंडोस्पर्म",
    "d) एक बीज",
    "ANSWER: A",
    "KEY POINTS:",
    "- कोपिका = आद्यांकुरित प्ररोह",
    "ADDITIONAL INFO:",
    "# कोपिका के प्रकार",
    "- शीर्षस्थ कोपिका टहनी के शीर्ष पर होती है।",
    "OPTION ANALYSIS:",
    "a) Correct - कोपिका एक अविकसित प्ररोह है।",
    "b) Incorrect - पत्तियाँ कोपिका से निकलती हैं।",
    "MEMORY TIP: कोपिका = बच्चा प्ररोह",
    "CONCEPTS: पौधा-कोपिका",
  ].join("\n")

  test("happy path: row with NEEDS_REVIEW solution, isReviewed left false by route", () => {
    const parsed = parsedFrom(hiBlock)
    const parent = { shortId: "ceq-test-01", answer: "A" }
    const evaluated = evaluateHindiBlock(parsed, parent)
    assert.ok(evaluated.ok)
    const row = (evaluated as { ok: true; row: HindiImportRow }).row
    assert.equal(row.ref, "ceq-test-01")
    assert.equal(row.lang, "hi")
    assert.equal(row.q, "पौधे की कोपिका क्या है?")
    assert.equal(row.answer, "A")
    assert.equal(row.solution.status, "NEEDS_REVIEW")
    // Parser completeness hints surface as warnings for the reviewer; the only
    // hard gate is answer-mismatch (tested below).
    assert.ok(row.solution.warnings.includes("analysis-missing:C"))
    assert.deepEqual(
      row.solution.warnings.filter((w) => w === "answer-mismatch"),
      [],
    )
    assert.deepEqual(row.solution.keyPoints, ["कोपिका = आद्यांकुरित प्ररोह"])
    assert.equal(row.solution.additionalInfo[0].heading, "कोपिका के प्रकार")
  })

  test("answer mismatch vs parent adds answer-mismatch warning", () => {
    const parsed = parsedFrom(hiBlock.replace("ANSWER: A", "ANSWER: B"))
    const evaluated = evaluateHindiBlock(parsed, { shortId: "ceq-test-01", answer: "A" })
    assert.ok(evaluated.ok)
    assert.ok((evaluated as { warnings: string[] }).warnings.includes("answer-mismatch"))
  })

  test("parent answer stored as text still resolves to a letter", () => {
    const parsed = parsedFrom(hiBlock)
    const evaluated = evaluateHindiBlock(parsed, { shortId: "ceq-test-01", answer: "Option (A)" })
    assert.ok(evaluated.ok)
    assert.ok(!(evaluated as { warnings: string[] }).warnings.includes("answer-mismatch"))
  })

  test("warning list never contains a hard gate unless a real mismatch exists", () => {
    const parsed = parsedFrom(hiBlock)
    const evaluated = evaluateHindiBlock(parsed, { shortId: "ceq-test-01", answer: "A" })
    assert.ok(evaluated.ok)
    assert.ok(!(evaluated as { warnings: string[] }).warnings.includes("answer-mismatch"))
    assert.ok(!(evaluated as { warnings: string[] }).warnings.includes("rejected"))
  })

  test("non-hi block rejected with reason", () => {
    const parsed = parsedFrom(hiBlock.replace("LANG: hi", "LANG: en"))
    const evaluated = evaluateHindiBlock(parsed, { shortId: "ceq-test-01", answer: "A" })
    assert.equal(evaluated.ok, false)
    assert.ok((evaluated as { reason: string }).reason.includes("not LANG: hi"))
  })

  test("missing REF rejected", () => {
    const parsed = parsedFrom(hiBlock.replace("REF: ceq-test-01", "REF:"))
    const evaluated = evaluateHindiBlock(parsed, { shortId: "ceq-test-01", answer: "A" })
    assert.equal(evaluated.ok, false)
    assert.ok((evaluated as { reason: string }).reason.includes("missing REF"))
  })

  test("unknown REF rejected (REF is the only matching key)", () => {
    const parsed = parsedFrom(hiBlock)
    const evaluated = evaluateHindiBlock(parsed, null)
    assert.equal(evaluated.ok, false)
    assert.ok((evaluated as { reason: string }).reason.includes("not found"))
  })

  test("missing Q rejected", () => {
    const parsed = parsedFrom(hiBlock.replace("Q: पौधे की कोपिका क्या है?", "Q:"))
    const evaluated = evaluateHindiBlock(parsed, { shortId: "ceq-test-01", answer: "A" })
    assert.equal(evaluated.ok, false)
    assert.ok((evaluated as { reason: string }).reason.includes("missing Q"))
  })

  test("missing ANSWER rejected", () => {
    const parsed = parsedFrom(hiBlock.replace("ANSWER: A", "ANSWER:"))
    const evaluated = evaluateHindiBlock(parsed, { shortId: "ceq-test-01", answer: "A" })
    assert.equal(evaluated.ok, false)
    assert.ok((evaluated as { reason: string }).reason.includes("missing ANSWER"))
  })

  test("one bad block never fails the batch (parser isolation)", () => {
    const bad = ["====", "NO: 2", "REF: ceq-test-02", "LANG: hi", "garbage without fields"].join("\n")
    const batch = parseSolutionBatch(`${hiBlock}\n\n${bad}`)
    assert.equal(batch.errorBlocks.length, 0)
    // Both segments parse as blocks; the bad one fails evaluation, not the batch.
    const second = batch.questions[1]
    assert.equal(second.ref, "ceq-test-02")
    assert.ok(second.flags.includes("missing:Q"))
  })
})
