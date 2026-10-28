import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"
import { hashQuestionText } from "../lib/modules/content-engine/db-service"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const dbUrl = env.TEST_DATABASE_URL || env.DATABASE_URL
const urlParsed = new URL(dbUrl)
if (urlParsed.hostname !== "127.0.0.1" || urlParsed.port !== "54329") {
  console.error("FATAL: Database is not Docker test DB (127.0.0.1:54329)!", urlParsed.hostname + ":" + urlParsed.port)
  process.exit(1)
}

const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: dbUrl })

async function loginAdmin(): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const csrfCookies = csrfRes.headers.getSetCookie()
  const csrfData = await csrfRes.json()
  const cookieHeader = csrfCookies.map((c) => c.split(";")[0]).join("; ")

  const params = new URLSearchParams()
  params.append("email", "admin@aspirantbook.com")
  params.append("password", "Test@123")
  params.append("csrfToken", csrfData.csrfToken)
  params.append("redirect", "false")

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body: params.toString(),
    redirect: "manual",
  })

  const loginCookies = loginRes.headers.getSetCookie()
  const sessionToken = loginCookies.find((c) => c.includes("session-token"))
  if (!sessionToken) throw new Error("Admin login failed")
  return sessionToken.split(";")[0]
}

async function run() {
  const logLines: string[] = []
  function log(msg: string) {
    console.log(msg)
    logLines.push(msg)
  }

  log("=====================================================")
  log("PHASE A: SITEMAP ISR AND ON-DEMAND REVALIDATION PROOF")
  log("=====================================================")
  log(`DB resolved host:port -> ${urlParsed.hostname}:${urlParsed.port}`)
  log(`Base URL: ${BASE_URL}`)
  log(`Timestamp: ${new Date().toISOString()}`)

  // 1. Initial HTTP GET tests
  log("\n--- STEP 1: Main Sitemap GET /sitemap.xml ---")
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`)
  log(`GET /sitemap.xml Status: ${sitemapRes.status} (expected 200)`)
  const sitemapXml = await sitemapRes.text()
  log(`Content-Type: ${sitemapRes.headers.get("content-type")}`)
  log(`Cache-Control: ${sitemapRes.headers.get("cache-control")}`)
  log(`Body length: ${sitemapXml.length} bytes`)
  log(`Starts with <?xml: ${sitemapXml.startsWith("<?xml") || sitemapXml.startsWith("<urlset")}`)
  if (sitemapRes.status !== 200 || !sitemapXml.includes("<urlset")) {
    throw new Error("Failed main sitemap verification")
  }

  log("\n--- STEP 2: Content Engine Sitemap GET /question-answer/sitemap.xml ---")
  const qaResInit = await fetch(`${BASE_URL}/question-answer/sitemap.xml`)
  log(`GET /question-answer/sitemap.xml Status: ${qaResInit.status} (expected 200)`)
  const qaXmlInit = await qaResInit.text()
  log(`Body length: ${qaXmlInit.length} bytes`)
  if (qaResInit.status !== 200 || !qaXmlInit.includes("<urlset")) {
    throw new Error("Failed QA sitemap verification")
  }

  log("\n--- STEP 3: Hindi Content Engine Sitemap GET /hi/question-answer/sitemap.xml ---")
  const hiResInit = await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)
  log(`GET /hi/question-answer/sitemap.xml Status: ${hiResInit.status} (expected 200)`)
  const hiXmlInit = await hiResInit.text()
  log(`Body length: ${hiXmlInit.length} bytes`)
  if (hiResInit.status !== 200 || !hiXmlInit.includes("<urlset")) {
    throw new Error("Failed Hindi QA sitemap verification")
  }

  // Admin login
  log("\n--- STEP 4: Authenticating as ADMIN ---")
  const adminCookie = await loginAdmin()
  log("Admin authenticated successfully.")

  // Create test question in DB
  const shortId = "smp" + Math.random().toString(36).slice(2, 7)
  const initialStem = "What ancient university in Bihar was founded by Kumaragupta I?"
  const initialSlug = `q-${shortId}-ancient-university-bihar-kumaragupta`

  await prisma.contentEngineQuestion.deleteMany({
    where: { OR: [{ shortId }, { textHash: hashQuestionText(initialStem) }] },
  })

  log(`\n--- STEP 5: Creating Draft Question in Docker DB (shortId: ${shortId}) ---`)
  const testQ = await prisma.contentEngineQuestion.create({
    data: {
      shortId,
      slug: initialSlug,
      textHash: hashQuestionText(initialStem),
      q: initialStem,
      options: ["Nalanda", "Vikramashila", "Odantapuri", "Taxila"],
      answer: "Nalanda",
      answerIndex: 0,
      explanation: "Nalanda Mahavihara was founded by Gupta Emperor Kumaragupta I in the 5th century CE.",
      sub: "Ancient India",
      top: "Gupta Empire",
      exam: "BPSC",
      year: "2024",
      status: "DRAFT",
      isPublished: false,
      isVerified: true,
      translations: {
        create: [
          {
            lang: "hi",
            q: "कुमारगुप्त प्रथम द्वारा बिहार में किस प्राचीन विश्वविद्यालय की स्थापना की गई थी?",
            options: ["नालंदा", "विक्रमशिला", "ओदंतपुरी", "तक्षशिला"],
            explanation: "नालंदा महाविहार की स्थापना 5वीं शताब्दी ईस्वी में गुप्त सम्राट कुमारगुप्त प्रथम द्वारा की गई थी।",
            isReviewed: false,
          },
        ],
      },
    },
    include: { translations: true },
  })
  log(`Created test question ${testQ.id} with slug ${initialSlug}`)

  // Verify NOT in sitemap while draft
  const qaXmlDraft = await (await fetch(`${BASE_URL}/question-answer/sitemap.xml`)).text()
  const draftInSitemap = qaXmlDraft.includes(initialSlug)
  log(`Draft in /question-answer/sitemap.xml: ${draftInSitemap} (expected false)`)
  if (draftInSitemap) throw new Error("Draft question must not be in sitemap!")

  // Publish question via Admin API
  log("\n--- STEP 6: Publishing Question via POST /api/admin/content-engine/publish ---")
  const pubRes = await fetch(`${BASE_URL}/api/admin/content-engine/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ questionIds: [testQ.id], isPublished: true }),
  })
  const pubData = await pubRes.json()
  log(`Publish API HTTP ${pubRes.status}, successCount: ${pubData.successCount}`)
  if (pubRes.status !== 200 || pubData.successCount !== 1) {
    throw new Error("Failed to publish question via admin API")
  }

  // Immediate GET /question-answer/sitemap.xml -> MUST contain new slug
  log("\n--- STEP 7: Immediate GET /question-answer/sitemap.xml after Publish ---")
  const qaXmlPub = await (await fetch(`${BASE_URL}/question-answer/sitemap.xml`)).text()
  const pubInSitemap = qaXmlPub.includes(initialSlug)
  log(`Published question in /question-answer/sitemap.xml: ${pubInSitemap} (expected true)`)
  if (!pubInSitemap) {
    throw new Error("Published question did not appear immediately in sitemap after on-demand revalidation!")
  }

  // Verify Hindi sitemap does NOT have it yet (isReviewed is false)
  const hiXmlBeforeReview = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()
  const hiInSitemapBefore = hiXmlBeforeReview.includes(initialSlug)
  log(`Hindi translation in /hi/question-answer/sitemap.xml before review: ${hiInSitemapBefore} (expected false)`)
  if (hiInSitemapBefore) {
    throw new Error("Unreviewed Hindi question should not be in Hindi sitemap!")
  }

  // Toggle Hindi Review via PATCH /api/admin/content-engine/hindi/review
  log("\n--- STEP 8: Toggle Hindi Review to true via PATCH /api/admin/content-engine/hindi/review ---")
  const reviewRes = await fetch(`${BASE_URL}/api/admin/content-engine/hindi/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ questionId: testQ.id, isReviewed: true }),
  })
  log(`Hindi Review toggle HTTP ${reviewRes.status}`)
  if (reviewRes.status !== 200) throw new Error("Failed to toggle Hindi review")

  // Immediate GET /hi/question-answer/sitemap.xml -> MUST contain slug now
  log("\n--- STEP 9: Immediate GET /hi/question-answer/sitemap.xml after Hindi Review ---")
  const hiXmlAfterReview = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()
  const hiInSitemapAfter = hiXmlAfterReview.includes(initialSlug)
  log(`Hindi translation in /hi/question-answer/sitemap.xml after review: ${hiInSitemapAfter} (expected true)`)
  if (!hiInSitemapAfter) {
    throw new Error("Reviewed Hindi question did not appear immediately in Hindi sitemap!")
  }

  // Unpublish question via Admin API
  log("\n--- STEP 10: Unpublishing Question via POST /api/admin/content-engine/publish ---")
  const unpubRes = await fetch(`${BASE_URL}/api/admin/content-engine/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ questionIds: [testQ.id], isPublished: false }),
  })
  const unpubData = await unpubRes.json()
  log(`Unpublish API HTTP ${unpubRes.status}, successCount: ${unpubData.successCount}`)

  // Immediate GET /question-answer/sitemap.xml -> MUST NO LONGER contain slug
  log("\n--- STEP 11: Immediate GET /question-answer/sitemap.xml after Unpublish ---")
  const qaXmlUnpub = await (await fetch(`${BASE_URL}/question-answer/sitemap.xml`)).text()
  const unpubInSitemap = qaXmlUnpub.includes(initialSlug)
  log(`Unpublished question in /question-answer/sitemap.xml: ${unpubInSitemap} (expected false)`)
  if (unpubInSitemap) {
    throw new Error("Unpublished question still present in sitemap after unpublishing!")
  }

  // Immediate GET /hi/question-answer/sitemap.xml -> MUST NO LONGER contain slug
  const hiXmlUnpub = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()
  const hiUnpubInSitemap = hiXmlUnpub.includes(initialSlug)
  log(`Unpublished question in /hi/question-answer/sitemap.xml: ${hiUnpubInSitemap} (expected false)`)
  if (hiUnpubInSitemap) {
    throw new Error("Unpublished Hindi question still present in Hindi sitemap after unpublishing!")
  }

  // Cleanup
  await prisma.contentEngineQuestion.deleteMany({
    where: { id: testQ.id },
  })
  log("Test DB cleanup completed.")

  log("\n=====================================================")
  log("PHASE A: SITEMAP HTTP PROOF SUCCESSFUL - ALL CHECKS PASSED")
  log("=====================================================")

  fs.writeFileSync("docs/release/evidence/phaseA_sitemap_http_proof.txt", logLines.join("\n") + "\n")
  log("Saved evidence to docs/release/evidence/phaseA_sitemap_http_proof.txt")
}

run()
  .catch((err) => {
    console.error("FATAL ERROR IN SITEMAP PROOF:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
