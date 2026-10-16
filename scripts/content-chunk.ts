import { prisma } from "../lib/prisma"
import { chunkContent, computeContentHash } from "../lib/authwall/chunker"

/**
 * Idempotent backfill script:
 * - Only fills missing chunk data (blockCount IS NULL or contentHash IS NULL)
 * - Never overwrites existing chunk data
 * - Safe to run on dev or test database
 */
async function backfillContentChunks() {
  console.log("=== [content:chunk] Starting idempotent content chunking backfill ===")

  // 1. Backfill Lessons
  const lessonsToChunk = await prisma.lesson.findMany({
    where: {
      OR: [
        { blockCount: null },
        { contentHash: null },
      ],
      content: { not: null },
    },
    select: {
      id: true,
      title: true,
      content: true,
      blockCount: true,
      contentHash: true,
    },
    take: 1000,
  })

  console.log(`[content:chunk] Found ${lessonsToChunk.length} lessons needing chunk data.`)

  let updatedLessons = 0
  for (const lesson of lessonsToChunk) {
    if (!lesson.content) continue
    const blocks = chunkContent(lesson.content)
    const blockCount = blocks.length
    const contentHash = computeContentHash(blocks)

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        blockCount: lesson.blockCount ?? blockCount,
        contentHash: lesson.contentHash ?? contentHash,
      },
    })
    updatedLessons++
  }

  console.log(`[content:chunk] Successfully backfilled ${updatedLessons} lessons.`)

  // 2. Backfill ExamTests (with questions count as blocks)
  const testsToChunk = await prisma.examTest.findMany({
    where: {
      OR: [
        { blockCount: null },
        { contentHash: null },
      ],
    },
    include: {
      sections: {
        include: {
          questions: {
            select: { id: true, questionEn: true, order: true },
          },
        },
      },
    },
    take: 1000,
  })

  console.log(`[content:chunk] Found ${testsToChunk.length} tests needing chunk data.`)

  let updatedTests = 0
  for (const test of testsToChunk) {
    const allQuestions = test.sections.flatMap((s) => s.questions || [])
    const blockCount = allQuestions.length
    const contentHash = computeContentHash(allQuestions.map((q) => q.id || q.questionEn))

    await prisma.examTest.update({
      where: { id: test.id },
      data: {
        blockCount: test.blockCount ?? blockCount,
        contentHash: test.contentHash ?? contentHash,
      },
    })
    updatedTests++
  }

  console.log(`[content:chunk] Successfully backfilled ${updatedTests} tests.`)
  console.log("=== [content:chunk] Completed successfully ===")
}

backfillContentChunks()
  .catch((err) => {
    console.error("[content:chunk] Error during backfill:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
