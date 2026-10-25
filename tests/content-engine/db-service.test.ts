import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

// Point to test database before importing prisma
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"

import { prisma } from "@/lib/prisma"
import {
  ensureDefaultExamAliases,
  getActiveExamAliases,
  addBatch,
  getQuestions,
  bulkAssignQuestions,
  reCategoriseAllQuestions,
  importHindiTranslations,
  toggleTranslationReview,
  setQuestionPublishStatus,
  getPublicQuestionBySlug,
  getSetting,
  setSetting,
} from "@/lib/modules/content-engine/db-service"

describe("Content Engine Database Persistence Service", () => {
  before(async () => {
    // Clean up content engine tables in test DB
    await prisma.contentEngineTranslation.deleteMany()
    await prisma.contentEngineCategoryOverride.deleteMany()
    await prisma.contentEngineQuestion.deleteMany()
    await prisma.contentEngineBatch.deleteMany()
    await prisma.contentEngineSetting.deleteMany()
  })

  after(async () => {
    // Teardown
    await prisma.$disconnect()
  })

  it("1. Exam Aliases: ensures defaults and retrieves active list", async () => {
    await ensureDefaultExamAliases()
    const aliases = await getActiveExamAliases()
    assert.ok(aliases.length >= 50, `Expected at least 50 exam aliases, got ${aliases.length}`)
    assert.ok(aliases.includes("UPSC"), "Should contain UPSC")
    assert.ok(aliases.includes("BPSC"), "Should contain BPSC")
  })

  let createdBatchId: string
  const sampleBatchText = `
[UPSC CSE 2023] Q1. Consider the following statements regarding the Indus Valley Civilization:
1. Harappa was excavated before Mohenjo-daro.
2. The Great Bath was discovered at Mohenjo-daro.
Which of the statements given above is/are correct?
(a) 1 only
(b) 2 only
(c) Both 1 and 2
(d) Neither 1 nor 2
Ans: (c)
Explanation: Harappa was excavated in 1921 by Daya Ram Sahni. Mohenjo-daro was excavated in 1922 by R.D. Banerji. The Great Bath was discovered at Mohenjo-daro. Both statements are correct.

[SSC CGL 2022] Q2. Who is known as the Father of the Indian Constitution?
(a) Mahatma Gandhi
(b) Dr. B.R. Ambedkar
(c) Jawaharlal Nehru
(d) Sardar Patel
Ans: (b)
Explanation: Dr. B.R. Ambedkar was the Chairman of the Drafting Committee.
`

  it("2. Add Batch: parses and inserts questions with text hashing and deduplication", async () => {
    const res1 = await addBatch({
      pastedText: sampleBatchText,
    })

    assert.equal(res1.totalParsed, 2)
    assert.equal(res1.addedCount, 2)
    assert.equal(res1.duplicateCount, 0)
    assert.ok(res1.batchId)
    createdBatchId = res1.batchId

    // Try adding the exact same batch again -> deduplication must skip all
    const res2 = await addBatch({
      pastedText: sampleBatchText,
    })

    assert.equal(res2.totalParsed, 2)
    assert.equal(res2.addedCount, 0)
    assert.equal(res2.duplicateCount, 2)
  })

  it("3. Manual picker defaults: subject-only vs topic-only", async () => {
    const textSubjectOnly = `
Q3. Which of the following is a direct tax in India?
(a) GST
(b) Income Tax
(c) Excise Duty
(d) Customs Duty
Ans: (b)
Explanation: Income tax is directly paid by the individual or entity.
`
    const resSub = await addBatch({
      pastedText: textSubjectOnly,
      defaultSubject: "Economy",
      // defaultTopic empty -> auto-classify topic within Economy
    })
    assert.equal(resSub.addedCount, 1)

    const list = await getQuestions({ batchId: resSub.batchId })
    assert.equal(list.items.length, 1)
    assert.equal(list.items[0].sub, "Economy")
    assert.ok(list.items[0].top, "Should have a classified topic within Economy")
  })

  let q1Id: string
  let q2Id: string

  it("4. Bulk Assign: updates subject/topic/exam/year and creates CategoryOverride", async () => {
    const list = await getQuestions({ batchId: createdBatchId })
    assert.equal(list.items.length, 2)
    q1Id = list.items[0].id
    q2Id = list.items[1].id

    const count = await bulkAssignQuestions({
      questionIds: [q1Id],
      subject: "History",
      topic: "Indus Valley Civilization",
      exam: "UPSC CSE",
      year: "2023",
    })
    assert.equal(count, 1)

    // Verify question is updated and override exists
    const q1 = await prisma.contentEngineQuestion.findUnique({
      where: { id: q1Id },
      include: { override: true },
    })
    assert.ok(q1)
    assert.equal(q1.sub, "History")
    assert.equal(q1.top, "Indus Valley Civilization")
    assert.ok(q1.override)
    assert.equal(q1.override.isManual, true)
    assert.equal(q1.override.sub, "History")
    assert.equal(q1.override.top, "Indus Valley Civilization")
  })

  it("5. Re-categorise-all: respects manual overrides and never overwrites them", async () => {
    // Modify q1 manually in DB to something else, override protects it
    await reCategoriseAllQuestions()

    const q1After = await prisma.contentEngineQuestion.findUnique({
      where: { id: q1Id },
    })
    assert.equal(q1After?.sub, "History")
    assert.equal(q1After?.top, "Indus Valley Civilization")
  })

  it("6. Hindi Import: matches English question and creates translation", async () => {
    const list = await getQuestions({ batchId: createdBatchId })
    const q1 = list.items.find((i) => i.id === q1Id)!

    const hindiData = [
      {
        en: q1.q,
        q: "सिंधु घाटी सभ्यता के संबंध में निम्नलिखित कथनों पर विचार कीजिए:",
        o: ["केवल 1", "केवल 2", "1 और 2 दोनों", "न तो 1, न ही 2"],
        exp: "हड़प्पा की खुदाई 1921 में दयाराम साहनी द्वारा की गई थी।",
        rev: false,
      },
    ]

    const result = await importHindiTranslations({ translations: hindiData })
    assert.equal(result.matched, 1)
    assert.equal(result.skipped, 0)

    const tr = await prisma.contentEngineTranslation.findUnique({
      where: {
        questionId_lang: {
          questionId: q1Id,
          lang: "hi",
        },
      },
    })
    assert.ok(tr)
    assert.equal(tr.lang, "hi")
    assert.equal(tr.isReviewed, false)
    assert.equal(tr.q, hindiData[0].q)
  })

  it("7. Translation Review: human toggle updates reviewed status", async () => {
    await toggleTranslationReview(q1Id, true, "admin-user-1")

    const tr = await prisma.contentEngineTranslation.findUnique({
      where: {
        questionId_lang: {
          questionId: q1Id,
          lang: "hi",
        },
      },
    })
    assert.ok(tr)
    assert.equal(tr.isReviewed, true)
    assert.equal(tr.reviewedById, "admin-user-1")
    assert.ok(tr.reviewedAt)
  })

  it("8. Quality Gates & Publishing: gate rejection vs pass, slug generation", async () => {
    // Insert a defective question missing an answer
    const badBatch = await addBatch({
      pastedText: `
Q999. Defective Question with no answer?
(a) Option A
(b) Option B
(c) Option C
(d) Option D
`,
    })
    const badList = await getQuestions({ batchId: badBatch.batchId })
    assert.equal(badList.items.length, 1)
    const badId = badList.items[0].id

    // Mark q1 as verified so it passes the quality gate
    await prisma.contentEngineQuestion.update({
      where: { id: q1Id },
      data: { isVerified: true },
    })

    const pubRes = await setQuestionPublishStatus([badId, q1Id], true)
    assert.equal(pubRes.successCount, 1)
    assert.equal(pubRes.rejectedCount, 1)
    assert.ok(pubRes.errors[badId], "Defective question must have gate errors")
    assert.ok(
      pubRes.errors[badId].includes("missing-answer"),
      "Error must identify missing-answer"
    )

    // Check q1 is now published with permanent slug
    const q1Published = await prisma.contentEngineQuestion.findUnique({
      where: { id: q1Id },
    })
    assert.equal(q1Published?.isPublished, true)
    assert.equal(q1Published?.status, "PUBLISHED")
    assert.ok(q1Published?.slug)
    const originalSlug = q1Published.slug

    // Unpublish and re-publish -> slug must remain identical
    await setQuestionPublishStatus([q1Id], false)
    const q1Unpublished = await prisma.contentEngineQuestion.findUnique({
      where: { id: q1Id },
    })
    assert.equal(q1Unpublished?.isPublished, false)

    await setQuestionPublishStatus([q1Id], true)
    const q1RePublished = await prisma.contentEngineQuestion.findUnique({
      where: { id: q1Id },
    })
    assert.equal(q1RePublished?.slug, originalSlug)
  })

  it("9. Public Question Retrieval: field isolation & security", async () => {
    const q1 = await prisma.contentEngineQuestion.findUnique({
      where: { id: q1Id },
    })
    assert.ok(q1?.slug)

    // Retrieve via public method using slug
    const publicView = await getPublicQuestionBySlug(q1.slug)
    assert.ok(publicView, "Public view must be returned for published question")
    assert.equal(publicView.shortId, q1.shortId)
    assert.equal(publicView.q, q1.q)

    // Strict field isolation: ensure internal admin fields are NOT selected
    const rawKeys = Object.keys(publicView)
    assert.ok(!rawKeys.includes("pastedText"), "Must not expose pastedText")
    assert.ok(!rawKeys.includes("createdById"), "Must not expose createdById")
    assert.ok(!rawKeys.includes("reviewedById"), "Must not expose reviewedById")
    assert.ok(!rawKeys.includes("batchId"), "Must not expose batchId")
    assert.ok(!rawKeys.includes("isInferred"), "Must not expose isInferred")

    // Retrieve unpublished question -> must return null
    const badList = await getQuestions({ uncategorizedOnly: true })
    if (badList.items.length > 0) {
      const unpubView = await getPublicQuestionBySlug(badList.items[0].shortId)
      assert.equal(unpubView, null, "Unpublished question must return null to public")
    }
  })

  it("10. Settings service: get and set", async () => {
    await setSetting("exportMode", "primary")
    const val = await getSetting("exportMode", "mirror")
    assert.equal(val, "primary")

    const defVal = await getSetting("nonExistentKey", "default123")
    assert.equal(defVal, "default123")
  })
})
