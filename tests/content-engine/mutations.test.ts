/**
 * MUTATION SAFETY GUARDS TEST SUITE
 * 
 * ARCHITECTURAL RELATIONSHIP WITH scripts/run-mutation-suite.ts:
 * - This file (tests/content-engine/mutations.test.ts) contains unit assertions verifying that
 *   the system's safety guards (quality gates, classification normalizers, SEO model rules,
 *   static export sanitizers, and cross-reference checks) correctly reject malformed, dangerous,
 *   or invalid inputs under test. It does NOT mutate code files on disk.
 * - The active mutation test harness is `scripts/run-mutation-suite.ts`. It programmatically mutates
 *   production code files (e.g. weakening gate thresholds, disabling sanitizers, removing nukta stripping)
 *   and executes this file (and other suites) to verify red-then-green proof (tests fail when code is broken,
 *   and pass when restored).
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { evaluateQualityGates } from "@/lib/modules/content-engine/quality-gates"
import { resolveExplanation } from "@/lib/modules/content-engine/cross-ref"
import { nz } from "@/lib/modules/content-engine/classifier"
import { buildSeoModel, safeJsonLdStringify } from "@/lib/modules/content-engine/seo-model"
import { generateStaticSiteFiles } from "@/lib/modules/content-engine/static-export"

describe("Phase 6 — Mutation Proofs (Safety Guards Verification)", () => {
  it("Mutation 1: Missing answer fails quality gates", () => {
    const res = evaluateQualityGates([
      {
        id: "m1",
        q: "Test Question Stem with four valid options",
        o: ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
        a: -1, // Deliberate missing answer
        exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
        src: "UPSC CSE 2023",
        sub: "History",
        top: "Indus Valley",
      },
    ])
    const r = res.get("m1")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("missing-answer"))
  })

  it("Mutation 2: Few options (< 4) fails quality gates", () => {
    const res = evaluateQualityGates([
      {
        id: "m2",
        q: "Test Question Stem with only three options",
        o: ["Opt 1", "Opt 2", "Opt 3"], // Only 3 options
        a: 0,
        exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
        src: "UPSC CSE 2023",
        sub: "History",
        top: "Indus Valley",
      },
    ])
    const r = res.get("m2")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("few-options"))
  })

  it("Mutation 3: Thin explanation (< 80 chars) fails quality gates", () => {
    const res = evaluateQualityGates([
      {
        id: "m3",
        q: "Test Question Stem with four valid options",
        o: ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
        a: 0,
        exp: "Too short.", // Less than 80 chars
        src: "UPSC CSE 2023",
        sub: "History",
        top: "Indus Valley",
      },
    ])
    const r = res.get("m3")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("thin-explanation"))
  })

  it("Mutation 4: Missing source fails quality gates", () => {
    const res = evaluateQualityGates([
      {
        id: "m4",
        q: "Test Question Stem with four valid options",
        o: ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
        a: 0,
        exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
        src: "", // Missing source
        sub: "History",
        top: "Indus Valley",
      },
    ])
    const r = res.get("m4")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("no-source"))
  })

  it("Mutation 5: Uncategorized subject fails quality gates", () => {
    const res = evaluateQualityGates([
      {
        id: "m5",
        q: "Test Question Stem with four valid options",
        o: ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
        a: 0,
        exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
        src: "UPSC CSE 2023",
        sub: "Uncategorized", // Uncategorized subject
        top: "Indus Valley",
      },
    ])
    const r = res.get("m5")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("uncategorized"))
  })

  it("Mutation 6: General topic fails quality gates", () => {
    const res = evaluateQualityGates([
      {
        id: "m6",
        q: "Test Question Stem with four valid options",
        o: ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
        a: 0,
        exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
        src: "UPSC CSE 2023",
        sub: "History",
        top: "General", // General topic
      },
    ])
    const r = res.get("m6")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("uncategorized"))
  })

  it("Mutation 7: Duplicate detection triggers on Jaccard similarity >= 0.8", () => {
    const res = evaluateQualityGates([
      {
        id: "orig",
        q: "Consider the following statements regarding the Indus Valley Civilization excavation at Harappa and Mohenjodaro",
        o: ["1 only", "2 only", "Both 1 and 2", "Neither 1 nor 2"],
        a: 2,
        exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
        src: "UPSC CSE 2023",
        sub: "History",
        top: "Indus Valley",
      },
      {
        id: "dup",
        q: "Consider the following statements regarding the Indus Valley Civilization excavation at Harappa and Mohenjodaro site",
        o: ["1 only", "2 only", "Both 1 and 2", "Neither 1 nor 2"],
        a: 2,
        exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
        src: "UPSC CSE 2023",
        sub: "History",
        top: "Indus Valley",
      },
    ])
    const r = res.get("dup")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("duplicate"))
    assert.equal(r?.duplicateOfId, "orig")
  })

  it("Mutation 8: Unverified question fails in strict quality gates mode", () => {
    const res = evaluateQualityGates(
      [
        {
          id: "m8",
          q: "Test Question Stem with four valid options",
          o: ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
          a: 0,
          exp: "Detailed explanation text that exceeds eighty characters in total length for this test.",
          src: "UPSC CSE 2023",
          sub: "History",
          top: "Indus Valley",
          isVerified: false, // Unverified
        },
      ],
      { strict: true }
    )
    const r = res.get("m8")
    assert.equal(r?.passed, false)
    assert.ok(r?.failures.includes("unverified"))
  })

  it("Mutation 9: Unreviewed Hindi twin gets robots noindex", () => {
    const model = buildSeoModel(
      {
        id: "m9",
        shortId: "12345678",
        slug: "q-12345678-test",
        q: "English text",
        o: ["A", "B", "C", "D"],
        a: 0,
        sub: "History",
        top: "Indus Valley",
        isPublished: true,
        hindiTwin: {
          q: "हिन्दी पाठ",
          o: ["क", "ख", "ग", "घ"],
          isReviewed: false, // Unreviewed
        },
      },
      "hi",
      "https://aspirantbook.com"
    )
    assert.equal(model.robots, "noindex, follow")
  })

  it("Mutation 10: Reviewed Hindi twin gets robots index, follow", () => {
    const model = buildSeoModel(
      {
        id: "m10",
        shortId: "12345678",
        slug: "q-12345678-test",
        q: "English text",
        o: ["A", "B", "C", "D"],
        a: 0,
        sub: "History",
        top: "Indus Valley",
        isPublished: true,
        hindiTwin: {
          q: "हिन्दी पाठ",
          o: ["क", "ख", "ग", "घ"],
          isReviewed: true, // Reviewed
        },
      },
      "hi",
      "https://aspirantbook.com"
    )
    assert.equal(model.robots, "index, follow")
  })

  it("Mutation 11: Unreviewed Hindi twin excluded from static export", () => {
    const files = generateStaticSiteFiles([
      {
        id: "m11",
        shortId: "12345678",
        slug: "q-12345678-unreviewed",
        q: "Question stem",
        options: ["A", "B", "C", "D"],
        answer: "A",
        answerIndex: 0,
        explanation: "Valid explanation exceeding eighty characters length requirement.",
        sub: "History",
        top: "Indus Valley",
        exam: "UPSC CSE",
        isPublished: true,
        isVerified: true,
        translations: [
          {
            lang: "hi",
            q: "हिन्दी पाठ",
            options: ["क", "ख", "ग", "घ"],
            isReviewed: false, // Unreviewed
          },
        ],
      },
    ])
    const hiPage = files.find((f) => f.path.startsWith("hi/"))
    assert.equal(hiPage, undefined, "Unreviewed Hindi page must NOT be generated")
  })

  it("Mutation 12: Cross-reference resolver terminates cycles at max depth 3", () => {
    const pool = [
      { id: 1, no: 1, q: "Q1", exp: "See explanation of question 2." },
      { id: 2, no: 2, q: "Q2", exp: "See explanation of question 3." },
      { id: 3, no: 3, q: "Q3", exp: "See explanation of question 1." },
    ]
    const res = resolveExplanation(pool[0], pool)
    assert.ok(res !== undefined, "Must resolve without crashing")
  })

  it("Mutation 13: Cross-reference resolver ignores self-references", () => {
    const pool = [{ id: 5, no: 5, q: "Q5", exp: "See explanation of question 5." }]
    const res = resolveExplanation(pool[0], pool)
    assert.equal(res.refNumber, null, "Must ignore self-reference")
    assert.equal(res.resolvedExp, "See explanation of question 5.")
  })

  it("Mutation 14: nz normalizer strips nukta", () => {
    assert.equal(nz("हड़प्पा"), "हडप्पा")
  })

  it("Mutation 15: nz normalizer normalizes chandrabindu to anusvara", () => {
    assert.equal(nz("हाँ"), "हां")
  })

  it("Mutation 16: nz normalizer converts nasal halant to anusvara", () => {
    assert.equal(nz("सम्बन्ध"), "संबंध")
  })

  it("Mutation 17: nz normalizer converts bare nga to da for OCR confusion", () => {
    assert.equal(nz("हङप्पा"), "हडप्पा")
  })

  it("Mutation 18: safeJsonLdStringify replaces < with \\u003c", () => {
    const safe = safeJsonLdStringify({ test: '<script>alert("xss")</script>' })
    assert.ok(!safe.includes("<script>"))
    assert.ok(safe.includes("\\u003cscript>"))
  })

  it("Mutation 19: Unpublished question excluded from static export", () => {
    const files = generateStaticSiteFiles([
      {
        id: "m19",
        shortId: "87654321",
        slug: "q-87654321-draft",
        q: "Draft question",
        options: ["A", "B", "C", "D"],
        answer: "A",
        answerIndex: 0,
        sub: "Economy",
        top: "General",
        isPublished: false, // Draft
        isVerified: false,
      },
    ])
    const draftPage = files.find((f) => f.path.includes("q-87654321-draft"))
    assert.equal(draftPage, undefined)
  })

  it("Mutation 20: Primary mode static export points canonicals to configured exportBaseUrl", () => {
    const files = generateStaticSiteFiles(
      [
        {
          id: "m20",
          shortId: "99998888",
          slug: "q-99998888-primary-test",
          q: "Primary mode test",
          options: ["A", "B", "C", "D"],
          answer: "A",
          answerIndex: 0,
          sub: "History",
          top: "Indus Valley",
          exam: "UPSC CSE",
          isPublished: true,
          isVerified: true,
        },
      ],
      "primary",
      "https://questions.example.com"
    )
    const enPage = files.find((f) => f.path.includes("q-99998888-primary-test"))
    assert.ok(enPage)
    assert.ok(
      String(enPage.content).includes("https://questions.example.com/question-answer/")
    )
  })
})
