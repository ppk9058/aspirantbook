import { prisma } from "../lib/prisma"
import { chunkContent, computeContentHash } from "../lib/authwall/chunker"

function getMaskedHost(urlStr?: string): string {
  if (!urlStr) return "[UNKNOWN]"
  try {
    const u = new URL(urlStr)
    const host = u.host.replace(/^([^.]{3})[^.]*/, "$1***")
    return `${host}${u.pathname}`
  } catch {
    return "[MASKED_HOST]"
  }
}

/**
 * Idempotent backfill script:
 * - Only fills missing chunk data (blockCount IS NULL or contentHash IS NULL)
 * - Never overwrites or deletes existing chunk data
 * - Prints masked host and dry-run summary
 */
async function backfillContentChunks() {
  const isDryRun = process.argv.includes("--dry-run")
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  console.log(`[content:chunk] Target DB Host: ${getMaskedHost(directUrl)}`)
  console.log(`[content:chunk] Mode: ${isDryRun ? "DRY RUN (no database writes)" : "EXECUTE (filling missing chunks only)"}`)

  // 1. Audit Lessons needing chunk data
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
    take: 5000,
  })

  // 2. Audit ExamTests needing chunk data
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
    take: 5000,
  })

  // 3. Audit CurrentAffairsPdf needing chunk data
  const casToChunk = await prisma.currentAffairsPdf.findMany({
    where: {
      OR: [
        { blockCount: null },
        { contentHash: null },
      ],
    },
    select: {
      id: true,
      title: true,
      blockCount: true,
      contentHash: true,
    },
    take: 5000,
  })

  console.log("\n--- [content:chunk] Dry-Run Summary ---")
  console.log(`- Lessons with missing chunk data: ${lessonsToChunk.length}`)
  console.log(`- Exam Tests with missing chunk data: ${testsToChunk.length}`)
  console.log(`- Current Affairs PDFs with missing chunk data: ${casToChunk.length}`)
  console.log(`- Total items requiring backfill: ${lessonsToChunk.length + testsToChunk.length + casToChunk.length}`)

  if (isDryRun) {
    console.log("\n[content:chunk] DRY RUN COMPLETE. No data modified.")
    return
  }

  // Execute Idempotent Writes
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

  let updatedCas = 0
  for (const ca of casToChunk) {
    const blockCount = 1
    const contentHash = computeContentHash([ca.title, ca.id])

    await prisma.currentAffairsPdf.update({
      where: { id: ca.id },
      data: {
        blockCount: ca.blockCount ?? blockCount,
        contentHash: ca.contentHash ?? contentHash,
      },
    })
    updatedCas++
  }

  console.log("\n--- [content:chunk] Backfill Execution Results ---")
  console.log(`- Successfully backfilled lessons: ${updatedLessons}`)
  console.log(`- Successfully backfilled tests: ${updatedTests}`)
  console.log(`- Successfully backfilled current affairs: ${updatedCas}`)
  console.log(`- Total items backfilled: ${updatedLessons + updatedTests + updatedCas}`)
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
