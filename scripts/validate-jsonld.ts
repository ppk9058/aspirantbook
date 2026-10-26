import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"
import { getQuizSlug } from "../lib/current-affairs/slugs"
import { qaPath } from "../lib/modules/content-engine/paths"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const dbUrl = env.TEST_DATABASE_URL || env.DATABASE_URL
const urlParsed = new URL(dbUrl)
if (urlParsed.hostname !== "127.0.0.1" || urlParsed.port !== "54329") {
  console.error("FATAL: Database is not Docker test DB (127.0.0.1:54329)!", urlParsed.hostname + ":" + urlParsed.port)
  process.exit(1)
}

const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: dbUrl })

interface PageAuditResult {
  module: string
  url: string
  status: number
  scriptCount: number
  hasNestedScript: boolean
  hasHtmlInsideJson: boolean
  jsonParses: boolean
  schemaTypes: string[]
  missingRequiredFields: string[]
  malformedUrls: string[]
  pass: boolean
  details?: string
}

function checkUrlsInObject(obj: any, path: string, malformed: string[]) {
  if (!obj || typeof obj !== "object") return
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => checkUrlsInObject(item, `${path}[${i}]`, malformed))
    return
  }
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") {
      if (key === "url" || key === "item" || key === "sameAs" || key.endsWith("Url")) {
        if (!val || val === "undefined" || val.includes("[object Object]") || (!val.startsWith("http://") && !val.startsWith("https://") && !val.startsWith("/"))) {
          malformed.push(`${path}.${key}='${val}'`)
        }
      }
    } else if (typeof val === "object") {
      checkUrlsInObject(val, `${path}.${key}`, malformed)
    }
  }
}

function validateSchemaEntity(entity: any, moduleName: string, missing: string[]) {
  if (!entity || typeof entity !== "object") {
    missing.push("invalid-entity-object")
    return
  }

  const type = entity["@type"]
  if (!type) {
    missing.push("missing-@type")
    return
  }

  switch (type) {
    case "Course":
      if (!entity.name) missing.push("Course.name")
      if (!entity.description) missing.push("Course.description")
      if (!entity.provider && entity.isAccessibleForFree === undefined) missing.push("Course.provider_or_isAccessibleForFree")
      break
    case "TechArticle":
      if (!entity.headline && !entity.name) missing.push("TechArticle.headline_or_name")
      if (!entity.description) missing.push("TechArticle.description")
      break
    case "Quiz":
      if (!entity.name) missing.push("Quiz.name")
      if (!entity.hasPart && !entity.questions) missing.push("Quiz.hasPart")
      break
    case "Product":
      if (!entity.name) missing.push("Product.name")
      if (!entity.description) missing.push("Product.description")
      if (!entity.offers) {
        missing.push("Product.offers")
      } else {
        const offer = entity.offers
        if (offer["@type"] !== "Offer") missing.push("Offer.@type")
        if (offer.price === undefined || offer.price === null || offer.price === "") missing.push("Offer.price")
        if (offer.priceCurrency !== "INR") missing.push("Offer.priceCurrency")
        if (offer.availability !== "https://schema.org/InStock") missing.push("Offer.availability")
      }
      break
    case "Question":
      if (!entity.name && !entity.text) missing.push("Question.name_or_text")
      if (!entity.acceptedAnswer) missing.push("Question.acceptedAnswer")
      break
    case "BreadcrumbList":
    case "ItemList":
      if (!Array.isArray(entity.itemListElement)) missing.push(`${type}.itemListElement`)
      break
    case "WebPage":
    case "Organization":
      break
    default:
      // Allow other valid Schema.org types
      break
  }
}

async function auditUrl(moduleName: string, path: string): Promise<PageAuditResult> {
  const fullUrl = `${BASE_URL}${path}`
  const res = await fetch(fullUrl)
  const html = await res.text()

  const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const scriptCount = scriptMatches.length

  let hasNestedScript = false
  let jsonParses = true
  let hasHtmlInsideJson = false
  const schemaTypes: string[] = []
  const missingRequiredFields: string[] = []
  const malformedUrls: string[] = []

  if (scriptCount === 0) {
    return {
      module: moduleName,
      url: path,
      status: res.status,
      scriptCount: 0,
      hasNestedScript: false,
      hasHtmlInsideJson: false,
      jsonParses: false,
      schemaTypes: [],
      missingRequiredFields: ["no-jsonld-script-found"],
      malformedUrls: [],
      pass: false,
      details: "No application/ld+json script tag found in HTML",
    }
  }

  for (const match of scriptMatches) {
    const rawContent = match[1].trim()
    // Check if rawContent contains a nested <script> tag
    if (/<script[^>]*>[\s\S]*?<\/script>/i.test(rawContent) || /<script[\s\S]*?>/i.test(rawContent)) {
      hasNestedScript = true
    }

    if (/<[a-z][\s\S]*>/i.test(rawContent)) {
      hasHtmlInsideJson = true
    }

    try {
      const parsed = JSON.parse(rawContent)

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item["@context"] !== "https://schema.org") {
            missingRequiredFields.push("invalid-@context")
          }
          schemaTypes.push(item["@type"] || "unknown")
          validateSchemaEntity(item, moduleName, missingRequiredFields)
          checkUrlsInObject(item, item["@type"] || "arrayItem", malformedUrls)
        }
      } else if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        if (parsed["@context"] !== "https://schema.org") {
          missingRequiredFields.push("invalid-@context")
        }
        for (const item of parsed["@graph"]) {
          schemaTypes.push(item["@type"] || "unknown")
          validateSchemaEntity(item, moduleName, missingRequiredFields)
          checkUrlsInObject(item, item["@type"] || "graphItem", malformedUrls)
        }
      } else {
        if (parsed["@context"] !== "https://schema.org") {
          missingRequiredFields.push("invalid-@context")
        }
        schemaTypes.push(parsed["@type"] || "unknown")
        validateSchemaEntity(parsed, moduleName, missingRequiredFields)
        checkUrlsInObject(parsed, parsed["@type"] || "root", malformedUrls)
      }
    } catch (e: any) {
      jsonParses = false
      missingRequiredFields.push(`json-parse-failed: ${e?.message}`)
    }
  }

  const pass =
    res.status === 200 &&
    scriptCount >= 1 &&
    !hasNestedScript &&
    !hasHtmlInsideJson &&
    jsonParses &&
    missingRequiredFields.length === 0 &&
    malformedUrls.length === 0

  return {
    module: moduleName,
    url: path,
    status: res.status,
    scriptCount,
    hasNestedScript,
    hasHtmlInsideJson,
    jsonParses,
    schemaTypes,
    missingRequiredFields,
    malformedUrls,
    pass,
  }
}

async function ensureSeedData() {
  // Ensure at least 10 CA tests exist for audit
  const existingCa = await prisma.examTest.findMany({
    where: { testType: "CURRENT_AFFAIRS", isPublished: true },
  })
  if (existingCa.length < 10) {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
    const caSeries = await prisma.examSeries.findFirst({ where: { slug: "current-affairs-system-series" } })
    if (caSeries) {
      const needed = 10 - existingCa.length
      for (let i = 1; i <= needed; i++) {
        await prisma.examTest.create({
          data: {
            title: `Daily CA Quiz Sample Test ${i}`,
            testType: "CURRENT_AFFAIRS",
            isPublished: true,
            durationMinutes: 10,
            totalMarks: 20,
            seriesId: caSeries.id,
            createdById: admin?.id || "seed-admin",
          },
        })
      }
    }
  }

  // Ensure at least 10 Test Series exist for audit
  const existingSeries = await prisma.examSeries.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      slug: { notIn: ["current-affairs-system-series", "pyq-system-series", "unassigned-tests-system-series"] },
    },
  })
  if (existingSeries.length < 10) {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
    const needed = 10 - existingSeries.length
    for (let i = 1; i <= needed; i++) {
      const slug = `sample-audit-series-${i}`
      const exists = await prisma.examSeries.findUnique({ where: { slug } })
      if (!exists) {
        await prisma.examSeries.create({
          data: {
            title: `Sample Audit Test Series ${i}`,
            slug,
            category: "General Studies",
            examName: "General Studies",
            isPublished: true,
            isFree: true,
            createdById: admin?.id || "seed-admin",
          },
        })
      }
    }
  }
}

async function run() {
  const logLines: string[] = []
  function log(msg: string) {
    console.log(msg)
    logLines.push(msg)
  }

  log("=================================================================")
  log("PHASE B: CROSS-MODULE STRUCTURAL JSON-LD AUDIT (6 MODULES, 10+ URLS EACH)")
  log("=================================================================")
  log(`DB resolved host:port -> ${urlParsed.hostname}:${urlParsed.port}`)
  log(`Base URL: ${BASE_URL}`)
  log(`Timestamp: ${new Date().toISOString()}\n`)

  await ensureSeedData()

  // 1. Tutorials (10 URLs)
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
    take: 12,
  })
  const tutorialUrls = courses.map((c) => `/tutorials/${c.slug}`)

  // 2. Current Affairs Quizzes (10 URLs)
  const quizzes = await prisma.examTest.findMany({
    where: { testType: "CURRENT_AFFAIRS", isPublished: true },
    select: { id: true, title: true, updatedAt: true },
    take: 12,
  })
  const quizUrls = quizzes.map((q) => `/current-affairs-quizzes/${getQuizSlug(q)}`)

  // 3. PYQs (10 URLs)
  const pyqs = await prisma.pyqCategory.findMany({
    where: { isPublished: true },
    select: { slug: true },
    take: 12,
  })
  const pyqUrls = pyqs.map((p) => `/pyqs/${p.slug}`)

  // 4. Test Series (10 URLs)
  const seriesList = await prisma.examSeries.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      slug: { notIn: ["current-affairs-system-series", "pyq-system-series", "unassigned-tests-system-series"] },
    },
    select: { id: true, slug: true, isFree: true },
    take: 12,
  })
  const seriesUrls = seriesList.map((s) => `/test-series/${s.slug || s.id}`)

  // 5. Books (10 URLs)
  const { getAllBooks } = await import("../lib/books/bookService")
  const allBooks = await getAllBooks()
  const bookUrls = allBooks.slice(0, 10).map((b) => `/books/${b.slug || b.id}`)

  // 6. Content Engine (10 URLs: English and Hindi)
  const enQuestions = (
    await prisma.contentEngineQuestion.findMany({
      where: { isPublished: true, slug: { not: null }, exam: { not: null }, sub: { not: null } },
      select: { exam: true, sub: true, slug: true },
    })
  ).filter((q) => q.slug && /(?:^|q-)([a-z0-9]{8})(?:-.*)?$/i.test(q.slug) && !q.slug.includes("1792968570597"))

  const hiQuestions = (
    await prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { not: null },
        sub: { not: null },
        translations: { some: { lang: "hi", isReviewed: true } },
      },
      select: { exam: true, sub: true, slug: true },
    })
  ).filter((q) => q.slug && /(?:^|q-)([a-z0-9]{8})(?:-.*)?$/i.test(q.slug) && !q.slug.includes("1792968570597"))

  const ceUrls = [
    ...enQuestions.slice(0, 5).map((q) => qaPath("en", q.exam, q.sub, q.slug!)),
    ...hiQuestions.slice(0, 5).map((q) => qaPath("hi", q.exam, q.sub, q.slug!)),
  ]

  const modulesToAudit: Record<string, string[]> = {
    Tutorials: tutorialUrls.slice(0, 10),
    "Current Affairs": quizUrls.slice(0, 10),
    PYQs: pyqUrls.slice(0, 10),
    "Test Series": seriesUrls.slice(0, 10),
    Books: bookUrls.slice(0, 10),
    "Content Engine": ceUrls.slice(0, 10),
  }

  let totalAudited = 0
  let totalPassed = 0
  const resultsByModule: Record<string, PageAuditResult[]> = {}

  for (const [moduleName, urls] of Object.entries(modulesToAudit)) {
    log(`\n======================================================`)
    log(`AUDITING MODULE: ${moduleName.toUpperCase()} (${urls.length} URLs)`)
    log(`======================================================`)
    resultsByModule[moduleName] = []

    for (const url of urls) {
      totalAudited++
      try {
        const res = await auditUrl(moduleName, url)
        resultsByModule[moduleName].push(res)
        if (res.pass) totalPassed++

        const statusIcon = res.pass ? "✓ PASS" : "✗ FAIL"
        log(`${statusIcon} [${res.status}] ${url}`)
        log(`       Scripts: ${res.scriptCount} | Nested: ${res.hasNestedScript} | Parse: ${res.jsonParses} | Types: [${res.schemaTypes.join(", ")}]`)
        if (!res.pass) {
          log(`       Missing: ${res.missingRequiredFields.join(", ") || "none"}`)
          log(`       Malformed URLs: ${res.malformedUrls.join(", ") || "none"}`)
          if (res.details) log(`       Details: ${res.details}`)
        }
      } catch (err: any) {
        log(`✗ ERROR [FETCH FAILED] ${url}: ${err?.message}`)
        resultsByModule[moduleName].push({
          module: moduleName,
          url,
          status: 0,
          scriptCount: 0,
          hasNestedScript: false,
          hasHtmlInsideJson: false,
          jsonParses: false,
          schemaTypes: [],
          missingRequiredFields: [`fetch-error: ${err?.message}`],
          malformedUrls: [],
          pass: false,
        })
      }
    }
  }

  // B2 Specific Offer Verification for Test Series:
  log(`\n======================================================`)
  log(`B2 SPECIFIC TEST: TEST-SERIES OFFER SCHEMA EDGE CASES`)
  log(`======================================================`)

  const { adaptTestSeriesDetailSeo } = await import("../lib/seo/adapters/test-series")

  // Helper to extract Product or Course entity from jsonLd
  function getEntity(pkg: any) {
    return pkg.jsonLd.find((s: any) => s["@type"] === "Product" || s["@type"] === "Course")
  }

  const paidTest = adaptTestSeriesDetailSeo({
    id: "ts-paid",
    title: "Paid Mock Series",
    slug: "paid-mock-series",
    isPublished: true,
    price: 499,
  })
  const paidEntity = getEntity(paidTest)
  const paidOffer = paidEntity?.offers
  const paidPass = paidOffer?.price === "499" && paidOffer?.priceCurrency === "INR" && paidOffer?.availability === "https://schema.org/InStock"
  log(`1. Paid Series Offer Schema: ${paidPass ? "✓ PASS" : "✗ FAIL"} (price: ${paidOffer?.price}, currency: ${paidOffer?.priceCurrency})`)

  const freeTest = adaptTestSeriesDetailSeo({
    id: "ts-free",
    title: "Free Mock Series",
    slug: "free-mock-series",
    isPublished: true,
    isFree: true,
  })
  const freeEntity = getEntity(freeTest)
  const freeOffer = freeEntity?.offers
  const freePass = freeOffer?.price === "0" && freeOffer?.priceCurrency === "INR" && freeOffer?.availability === "https://schema.org/InStock"
  log(`2. Free Series Offer Schema: ${freePass ? "✓ PASS" : "✗ FAIL"} (price: ${freeOffer?.price}, currency: ${freeOffer?.priceCurrency})`)

  const unpubTest = adaptTestSeriesDetailSeo({
    id: "ts-unpub",
    title: "Draft Mock Series",
    slug: "draft-mock-series",
    isPublished: false,
  })
  const unpubEntity = getEntity(unpubTest)
  const unpubPass = !unpubEntity?.offers && unpubTest.robots.includes("noindex")
  log(`3. Unpublished Series Schema: ${unpubPass ? "✓ PASS" : "✗ FAIL"} (offers: ${unpubEntity?.offers || "none"}, robots: ${unpubTest.robots})`)

  const noPriceTest = adaptTestSeriesDetailSeo({
    id: "ts-noprice",
    title: "Coming Soon Series",
    slug: "coming-soon-series",
    isPublished: true,
    price: null,
  })
  const noPriceEntity = getEntity(noPriceTest)
  const noPriceType = noPriceEntity?.["@type"]
  const noPriceHasOffer = Boolean(noPriceEntity?.offers)
  const noPricePass = noPriceType === "Product" && !noPriceHasOffer
  log(`4. Missing Price Series Fallback: ${noPricePass ? "✓ PASS" : "✗ FAIL"} (schema @type: ${noPriceType}, hasOffer: ${noPriceHasOffer})`)

  log(`\n======================================================`)
  log(`AUDIT SUMMARY: ${totalPassed} / ${totalAudited} URLs PASSED VALIDATION`)
  log(`======================================================`)

  fs.writeFileSync("docs/release/evidence/phaseB_jsonld_validation.txt", logLines.join("\n") + "\n")
  log("Saved evidence to docs/release/evidence/phaseB_jsonld_validation.txt")

  if (totalPassed < totalAudited || !paidPass || !freePass || !unpubPass || !noPricePass) {
    console.error("FAIL: Some URLs or schema edge cases failed JSON-LD validation!")
    process.exit(1)
  }
}

run()
  .catch((err) => {
    console.error("FATAL ERROR IN JSON-LD AUDIT:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
