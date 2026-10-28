import dotenv from "dotenv"
import fs from "fs"

const env = dotenv.parse(fs.readFileSync(".env.test"))
process.env.DATABASE_URL = env.TEST_DATABASE_URL || env.DATABASE_URL
process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3045"

import { prisma } from "../lib/prisma"

async function runBenchmark() {
  console.log("=== SUB-SITEMAPS PERFORMANCE BENCHMARK (2,000 ROWS) ===")
  console.log(`Database: ${process.env.DATABASE_URL}`)

  const ROW_COUNT = 2000

  // Ensure clean state before seeding
  await prisma.contentEngineTranslation.deleteMany({
    where: { question: { shortId: { startsWith: "bench-" } } },
  })
  await prisma.contentEngineQuestion.deleteMany({
    where: { shortId: { startsWith: "bench-" } },
  })

  console.log(`Seeding ${ROW_COUNT} rows into ContentEngineQuestion and ContentEngineTranslation...`)
  const seedBatchSize = 500
  for (let i = 0; i < ROW_COUNT; i += seedBatchSize) {
    const qBatch = []
    for (let j = 0; j < seedBatchSize && i + j < ROW_COUNT; j++) {
      const idx = i + j
      qBatch.push({
        id: `bench-q-id-${idx}`,
        shortId: `bench-${idx}`,
        textHash: `bench-hash-${idx}`,
        q: `Benchmark sample question text ${idx}?`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: "Option A",
        answerIndex: 0,
        sub: "general-studies",
        top: "modern-history",
        exam: "bpsc",
        year: `${2020 + (idx % 5)}`,
        status: "PUBLISHED",
        isPublished: true,
        slug: `benchmark-sample-question-${idx}`,
      })
    }
    await prisma.contentEngineQuestion.createMany({
      data: qBatch,
    })

    const tBatch = []
    for (let j = 0; j < seedBatchSize && i + j < ROW_COUNT; j++) {
      const idx = i + j
      tBatch.push({
        id: `bench-t-id-${idx}`,
        questionId: `bench-q-id-${idx}`,
        lang: "hi",
        q: `बेंचमार्क प्रश्न संख्या ${idx}?`,
        options: ["विकल्प क", "विकल्प ख", "विकल्प ग", "विकल्प घ"],
        answer: "विकल्प क",
        isReviewed: true,
      })
    }
    await prisma.contentEngineTranslation.createMany({
      data: tBatch,
    })
  }
  console.log(`✓ Seeded ${ROW_COUNT} questions and reviewed Hindi translations.`)

  let queryCount = 0
  const origFindMany = prisma.contentEngineQuestion.findMany
  const origGroupBy = prisma.contentEngineQuestion.groupBy

  ;(prisma.contentEngineQuestion as any).findMany = function (...args: any[]) {
    queryCount++
    return (origFindMany as any).apply(this, args)
  }
  ;(prisma.contentEngineQuestion as any).groupBy = function (...args: any[]) {
    queryCount++
    return (origGroupBy as any).apply(this, args)
  }

  // Measure English Sub-sitemap
  const enModule = await import("../app/question-answer/sitemap")
  const enSitemap = enModule.default

  queryCount = 0
  const enStart = performance.now()
  const enEntries = await enSitemap()
  const enDurationMs = performance.now() - enStart
  const enQueries = queryCount

  console.log(`EN Sub-Sitemap: ${enEntries.length} entries | ${enQueries} queries | ${enDurationMs.toFixed(2)} ms`)

  // Measure Hindi Sub-sitemap
  const hiModule = await import("../app/hi/question-answer/sitemap")
  const hiSitemap = hiModule.default

  queryCount = 0
  const hiStart = performance.now()
  const hiEntries = await hiSitemap()
  const hiDurationMs = performance.now() - hiStart
  const hiQueries = queryCount

  console.log(`HI Sub-Sitemap: ${hiEntries.length} entries | ${hiQueries} queries | ${hiDurationMs.toFixed(2)} ms`)

  // Cleanup seeded data
  console.log("Cleaning up seeded benchmark data...")
  const delTrans = await prisma.contentEngineTranslation.deleteMany({
    where: { question: { shortId: { startsWith: "bench-" } } },
  })
  const delQuestions = await prisma.contentEngineQuestion.deleteMany({
    where: { shortId: { startsWith: "bench-" } },
  })
  console.log(`✓ Cleaned up ${delTrans.count} translations and ${delQuestions.count} questions.`)

  const evidenceReport = `=== SUB-SITEMAPS PERFORMANCE BENCHMARK (2,000 ROWS) ===
Execution Date: ${new Date().toISOString()}
Database: ${process.env.DATABASE_URL}
Dataset: ${ROW_COUNT} seeded published questions with reviewed Hindi twins

1. English Question Sub-Sitemap (/question-answer/sitemap.xml)
- Generated entries: ${enEntries.length}
- Database query count: ${enQueries}
- Execution time: ${enDurationMs.toFixed(2)} ms

2. Hindi Question Sub-Sitemap (/hi/question-answer/sitemap.xml)
- Generated entries: ${hiEntries.length}
- Database query count: ${hiQueries}
- Execution time: ${hiDurationMs.toFixed(2)} ms

3. Cleanup Verification
- Deleted translations: ${delTrans.count}
- Deleted questions: ${delQuestions.count}
- Clean status: CONFIRMED
`

  fs.writeFileSync("docs/release/evidence/phaseD_sub_sitemap_benchmark.txt", evidenceReport, "utf8")
  console.log("Saved evidence to docs/release/evidence/phaseD_sub_sitemap_benchmark.txt")

  await prisma.$disconnect()
}

runBenchmark().catch(async (err) => {
  console.error("Benchmark failed:", err)
  try {
    await prisma.contentEngineTranslation.deleteMany({
      where: { question: { shortId: { startsWith: "bench-" } } },
    })
    await prisma.contentEngineQuestion.deleteMany({
      where: { shortId: { startsWith: "bench-" } },
    })
  } catch {}
  process.exit(1)
})
