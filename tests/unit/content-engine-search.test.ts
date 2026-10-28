import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { prisma } from "@/lib/prisma"
import { getQuestions } from "@/lib/modules/content-engine/db-service"

/**
 * B9: the content-engine question list pushed the category filter and the search
 * into the same `where.OR`, so whichever ran last replaced the other. Ticking
 * "uncategorised" and then typing a search dropped the category filter, and a
 * multi-word search was matched as one phrase instead of words that must all be
 * present.
 *
 * Every case below is scoped to a throwaway batch so it does not depend on other
 * rows in the test database.
 */

const nonce = `b9-${Date.now()}`
const shortIds = (suffix: string) => `${nonce}-${suffix}`

describe("B9 content-engine search is ANDed with filters", () => {
  let batchId = ""

  before(async () => {
    await prisma.$connect()
    const batch = await prisma.contentEngineBatch.create({
      data: { pastedText: `B9 fixture ${nonce}`, defaultSubject: "Polity" },
      select: { id: true },
    })
    batchId = batch.id

    await prisma.contentEngineQuestion.createMany({
      data: [
        {
          shortId: shortIds("article-368"),
          textHash: shortIds("article-368"),
          q: `Constitution Article 368 ${nonce}`,
          options: ["a", "b"],
          answer: "a",
          explanation: "amendment procedure",
          sub: "Polity",
          top: "Constitution",
          exam: "UPSC",
          year: "2026",
          isPublished: true,
          batchId,
        },
        {
          shortId: shortIds("of-india"),
          textHash: shortIds("of-india"),
          q: `Constitution of India ${nonce}`,
          options: ["a", "b"],
          answer: "a",
          explanation: "fundamental rights",
          sub: "Polity",
          top: "Constitution",
          exam: "UPSC",
          year: "2025",
          isPublished: true,
          batchId,
        },
        {
          shortId: shortIds("uncategorised"),
          textHash: shortIds("uncategorised"),
          q: `Constitution trivia ${nonce}`,
          options: ["a", "b"],
          answer: "a",
          explanation: null,
          sub: "Uncategorized",
          top: "General",
          exam: "UPSC",
          year: "2026",
          isPublished: true,
          batchId,
        },
        {
          shortId: shortIds("governance"),
          textHash: shortIds("governance"),
          q: `Polity governance ${nonce}`,
          options: ["a", "b"],
          answer: "a",
          explanation: "mentions the Constitution",
          sub: "Polity",
          top: "Governance",
          exam: "SSC",
          year: "2024",
          isPublished: true,
          batchId,
        },
        {
          shortId: shortIds("percent"),
          textHash: shortIds("percent"),
          q: `Save 50% today ${nonce}`,
          options: ["a", "b"],
          answer: "a",
          sub: "Polity",
          top: "Economy",
          exam: "UPSC",
          year: "2026",
          isPublished: true,
          batchId,
        },
        {
          shortId: shortIds("percent-word"),
          textHash: shortIds("percent-word"),
          q: `Save 50 percent today ${nonce}`,
          options: ["a", "b"],
          answer: "a",
          sub: "Polity",
          top: "Economy",
          exam: "UPSC",
          year: "2026",
          isPublished: true,
          batchId,
        },
      ],
    })
  })

  after(async () => {
    await prisma.contentEngineQuestion.deleteMany({ where: { batchId } })
    await prisma.contentEngineBatch.deleteMany({ where: { id: batchId } })
    await prisma.$disconnect()
  })

  const find = async (params: Parameters<typeof getQuestions>[0]) => {
    const result = await getQuestions({ batchId, pageSize: 300, ...params })
    return result
  }

  it("keeps the equality filters when a search is present", async () => {
    const result = await find({ subject: "Polity", search: `Constitution ${nonce}` })
    const ids = result.items.map((q) => q.shortId).sort()

    assert.deepEqual(ids, [
      shortIds("article-368"),
      shortIds("governance"),
      shortIds("of-india"),
    ])
    // the uncategorised question also contains the word but is not Polity
    assert.equal(ids.includes(shortIds("uncategorised")), false)
  })

  it("does not let the search widen the uncategorised filter", async () => {
    const result = await find({ uncategorizedOnly: true, search: `Constitution ${nonce}` })

    assert.deepEqual(
      result.items.map((q) => q.shortId),
      [shortIds("uncategorised")],
      "uncategorisedOnly must still apply when searching"
    )
    assert.equal(result.total, 1)
  })

  it("requires every search token, not the exact phrase", async () => {
    const result = await find({ search: `Constitution 368 ${nonce}` })

    assert.deepEqual(
      result.items.map((q) => q.shortId),
      [shortIds("article-368")],
      "tokens must be ANDed (the phrase itself never appears verbatim)"
    )
  })

  it("treats LIKE wildcards as literal text", async () => {
    const percent = await find({ search: "50%" })
    assert.deepEqual(percent.items.map((q) => q.shortId), [shortIds("percent")])

    const underscore = await find({ search: "50_" })
    assert.deepEqual(underscore.items, [], "a bare underscore must not match any single character")
  })

  it("ANDs search with exam, year and publication state", async () => {
    const result = await find({
      search: `Constitution ${nonce}`,
      exam: "UPSC",
      year: "2026",
      isPublished: true,
    })

    assert.deepEqual(result.items.map((q) => q.shortId), [
      shortIds("article-368"),
      shortIds("uncategorised"),
    ])

    const draft = await find({ search: `Constitution ${nonce}`, exam: "UPSC", isPublished: false })
    assert.deepEqual(draft.items, [])
  })

  it("still paginates the filtered set", async () => {
    const first = await find({ search: `Constitution ${nonce}`, page: 1, pageSize: 2 })
    const second = await find({ search: `Constitution ${nonce}`, page: 2, pageSize: 2 })

    assert.equal(first.total, 4)
    assert.equal(first.items.length, 2)
    assert.equal(second.items.length, 2)
    assert.equal(first.totalPages, 2)

    const all = [...first.items, ...second.items].map((q) => q.shortId)
    assert.equal(new Set(all).size, 4, "pages must not repeat a row")
  })
})
