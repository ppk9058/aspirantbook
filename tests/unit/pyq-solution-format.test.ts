import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  detectSolutionFormat,
  normalizePastedText,
  parseSolutionBatch,
} from "../../lib/pyq/solution-format"
import { parseRawMcqBatch } from "../../lib/pyq/mcq-parser"

const CLEAN_BLOCK_1 = `NO: 1
TAG: [UPSC CSE 2023]
SUBJECT: Indian Polity and Constitution
TOPIC: 3.3 Parliament
Q: Which one of the following statements about the Parliament of India is correct?
A) It can amend the Constitution
B) It cannot amend the Constitution
C) It can only legislate
D) It has no financial powers
ANSWER: A
CHECK: agree
KEY POINTS:
- **Parliament** can amend the Constitution under **Article 368**
- Amendment needs special majority
ADDITIONAL INFO:
# Constituent power
- Parliament's constituent power flows from **Article 368**
  - Ratification by half the states for federal provisions
# Limits
- **Basic structure** doctrine limits amendments (Kesavananda Bharati, 1973)
OPTION ANALYSIS:
A) Correct - Parliament holds constituent power under Article 368
B) Incorrect - contradicted by Article 368
C) Incorrect - it does far more than legislate
D) Incorrect - it controls financial business via Money Bills
MEMORY TIP: "368 = amend the state of the Constitution"; basic structure is the brake.
CONCEPTS: article-368, basic-structure-doctrine
UNSURE: none`

const CLEAN_BLOCK_2 = `NO: 2
TAG: none
SUBJECT: Indian Economy
TOPIC: 5.4 Money and Monetary Policy
Q: The Monetary Policy Committee of India consists of how many members?
A) 4
B) 5
C) 6
D) 7
ANSWER: C
CHECK: agree
KEY POINTS:
- MPC has **6 members**
- **3** from RBI including the Governor
ADDITIONAL INFO:
# MPC composition
- Governor is the **ex-officio chairperson**
  - Deputy Governor and one officer hold the other RBI seats
# Targeting
- Inflation target **4% +/- 2%** under the RBI Act after 2016
OPTION ANALYSIS:
A) Incorrect - too few
B) Incorrect - too few
C) Correct - 6 members by the 2016 framework
D) Incorrect - too many
MEMORY TIP: MPC = 3 RBI + 3 external.
CONCEPTS: mpc, inflation-targeting
UNSURE: none`

const CLEAN_BATCH = `Preamble text that should be ignored
====
${CLEAN_BLOCK_1}
====
${CLEAN_BLOCK_2}
====`

const FENCED_CRLF_SMART = "```text\r\n====\r\nNO: 7\r\nTAG: [SSC CGL 2024]\r\nSUBJECT: Indian Polity and Constitution\r\nTOPIC: 3.4 Fundamental Rights\r\nQ: Which Article guarantees the Right to Equality? \u201cquoted\u201d\r\nA) Article 14 \u2018equality before law\u2019\r\nB) Article 19\r\nC) Article 21\r\nD) Article 32\r\nANSWER: A\r\nCHECK: agree\r\nKEY POINTS:\r\n- **Article 14** = equality before law\r\nADDITIONAL INFO:\r\n# Scope\r\n- Article 14 permits reasonable classification\r\nOPTION ANALYSIS:\r\nA) Correct - Article 14 is the equality clause\r\nB) Incorrect - freedom clause\r\nC) Incorrect - life and liberty\r\nD) Incorrect - constitutional remedies\r\nMEMORY TIP: 14 = equality.\r\nCONCEPTS: article-14\r\nUNSURE: none\r\n```"

const MISSING_SECTIONS = `====
NO: 3
TAG: [BPSC 68th CCE 2023]
SUBJECT: Indian Geography (and World)
TOPIC: 4.6 Climate and Rivers of India
Q: Loo is a hot wind that blows during which season?
A) Summer
B) Winter
C) Monsoon
D) Autumn
ANSWER: A
CHECK: agree
KEY POINTS:
- **Loo** blows in the hot season over north India
====`

const TRUNCATED = `====
NO: 9
TAG: none
SUBJECT: General Science
TOPIC: 7.3 Biology
Q: Which vitamin is produced in the human body on exposure to sunlight?
A) Vitamin A
B) Vitamin B12
C) Vitamin C
D) Vitamin D
ANSWER: D
CHECK: agree
KEY POINTS:
- **Vitamin D** is synthesized in skin via UV-B
ADDITIONAL INFO:
# Synthesis
- UV-B converts 7-dehydrocholesterol to cholecalciferol
OPTION ANALYSIS:
A) Incorrect - vision
B) Incorrect - B12 is dietary
C) Incorrect - citrus
D) Correct - sunlight synthesis
MEMORY TIP: D = Dermis + sun.
CONCEPTS: vitamin-d
UNSURE: none
====
NEXT: 10`

const HINDI_BLOCK = `====
LANG: hi
REF: q_2024_p39
NO: 39
TAG: [UPSC CSE 2024]
SUBJECT: पर्यावरण
TOPIC: 6.1 पारिस्थितिकी
Q: मिशी मिशी घोषणा किससे संबंधित है?
A) मैनग्रोव
B) कोरल
C) वेटलैंड
D) वन
ANSWER: A
CHECK: agree
KEY POINTS:
- **MISHTI** पहल मैनग्रोव संरक्षण के लिए है
ADDITIONAL INFO:
# MISHTI
- 2023 में घोषित, राष्ट्रीय मैनग्रोव मिशन
OPTION ANALYSIS:
A) सही - MISHTI मैनग्रोव के लिए
B) गलत
C) गलत
D) गलत
MEMORY TIP: MISHTI = mangrove initiative.
CONCEPTS: mishti-mangrove
UNSURE: none
====`

const BAD_BLOCK_BETWEEN_GOOD = `====
${CLEAN_BLOCK_1}
====
This block has no fields at all, just random commentary
that keeps going and is not a question.
====
${CLEAN_BLOCK_2}
====`

const STRAY_OUTSIDE = `Some intro sentence.
Another intro sentence.
====
${CLEAN_BLOCK_1}
====
Trailing commentary line.`

describe("normalizePastedText", () => {
  test("CRLF, code fences, smart quotes, dashes, NBSP", () => {
    const out = normalizePastedText("```text\r\n“x” ‘y’ — z\u00A0w```\n")
    assert.equal(out, '"x" \'y\' - z w')
  })
})

describe("detectSolutionFormat", () => {
  test("true for a clean Format v1 paste", () => {
    assert.equal(detectSolutionFormat(CLEAN_BATCH), true)
  })
  test("false for raw MCQ paste", () => {
    assert.equal(
      detectSolutionFormat("Q.1 Which is correct?\n(a) One\n(b) Two\nAnswer: (a)"),
      false,
    )
  })
})

describe("parseSolutionBatch — clean", () => {
  const batch = parseSolutionBatch(CLEAN_BATCH)
  test("both questions parsed, none errored", () => {
    assert.equal(batch.format, "solution-v1")
    assert.equal(batch.errorBlocks.length, 0)
    assert.equal(batch.questions.length, 2)
    assert.equal(batch.ignoredLineCount, 1) // preamble line
  })
  test("fields map exactly", () => {
    const q1 = batch.questions[0]
    assert.equal(q1.no, "1")
    assert.equal(q1.tag, "[UPSC CSE 2023]")
    assert.equal(q1.subject, "Indian Polity and Constitution")
    assert.equal(q1.topic, "3.3 Parliament")
    assert.equal(q1.answer, "A")
    assert.equal(q1.answerIndex, 1)
    assert.equal(q1.check, "agree")
    assert.equal(q1.options.length, 4)
    assert.equal(q1.keyPoints.length, 2)
    assert.equal(q1.additionalInfo.length, 2)
    assert.equal(q1.additionalInfo[0].points[0].sub.length, 1)
    assert.equal(q1.optionAnalysis.length, 4)
    assert.equal(q1.optionAnalysis[0].verdict, "Correct")
    assert.deepEqual(q1.concepts, ["article-368", "basic-structure-doctrine"])
    assert.equal(q1.unsure, null)
    assert.equal(q1.lang, "en")
  })
})

describe("parseSolutionBatch — fenced CRLF smart quotes", () => {
  const batch = parseSolutionBatch(FENCED_CRLF_SMART)
  test("parses through fence + CRLF + smart quotes", () => {
    assert.equal(batch.questions.length, 1)
    assert.equal(batch.questions[0].no, "7")
    assert.equal(batch.questions[0].options[0], "Article 14 'equality before law'")
    assert.equal(batch.questions[0].q.includes('"quoted"'), true)
    assert.equal(batch.questions[0].answer, "A")
  })
})

describe("parseSolutionBatch — missing sections flag, never crash", () => {
  const batch = parseSolutionBatch(MISSING_SECTIONS)
  const q = batch.questions[0]
  test("question still parsed", () => {
    assert.equal(batch.questions.length, 1)
    assert.equal(q.answer, "A")
  })
  test("missing sections flagged", () => {
    for (const f of [
      "missing:ADDITIONAL INFO",
      "missing:OPTION ANALYSIS",
      "missing:MEMORY TIP",
      "missing:CONCEPTS",
    ]) {
      assert.ok(q.flags.includes(f), `expected flag ${f}, got ${JSON.stringify(q.flags)}`)
    }
    assert.ok(q.flags.includes("tag:none") === false) // tag present
  })
})

describe("parseSolutionBatch — truncated with NEXT:", () => {
  const batch = parseSolutionBatch(TRUNCATED)
  test("NEXT line ignored, block complete", () => {
    assert.equal(batch.questions.length, 1)
    assert.equal(batch.questions[0].no, "9")
    assert.equal(batch.errorBlocks.length, 0)
    assert.equal(batch.ignoredLineCount, 1)
  })
})

describe("parseSolutionBatch — Hindi LANG/REF", () => {
  const batch = parseSolutionBatch(HINDI_BLOCK)
  test("lang hi, ref copied exactly", () => {
    assert.equal(batch.questions.length, 1)
    const q = batch.questions[0]
    assert.equal(q.lang, "hi")
    assert.equal(q.ref, "q_2024_p39")
    assert.equal(q.tag, "[UPSC CSE 2024]")
    assert.ok(q.q.includes("मिशी"))
  })
})

describe("parseSolutionBatch — one bad block never fails the batch", () => {
  const batch = parseSolutionBatch(BAD_BLOCK_BETWEEN_GOOD)
  test("good blocks survive, bad block isolated", () => {
    assert.equal(batch.questions.length, 2)
    assert.equal(batch.questions[0].no, "1")
    assert.equal(batch.questions[1].no, "2")
    assert.equal(batch.errorBlocks.length, 0) // no fields => treated as ignored text
    assert.ok(batch.ignoredLineCount >= 2)
  })
})

describe("parseSolutionBatch — stray text outside blocks", () => {
  const batch = parseSolutionBatch(STRAY_OUTSIDE)
  test("outside text ignored and counted", () => {
    assert.equal(batch.questions.length, 1)
    assert.equal(batch.questions[0].no, "1")
    assert.ok(batch.ignoredLineCount >= 3)
  })
})

describe("parseSolutionBatch — option analysis leniency", () => {
  const pasted = `====
NO: 4
TAG: none
SUBJECT: Indian Polity and Constitution
TOPIC: 3.1 Constitutional Framework
Q: Test stem?
A) One
B) Two
C) Three
D) Four
ANSWER: B
CHECK: unsure
CHECK_NOTE: source answer conflicts with official key
KEY POINTS:
- Point one
ADDITIONAL INFO:
# H
- Point
OPTION ANALYSIS:
Option A) Incorrect - wrong
Option B) Correct - right
Option C) Incorrect - wrong
Option D) Incorrect - wrong
MEMORY TIP: tip
CONCEPTS: Test Concept, test-concept
UNSURE: The exact year is uncertain
====`
  const batch = parseSolutionBatch(pasted)
  const q = batch.questions[0]
  test("Option A) variant parsed", () => {
    assert.equal(q.optionAnalysis[0].verdict, "Incorrect")
    assert.equal(q.optionAnalysis[1].verdict, "Correct")
  })
  test("CHECK unsure kept with note", () => {
    assert.equal(q.check, "unsure")
    assert.ok(q.checkNote!.includes("conflicts"))
  })
  test("CONCEPTS slugified and deduped", () => {
    assert.deepEqual(q.concepts, ["test-concept"])
  })
  test("UNSURE non-none kept", () => {
    assert.ok(q.unsure!.includes("uncertain"))
  })
})

describe("parseRawMcqBatch — fallback", () => {
  const raw = `1. Which planet is known as the Red Planet?
(a) Venus
(b) Mars
(c) Jupiter
(d) Saturn
Answer: (b)

Q.2 The Battle of Plassey was fought in which year?
a) 1757
b) 1764
c) 1761
d) 1760
Answer: a

3. Stem without any answer at all?
(a) X
(b) Y`
  const batch = parseRawMcqBatch(raw)
  test("three questions parsed", () => {
    assert.equal(batch.format, "raw-mcq")
    assert.equal(batch.questions.length, 3)
    assert.equal(batch.errorBlocks.length, 0)
  })
  test("letters and answers map", () => {
    assert.equal(batch.questions[0].answer, "B")
    assert.equal(batch.questions[0].answerIndex, 2)
    assert.equal(batch.questions[0].sourceNo, 1)
    assert.equal(batch.questions[1].sourceNo, 2)
    assert.equal(batch.questions[1].q.includes("Plassey"), true)
  })
  test("missing answer flagged, block survives", () => {
    assert.ok(batch.questions[2].flags.includes("no-answer"))
    assert.equal(batch.questions[2].options.length, 2)
  })
})
