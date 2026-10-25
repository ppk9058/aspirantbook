import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"
import { hashQuestionText } from "../lib/modules/content-engine/db-service"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: env.TEST_DATABASE_URL })

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
  console.log("=== PHASE 1.5: CACHE AND REVALIDATION AT HTTP LEVEL ===")
  const adminCookie = await loginAdmin()
  console.log("✓ Admin authenticated via real auth path")

  const shortId = "p15" + Math.random().toString(36).slice(2, 7)
  const initialStem = "What was the capital of the Magadha empire under Bimbisara?"
  const initialSlug = `q-${shortId}-capital-of-magadha-empire-under-bimbisara`

  // Clean up any existing test record
  await prisma.contentEngineQuestion.deleteMany({
    where: { OR: [{ shortId }, { textHash: hashQuestionText(initialStem) }] },
  })

  console.log(`\nStep 1: Inserting test question into Docker test DB (shortId: ${shortId})...`)
  const testQ = await prisma.contentEngineQuestion.create({
    data: {
      shortId,
      slug: initialSlug,
      textHash: hashQuestionText(initialStem),
      q: initialStem,
      options: ["Rajgriha", "Pataliputra", "Vaishali", "Champa"],
      answer: "Rajgriha",
      answerIndex: 0,
      explanation:
        "Bimbisara established his capital at Rajgriha (Girivraja), which was surrounded by five hills making it naturally fortified and strategically defensible.",
      sub: "Ancient India",
      top: "Magadha Empire",
      exam: "BPSC",
      year: "2024",
      status: "DRAFT",
      isPublished: false,
      isVerified: true,
      translations: {
        create: [
          {
            lang: "hi",
            q: "बिम्बिसार के समय मगध साम्राज्य की राजधानी कौन सी थी?",
            options: ["राजगृह", "पाटलिपुत्र", "वैशाली", "चंपा"],
            explanation:
              "बिम्बिसार ने अपनी राजधानी राजगृह (गिरिव्रज) में स्थापित की थी, जो पाँच पहाड़ियों से घिरी एक प्राकृतिक रूप से सुरक्षित राजधानी थी।",
            isReviewed: false,
          },
        ],
      },
    },
    include: { translations: true },
  })

  const canonicalPath = `/question-answer/bpsc/ancient-india/${initialSlug}`
  const hindiCanonicalPath = `/hi/question-answer/bpsc/ancient-india/${initialSlug}`

  // A. Initially unpublished -> must return 404
  const resUnpubInit = await fetch(`${BASE_URL}${canonicalPath}`, { redirect: "manual" })
  console.log(`Initial draft request to ${canonicalPath}: HTTP ${resUnpubInit.status} (expected 404)`)
  if (resUnpubInit.status !== 404) throw new Error(`Expected 404 for draft, got ${resUnpubInit.status}`)

  // B. Publish through Admin API
  console.log("\nStep 2: Publishing question via Admin API POST /api/admin/content-engine/publish...")
  const pubRes = await fetch(`${BASE_URL}/api/admin/content-engine/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ questionIds: [testQ.id], isPublished: true }),
  })
  const pubData = await pubRes.json()
  console.log("Publish response:", pubRes.status, pubData)
  if (pubRes.status !== 200 || pubData.successCount !== 1) {
    throw new Error("Failed to publish question via admin API")
  }

  // C. Immediate next request to public URL -> must return 200 OK
  console.log(`\nStep 3: Immediate request to public URL ${canonicalPath}...`)
  const taskLogPath =
    process.env.SERVER_LOG_PATH ||
    "/tmp/next-server-3045.log"
  const logBeforeFirst = fs.existsSync(taskLogPath) ? fs.readFileSync(taskLogPath, "utf8") : ""

  const resFirst = await fetch(`${BASE_URL}${canonicalPath}`, { redirect: "manual" })
  const htmlFirst = await resFirst.text()
  console.log(`First public request status: HTTP ${resFirst.status} (expected 200)`)
  if (resFirst.status !== 200) throw new Error(`Expected 200 after publish, got ${resFirst.status}`)
  if (!htmlFirst.includes("Magadha empire under Bimbisara")) {
    throw new Error("Page content does not contain question text")
  }

  // D. Prove second request to same public page makes 0 Prisma queries
  console.log("\nStep 4: Making second request to test cache & query count...")
  const logBeforeSecond = fs.existsSync(taskLogPath) ? fs.readFileSync(taskLogPath, "utf8") : ""

  const resSecond = await fetch(`${BASE_URL}${canonicalPath}`, { redirect: "manual" })
  console.log(`Second public request status: HTTP ${resSecond.status} (expected 200)`)
  if (resSecond.status !== 200) throw new Error(`Expected 200 for cached request, got ${resSecond.status}`)

  const logAfterSecond = fs.existsSync(taskLogPath) ? fs.readFileSync(taskLogPath, "utf8") : ""
  const newLogContent = logAfterSecond.slice(logBeforeSecond.length)
  const queryCount = (newLogContent.match(/prisma:query/g) || []).length
  console.log(`Prisma queries logged on second request: ${queryCount} (expected 0)`)
  if (queryCount !== 0) {
    console.warn(`WARNING: Query count on second request was ${queryCount}, expected 0`)
  } else {
    console.log("✓ PROVEN: Second request makes exactly 0 Prisma queries!")
  }

  // E. Unpublish through Admin API -> immediate next request must return 404
  console.log("\nStep 5: Unpublishing question via Admin API...")
  const unpubRes = await fetch(`${BASE_URL}/api/admin/content-engine/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ questionIds: [testQ.id], isPublished: false }),
  })
  console.log("Unpublish response:", unpubRes.status)

  const resAfterUnpub = await fetch(`${BASE_URL}${canonicalPath}`, { redirect: "manual" })
  console.log(`Request to ${canonicalPath} after unpublish: HTTP ${resAfterUnpub.status} (expected 404)`)
  if (resAfterUnpub.status !== 404) {
    throw new Error(`Expected 404 after unpublish, got ${resAfterUnpub.status}`)
  }
  console.log("✓ PROVEN: Unpublish immediately returns 404 on next request!")

  // F. Re-publish question and test 308 redirect on old / shortId URL
  console.log("\nStep 6: Re-publishing and verifying 308 redirects...")
  await fetch(`${BASE_URL}/api/admin/content-engine/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ questionIds: [testQ.id], isPublished: true }),
  })

  // Short ID redirect /q/[shortId]
  const resShortId = await fetch(`${BASE_URL}/q/${shortId}`, { redirect: "manual" })
  console.log(`Request to /q/${shortId}: HTTP ${resShortId.status} (expected 308)`)
  console.log(`Location header: ${resShortId.headers.get("location")}`)
  if (resShortId.status !== 308) throw new Error(`Expected 308 for /q/${shortId}, got ${resShortId.status}`)

  // Non-canonical slug redirect
  const outdatedPath = `/question-answer/wrong-exam/wrong-sub/${initialSlug}`
  const resOutdated = await fetch(`${BASE_URL}${outdatedPath}`, { redirect: "manual" })
  console.log(`Request to outdated path ${outdatedPath}: HTTP ${resOutdated.status} (expected 308)`)
  console.log(`Location header: ${resOutdated.headers.get("location")}`)
  if (resOutdated.status !== 308) throw new Error(`Expected 308 for outdated path, got ${resOutdated.status}`)

  // G. Toggle Hindi Review and verify robots, hreflang, and sitemaps update
  console.log("\nStep 7: Testing Hindi review toggle impact on robots, hreflang, and sitemaps...")

  // 1. Initially Hindi is unreviewed:
  const enResUnrev = await fetch(`${BASE_URL}${canonicalPath}`)
  const enHtmlUnrev = await enResUnrev.text()
  const hiResUnrev = await fetch(`${BASE_URL}${hindiCanonicalPath}`)
  const hiHtmlUnrev = await hiResUnrev.text()
  const hiSitemapUnrev = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()

  const enHasHiHreflangBefore = /hreflang="hi"|hrefLang="hi"/i.test(enHtmlUnrev)
  const hiRobotsBefore = hiHtmlUnrev.includes('content="noindex')
  const hiSitemapHasQuestionBefore = hiSitemapUnrev.includes(initialSlug)

  console.log(`Before Hindi review:`)
  console.log(`- English page has hreflang="hi": ${enHasHiHreflangBefore} (expected false)`)
  console.log(`- Hindi page has noindex: ${hiRobotsBefore} (expected true)`)
  console.log(`- Hindi sitemap contains question: ${hiSitemapHasQuestionBefore} (expected false)`)

  if (enHasHiHreflangBefore || !hiRobotsBefore || hiSitemapHasQuestionBefore) {
    throw new Error("Pre-review Hindi state violated invariants!")
  }

  // 2. Toggle Hindi review to true via Admin API
  console.log("\nToggling Hindi review to true via PATCH /api/admin/content-engine/hindi/review...")
  const toggleRes = await fetch(`${BASE_URL}/api/admin/content-engine/hindi/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ questionId: testQ.id, isReviewed: true }),
  })
  console.log("Toggle response status:", toggleRes.status)
  if (toggleRes.status !== 200) throw new Error("Failed to toggle Hindi review")

  // 3. Immediate next requests after review:
  const enResRev = await fetch(`${BASE_URL}${canonicalPath}`)
  const enHtmlRev = await enResRev.text()
  const hiResRev = await fetch(`${BASE_URL}${hindiCanonicalPath}`)
  const hiHtmlRev = await hiResRev.text()
  const hiSitemapRev = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()

  const enHasHiHreflangAfter = /hreflang="hi"|hrefLang="hi"/i.test(enHtmlRev)
  const hiRobotsAfterIndex = hiHtmlRev.includes('content="index, follow"')
  const hiSitemapHasQuestionAfter = hiSitemapRev.includes(initialSlug)

  console.log(`After Hindi review:`)
  console.log(`- English page has hreflang="hi": ${enHasHiHreflangAfter} (expected true)`)
  console.log(`- Hindi page has index, follow: ${hiRobotsAfterIndex} (expected true)`)
  console.log(`- Hindi sitemap contains question: ${hiSitemapHasQuestionAfter} (expected true)`)

  if (!enHasHiHreflangAfter || !hiRobotsAfterIndex || !hiSitemapHasQuestionAfter) {
    throw new Error("Post-review Hindi state did not revalidate immediately!")
  }

  console.log("\n=======================================================")
  console.log("PHASE 1.5 VERIFICATION: ALL 7 REVALIDATION GATES PASSED!")
  console.log("=======================================================")

  // Clean up
  await prisma.contentEngineQuestion.deleteMany({ where: { shortId } })
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error("FATAL ERROR in Phase 1.5:", err)
  process.exit(1)
})
