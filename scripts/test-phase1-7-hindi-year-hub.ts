import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"
import { hashQuestionText, revalidateContentEngineRoutes } from "../lib/modules/content-engine/db-service"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: env.TEST_DATABASE_URL })

async function loginAdmin(): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const csrfCookies =
    csrfRes.headers.getSetCookie?.() ||
    (csrfRes.headers.get("set-cookie") ? [csrfRes.headers.get("set-cookie")!] : [])
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

  const loginCookies =
    loginRes.headers.getSetCookie?.() ||
    (loginRes.headers.get("set-cookie") ? [loginRes.headers.get("set-cookie")!] : [])
  const sessionToken = loginCookies.find((c) => c.includes("session-token"))
  if (!sessionToken) {
    console.error("Login failed. Status:", loginRes.status, "Cookies:", loginCookies, "Headers:", Object.fromEntries(loginRes.headers.entries()))
    throw new Error("Admin login failed")
  }
  return sessionToken.split(";")[0]
}

async function run() {
  console.log("=== PHASE 1.7: HINDI AND YEAR HUB HTTP TESTS ===")
  const adminCookie = await loginAdmin()

  const shortId = "p17" + Math.random().toString(36).slice(2, 7)
  const qStem = "Who was the founder of the Nalanda Mahavihara?"
  const slug = `q-${shortId}-founder-of-nalanda-mahavihara`

  // Cleanup
  await prisma.contentEngineQuestion.deleteMany({
    where: {
      OR: [{ shortId }, { textHash: hashQuestionText(qStem) }],
    },
  })

  console.log(`\nStep 1: Inserting test question into Docker test DB (shortId: ${shortId})...`)
  const testQ = await prisma.contentEngineQuestion.create({
    data: {
      shortId,
      slug,
      textHash: hashQuestionText(qStem),
      q: qStem,
      options: ["Kumaragupta I", "Samudragupta", "Chandragupta II", "Harshavardhana"],
      answer: "Kumaragupta I",
      answerIndex: 0,
      explanation: "Nalanda Mahavihara was founded by Gupta Emperor Kumaragupta I in the 5th century CE.",
      sub: "Ancient India",
      top: "Gupta Period",
      exam: "BPSC",
      year: "2024",
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
      translations: {
        create: [
          {
            lang: "hi",
            q: "नालंदा महाविहार के संस्थापक कौन थे?",
            options: ["कुमारगुप्त प्रथम", "समुद्रगुप्त", "चंद्रगुप्त द्वितीय", "हर्षवर्धन"],
            explanation: "नालंदा महाविहार की स्थापना गुप्त सम्राट कुमारगुप्त प्रथम ने 5वीं शताब्दी ईस्वी में की थी।",
            isReviewed: false, // Initially unreviewed
          },
        ],
      },
    },
    include: { translations: true },
  })

  revalidateContentEngineRoutes()

  const enUrl = `${BASE_URL}/question-answer/bpsc/ancient-india/${slug}`
  const hiUrl = `${BASE_URL}/hi/question-answer/bpsc/ancient-india/${slug}`

  // Step 2: Test unreviewed Hindi twin state
  console.log("\nStep 2: Testing unreviewed Hindi twin state...")
  const enRes1 = await fetch(enUrl)
  const enHtml1 = await enRes1.text()
  const hiRes1 = await fetch(hiUrl)
  const hiHtml1 = await hiRes1.text()
  const hiSitemap1 = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()

  const enHasHiHreflang1 = /hrefLang="hi"|hreflang="hi"/i.test(enHtml1)
  const hiHasNoindex1 = hiHtml1.includes('content="noindex')
  const hiSitemapHasQ1 = hiSitemap1.includes(slug)

  console.log(`- [HTTP] English page has hreflang="hi": ${enHasHiHreflang1} (expected false)`)
  console.log(`- [HTTP] Hindi page has noindex: ${hiHasNoindex1} (expected true)`)
  console.log(`- [HTTP] Hindi sitemap includes unreviewed question: ${hiSitemapHasQ1} (expected false)`)

  if (enHasHiHreflang1) throw new Error("Unreviewed Hindi twin leaked hreflang into English page!")
  if (!hiHasNoindex1) throw new Error("Unreviewed Hindi twin must have noindex!")
  if (hiSitemapHasQ1) throw new Error("Unreviewed Hindi twin leaked into Hindi sitemap!")

  // Step 3: Toggle Hindi review to true via Admin API
  console.log("\nStep 3: Toggling Hindi translation to reviewed via PATCH /api/admin/content-engine/hindi/review...")
  const toggleRes = await fetch(`${BASE_URL}/api/admin/content-engine/hindi/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ questionId: testQ.id, isReviewed: true }),
  })
  if (toggleRes.status !== 200) throw new Error("Failed to toggle Hindi review via Admin API")

  // Step 4: Test reviewed Hindi twin state and bidirectional hreflang
  console.log("\nStep 4: Testing reviewed Hindi twin state & bidirectional hreflang...")
  const enRes2 = await fetch(enUrl)
  const enHtml2 = await enRes2.text()
  const hiRes2 = await fetch(hiUrl)
  const hiHtml2 = await hiRes2.text()
  const hiSitemap2 = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()

  const enHasHiHreflang2 = /hrefLang="hi"|hreflang="hi"/i.test(enHtml2)
  const hiHasEnHreflang2 = /hrefLang="en"|hreflang="en"/i.test(hiHtml2)
  const hiHasIndexFollow2 = hiHtml2.includes('content="index, follow"')
  const hiSitemapHasQ2 = hiSitemap2.includes(slug)

  console.log(`- [HTTP] English page has hreflang="hi": ${enHasHiHreflang2} (expected true)`)
  console.log(`- [HTTP] Hindi page has hreflang="en": ${hiHasEnHreflang2} (expected true)`)
  console.log(`- [HTTP] Hindi page has index, follow: ${hiHasIndexFollow2} (expected true)`)
  console.log(`- [HTTP] Hindi sitemap includes reviewed question: ${hiSitemapHasQ2} (expected true)`)

  if (!enHasHiHreflang2) throw new Error("Reviewed Hindi twin missing hreflang on English page!")
  if (!hiHasEnHreflang2) throw new Error("Reviewed Hindi twin missing hreflang on Hindi page!")
  if (!hiHasIndexFollow2) throw new Error("Reviewed Hindi twin missing index, follow!")
  if (!hiSitemapHasQ2) throw new Error("Reviewed Hindi twin missing from Hindi sitemap!")

  // Step 5: Test English and Hindi Year and Subject Hubs
  console.log("\nStep 5: Testing English and Hindi Year and Subject Hubs...")

  // English 2024 Year Hub
  const enYearRes = await fetch(`${BASE_URL}/question-answer/bpsc/2024`)
  console.log(`- [HTTP] /question-answer/bpsc/2024: HTTP ${enYearRes.status} (expected 200)`)
  if (enYearRes.status !== 200) throw new Error(`Expected 200 for English 2024 year hub, got ${enYearRes.status}`)

  // English 9999 Year Hub -> 404
  const en9999Res = await fetch(`${BASE_URL}/question-answer/bpsc/9999`)
  console.log(`- [HTTP] /question-answer/bpsc/9999: HTTP ${en9999Res.status} (expected 404)`)
  if (en9999Res.status !== 404) throw new Error(`Expected 404 for English 9999 year hub, got ${en9999Res.status}`)

  // English invalid segment -> 404
  const enInvalidRes = await fetch(`${BASE_URL}/question-answer/bpsc/not-a-year-or-sub`)
  console.log(`- [HTTP] /question-answer/bpsc/not-a-year-or-sub: HTTP ${enInvalidRes.status} (expected 404)`)
  if (enInvalidRes.status !== 404) throw new Error(`Expected 404 for English invalid segment, got ${enInvalidRes.status}`)

  // Hindi 2024 Year Hub
  const hiYearRes = await fetch(`${BASE_URL}/hi/question-answer/bpsc/2024`)
  console.log(`- [HTTP] /hi/question-answer/bpsc/2024: HTTP ${hiYearRes.status} (expected 200)`)
  if (hiYearRes.status !== 200) throw new Error(`Expected 200 for Hindi 2024 year hub, got ${hiYearRes.status}`)

  // Hindi 9999 Year Hub -> 404
  const hi9999Res = await fetch(`${BASE_URL}/hi/question-answer/bpsc/9999`)
  console.log(`- [HTTP] /hi/question-answer/bpsc/9999: HTTP ${hi9999Res.status} (expected 404)`)
  if (hi9999Res.status !== 404) throw new Error(`Expected 404 for Hindi 9999 year hub, got ${hi9999Res.status}`)

  // Hindi invalid segment -> 404
  const hiInvalidRes = await fetch(`${BASE_URL}/hi/question-answer/bpsc/not-a-year-or-sub`)
  console.log(`- [HTTP] /hi/question-answer/bpsc/not-a-year-or-sub: HTTP ${hiInvalidRes.status} (expected 404)`)
  if (hiInvalidRes.status !== 404) throw new Error(`Expected 404 for Hindi invalid segment, got ${hiInvalidRes.status}`)

  console.log("\n=======================================================")
  console.log("PHASE 1.7 VERIFICATION: ALL HINDI & YEAR GATES PASSED!")
  console.log("=======================================================")

  // Clean up
  await prisma.contentEngineQuestion.deleteMany({ where: { shortId } })
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error("FATAL ERROR in Phase 1.7:", err)
  process.exit(1)
})
