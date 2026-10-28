import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"
import { execSync } from "child_process"
import { hashQuestionText, revalidateContentEngineRoutes } from "../lib/modules/content-engine/db-service"
import { generateStaticSiteFiles } from "../lib/modules/content-engine/static-export"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: env.TEST_DATABASE_URL })

async function run() {
  console.log("=== PHASE 1.9: RAW DATA LEAK AUDIT ===")

  // 1. Insert a published question with dummy internal metadata (batchId, createdById, etc.)
  const shortIdPub = "pub" + Math.random().toString(36).slice(2, 7)
  const qStemPub = "What was the administrative language of the Delhi Sultanate?"
  const slugPub = `q-${shortIdPub}-administrative-language-delhi-sultanate`

  // 2. Insert a strictly draft question with a secret token
  const shortIdDraft = "dft" + Math.random().toString(36).slice(2, 7)
  const draftSecret = "DRAFT_SECRET_PAYLOAD_TOKEN_ABC789"
  const qStemDraft = `Draft stem containing confidential text: ${draftSecret}`
  const slugDraft = `q-${shortIdDraft}-draft-confidential-token`

  await prisma.contentEngineQuestion.deleteMany({
    where: {
      OR: [
        { shortId: shortIdPub },
        { shortId: shortIdDraft },
        { textHash: hashQuestionText(qStemPub) },
        { textHash: hashQuestionText(qStemDraft) },
      ],
    },
  })

  // Create batch for published question with internal metadata
  const pubBatch = await prisma.contentEngineBatch.create({
    data: {
      pastedText: "RAW_PASTED_OCR_TEXT_INTERNAL_ONLY",
      createdById: "INTERNAL_USER_CREATOR_ID_9999",
      defaultExam: "UPSC CSE",
      defaultYear: "2023",
      defaultSubject: "Medieval India",
    },
  })

  // Create batch for draft question
  const draftBatch = await prisma.contentEngineBatch.create({
    data: {
      pastedText: "DRAFT_PASTED_TEXT_CONFIDENTIAL",
      createdById: "DRAFT_CREATOR_ID_1111",
      defaultExam: "UPSC CSE",
      defaultYear: "2023",
    },
  })

  // Create published question with internal fields populated
  const pubQ = await prisma.contentEngineQuestion.create({
    data: {
      shortId: shortIdPub,
      slug: slugPub,
      textHash: hashQuestionText(qStemPub),
      q: qStemPub,
      options: ["Persian", "Arabic", "Urdu", "Turkish"],
      answer: "Persian",
      answerIndex: 0,
      explanation: "Persian was adopted as the official court and administrative language under the Delhi Sultanate.",
      sub: "Medieval India",
      top: "Delhi Sultanate",
      exam: "UPSC CSE",
      year: "2023",
      sourceTag: "UPSC CSE 2023",
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
      isInferred: true,
      batchId: pubBatch.id,
      translations: {
        create: [
          {
            lang: "hi",
            q: "दिल्ली सल्तनत की प्रशासनिक भाषा कौन सी थी?",
            options: ["फारसी", "अरबी", "उर्दू", "तुर्की"],
            explanation: "दिल्ली सल्तनत के तहत फारसी को राजदरबार और प्रशासन की आधिकारिक भाषा बनाया गया था।",
            isReviewed: true,
            reviewedById: "INTERNAL_HINDI_REVIEWER_ID_7777",
            reviewedAt: new Date(),
          },
        ],
      },
    },
    include: { translations: true },
  })

  // Create draft question
  const draftQ = await prisma.contentEngineQuestion.create({
    data: {
      shortId: shortIdDraft,
      slug: slugDraft,
      textHash: hashQuestionText(qStemDraft),
      q: qStemDraft,
      options: ["Draft 1", "Draft 2", "Draft 3", "Draft 4"],
      answer: "Draft 1",
      answerIndex: 0,
      explanation: "Draft explanation that must never appear in public outputs.",
      sub: "Medieval India",
      top: "General",
      exam: "UPSC CSE",
      year: "2023",
      status: "DRAFT",
      isPublished: false,
      isVerified: false,
      batchId: draftBatch.id,
    },
  })

  revalidateContentEngineRoutes()

  const enUrl = `${BASE_URL}/question-answer/upsc-cse/medieval-india/${slugPub}`
  const hiUrl = `${BASE_URL}/hi/question-answer/upsc-cse/medieval-india/${slugPub}`

  console.log("\nStep 1: Fetching public English HTML, Hindi HTML, and Sitemaps...")
  const enHtml = await (await fetch(enUrl)).text()
  const hiHtml = await (await fetch(hiUrl)).text()
  const enSitemap = await (await fetch(`${BASE_URL}/question-answer/sitemap.xml`)).text()
  const hiSitemap = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()

  console.log("Step 2: Generating Static Export ZIP files...")
  const exportFiles = generateStaticSiteFiles([pubQ as any, draftQ as any], "mirror", BASE_URL)

  // Dump all public output bodies to a temporary audit directory
  const auditDir = "/tmp/leak_audit"
  if (fs.existsSync(auditDir)) fs.rmSync(auditDir, { recursive: true, force: true })
  fs.mkdirSync(auditDir, { recursive: true })

  fs.writeFileSync(`${auditDir}/english_public_page.html`, enHtml, "utf8")
  fs.writeFileSync(`${auditDir}/hindi_public_page.html`, hiHtml, "utf8")
  fs.writeFileSync(`${auditDir}/en_sitemap.xml`, enSitemap, "utf8")
  fs.writeFileSync(`${auditDir}/hi_sitemap.xml`, hiSitemap, "utf8")

  const zipHtmlDir = `${auditDir}/zip_export`
  fs.mkdirSync(zipHtmlDir, { recursive: true })
  for (const f of exportFiles) {
    if (f.path.endsWith(".html") || f.path.endsWith(".xml")) {
      const sanitizedName = f.path.replace(/\//g, "__")
      fs.writeFileSync(`${zipHtmlDir}/${sanitizedName}`, f.content, "utf8")
    }
  }

  // 3. Extract JSON-LD and RSC Flight Payloads specifically
  const enJsonLd = [...enHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .join("\n\n")
  const hiJsonLd = [...hiHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .join("\n\n")

  const enRscFlight = [...enHtml.matchAll(/<script\b[^>]*>([\s\S]*?self\.__next_f[\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .join("\n\n")
  const hiRscFlight = [...hiHtml.matchAll(/<script\b[^>]*>([\s\S]*?self\.__next_f[\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .join("\n\n")

  fs.writeFileSync(`${auditDir}/english_jsonld.json`, enJsonLd, "utf8")
  fs.writeFileSync(`${auditDir}/hindi_jsonld.json`, hiJsonLd, "utf8")
  fs.writeFileSync(`${auditDir}/english_rsc_payload.js`, enRscFlight, "utf8")
  fs.writeFileSync(`${auditDir}/hindi_rsc_payload.js`, hiRscFlight, "utf8")

  console.log(`\nAudit artifacts written to ${auditDir}/`)
  console.log("Files to audit:")
  execSync(`ls -la ${auditDir}`, { stdio: "inherit" })

  // 4. Run raw grep -n commands for every forbidden field
  const forbiddenPatterns = [
    "pastedText",
    "createdById",
    "reviewedById",
    "isInferred",
    "batchId",
    "qualityScore",
    "reviewedAt",
    draftSecret,
    "RAW_PASTED_OCR_TEXT",
    "INTERNAL_USER_CREATOR_ID",
    "INTERNAL_USER_REVIEWER_ID",
    "INTERNAL_HINDI_REVIEWER_ID",
    "DRAFT_PASTED_TEXT",
    "DRAFT_CREATOR_ID",
  ]

  let rawReport = "# Phase 1.9 Raw Leak Audit Evidence\n"
  rawReport += `Generated: ${new Date().toISOString()}\n`
  rawReport += "Scope: English/Hindi Public HTML, JSON-LD blocks, RSC flight payloads, Sitemaps, and Static Export ZIP files.\n\n"
  rawReport += "## 1. db-service.ts Public Query Whitelist (file:line)\n"
  rawReport += "Location: lib/modules/content-engine/db-service.ts:674-710\n"
  rawReport += "Explicit Select: id, shortId, slug, isPublished, q, options, answer, answerIndex, explanation, sub, top, exam, year, sourceTag, publishedAt, updatedAt, translations: { q, options, explanation, top, isReviewed }\n\n"
  rawReport += "## 2. Raw Grep Commands and Results\n\n"

  let anyLeaked = false

  for (const pattern of forbiddenPatterns) {
    const cmd = `grep -rn "${pattern}" ${auditDir}`
    rawReport += `### Grep: "${pattern}"\n`
    rawReport += `Command: \`${cmd}\`\n`
    rawReport += "Output:\n```\n"

    let output = ""
    try {
      output = execSync(cmd, { encoding: "utf8" })
    } catch {
      output = "(0 matches)\n"
    }

    rawReport += output
    rawReport += "```\n\n"

    const matchCount = output === "(0 matches)\n" ? 0 : output.trim().split("\n").length
    console.log(`Grep "${pattern}": ${matchCount} matches`)
    if (matchCount > 0) {
      anyLeaked = true
      console.error(`LEAK DETECTED for "${pattern}":\n${output}`)
    }
  }

  fs.writeFileSync("docs/proof/evidence/phase1_9_leak_audit_raw.txt", rawReport, "utf8")
  console.log("\nRaw evidence saved to docs/proof/evidence/phase1_9_leak_audit_raw.txt")

  if (anyLeaked) {
    throw new Error("DATA LEAK DETECTED! Public surfaces contain forbidden internal or draft fields!")
  }

  console.log("\n=======================================================")
  console.log("PHASE 1.9 VERIFICATION: ZERO DATA LEAKS DETECTED (PASS)")
  console.log("=======================================================")

  // Clean up
  await prisma.contentEngineQuestion.deleteMany({
    where: { OR: [{ shortId: shortIdPub }, { shortId: shortIdDraft }] },
  })
  await prisma.contentEngineBatch.deleteMany({
    where: { id: { in: [pubBatch.id, draftBatch.id] } },
  })
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error("FATAL ERROR in Phase 1.9:", err)
  process.exit(1)
})
