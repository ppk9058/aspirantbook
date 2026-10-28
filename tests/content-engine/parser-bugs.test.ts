import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parse, parseWithDiagnostics } from "@/lib/modules/content-engine/parser"

describe("Phase C — Parser Bug Fixes (Real Exam Paper Text)", () => {
  it("C1 & C2(a): Lowercase a.-d. statements inside question stem with (A)-(D) options", () => {
    const text = `
Consider the following about X:
a. first
b. second
c. third
d. fourth
Which is correct?
(A) a and b
(B) b and c
(C) c and d
(D) More than one of the above
Answer: A
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected exactly 1 question, got ${res.length}`)
    assert.equal(res[0].o.length, 4, `Expected 4 options, got ${res[0].o.length}`)
    assert.ok(res[0].q.includes("a. first"), "Question stem must include 'a. first'")
    assert.ok(res[0].q.includes("d. fourth"), "Question stem must include 'd. fourth'")
    assert.equal(res[0].o[0], "a and b")
    assert.equal(res[0].o[3], "More than one of the above")
    assert.equal(res[0].a, 0)
  })

  it("C1 & C2(b): Roman numeral i.-iv. statements inside question stem with (A)-(D) options", () => {
    const text = `
Consider the following statements:
i. First statement
ii. Second statement
iii. Third statement
iv. Fourth statement
Which of the statements given above are correct?
(A) i and ii only
(B) ii and iii only
(C) i, iii and iv only
(D) All of the above
Answer: D
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected exactly 1 question, got ${res.length}`)
    assert.equal(res[0].o.length, 4, `Expected 4 options, got ${res[0].o.length}`)
    assert.ok(res[0].q.includes("i. First statement"))
    assert.ok(res[0].q.includes("iv. Fourth statement"))
    assert.equal(res[0].o[0], "i and ii only")
    assert.equal(res[0].a, 3)
  })

  it("C1 & C2(c): Numbered 1.-4. statements inside question stem with (A)-(D) options", () => {
    const text = `
Following are mountain ranges
1. Garo Hills
2. Nandadevi
3. Kamet
4. K2
Which is the correct sequence?
(A) 4 3 1 2
(B) 3 4 2 1
(C) 1 2 3 4
(D) 2 1 4 3
Answer: B
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected exactly 1 question, got ${res.length}`)
    assert.equal(res[0].o.length, 4, `Expected 4 options, got ${res[0].o.length}`)
    assert.ok(res[0].q.includes("1. Garo Hills"))
    assert.ok(res[0].q.includes("4. K2"))
    assert.equal(res[0].o[0], "4 3 1 2")
    assert.equal(res[0].a, 1)
  })

  it("C2(d): Match-the-following with List-I and List-II on separate lines", () => {
    const text = `
Match List-I with List-II:
List-I:
a. Indus Valley
b. Vedic Period
List-II:
1. Harappa
2. Rigveda
Choose the correct code:
(A) a-1, b-2
(B) a-2, b-1
(C) a-1, b-1
(D) a-2, b-2
Answer: A
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected exactly 1 question, got ${res.length}`)
    assert.equal(res[0].o.length, 4, `Expected 4 options, got ${res[0].o.length}`)
    assert.ok(res[0].q.includes("List-I"))
    assert.ok(res[0].q.includes("List-II"))
    assert.equal(res[0].o[0], "a-1, b-2")
    assert.equal(res[0].a, 0)
  })

  it("C2(e): 4-option question whose option lines are 1. 2. 3. 4. with no (A)-(D)", () => {
    const text = `
Who was the first governor general of independent India?
1. Lord Mountbatten
2. C. Rajagopalachari
3. Dr. Rajendra Prasad
4. Jawaharlal Nehru
Answer: 1
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected exactly 1 question, got ${res.length}`)
    assert.equal(res[0].o.length, 4, `Expected 4 options, got ${res[0].o.length}`)
    assert.equal(res[0].o[0], "Lord Mountbatten")
    assert.equal(res[0].o[1], "C. Rajagopalachari")
    assert.equal(res[0].a, 0)
  })

  it("C3: Strip OCR junk lines but preserve real content lines", () => {
    const text = `
Q1. 1.5 kg of salt was added to a solution in the 2024 budget analysis under Article 102.
[P.T.O.
09/C/GO/CC/PT-2024(Q)/E 12
12
4110191
P.T.O.
Which law applies?
(A) Law A
(B) Law B
(C) Law C
(D) Law D
Answer: A
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected 1 question, got ${res.length}`)
    assert.ok(!res[0].q.includes("P.T.O."), "Must strip P.T.O.")
    assert.ok(!res[0].q.includes("09/C/GO"), "Must strip paper code")
    assert.ok(!res[0].q.includes("4110191"), "Must strip roll number")
    assert.ok(res[0].q.includes("1.5 kg of salt"), "Must keep '1.5 kg of salt'")
    assert.ok(res[0].q.includes("2024 budget"), "Must keep '2024 budget'")
    assert.ok(res[0].q.includes("Article 102"), "Must keep 'Article 102'")
  })

  it("C4: Decimal-led lines (1.5 kg, 2.0 m/s) must not start new questions", () => {
    const text = `
Q1. A body moves with a speed of
1.5 m/s in the first interval and
2.0 m/s in the second interval.
What is the average velocity?
(A) 1.75 m/s
(B) 1.5 m/s
(C) 2.0 m/s
(D) 3.5 m/s
Answer: A
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected 1 question, got ${res.length}`)
    assert.equal(res[0].o.length, 4)
    assert.ok(res[0].q.includes("1.5 m/s"))
    assert.ok(res[0].q.includes("2.0 m/s"))

    const letteredText = `
Q1. A body moves with a speed of
1.5 m/s in the first interval and
2.0 m/s in the second interval.
What is the average velocity?
A. 1.75 m/s
B. 1.5 m/s
C. 2.0 m/s
D. 3.5 m/s
Answer: A
`
    const res2 = parse(letteredText)
    assert.equal(res2.length, 1, `Expected 1 question with lettered options, got ${res2.length}`)
    assert.equal(res2[0].o.length, 4)
    assert.ok(res2[0].q.includes("1.5 m/s"))
    assert.ok(res2[0].q.includes("2.0 m/s"))
  })

  it("C5: Blank lines inside question stem before options do not split question", () => {
    const text = `
Consider the following statements regarding fundamental rights:

1. Right to equality is guaranteed under Article 14.

2. Right to freedom is guaranteed under Article 19.

Which of the above statements is/are correct?
(A) 1 only
(B) 2 only
(C) Both 1 and 2
(D) Neither 1 nor 2
Answer: C
`
    const res = parse(text)
    assert.equal(res.length, 1, `Expected 1 question, got ${res.length}`)
    assert.equal(res[0].o.length, 4)
    assert.ok(res[0].q.includes("Right to equality"))
    assert.ok(res[0].q.includes("Right to freedom"))
    assert.equal(res[0].a, 2)
  })

  it("C6: parseWithDiagnostics returns skipped count and snippets", () => {
    const text = `
Q1. Valid question with four valid options for testing.
(A) Opt 1
(B) Opt 2
(C) Opt 3
(D) Opt 4
Answer: A

P.T.O.
Dropped short snippet
`
    const { questions, skipped } = parseWithDiagnostics(text)
    assert.equal(questions.length, 1)
    assert.ok(skipped.length > 0, "Must record skipped snippets")
  })
})
