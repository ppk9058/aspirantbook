import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"
import { chromium } from "playwright"
import { hashQuestionText, revalidateContentEngineRoutes } from "../lib/modules/content-engine/db-service"
import { generateStaticSiteFiles } from "../lib/modules/content-engine/static-export"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const BASE_URL = "http://127.0.0.1:3045"
const prisma = new PrismaClient({ datasourceUrl: env.TEST_DATABASE_URL })

async function run() {
  console.log("=== PHASE 1.6: XSS AT HTTP LEVEL AND BROWSER E2E ===")

  const shortId = "xss" + Math.random().toString(36).slice(2, 7)
  const xssStem = "What happens here? <script>alert(1)</script>"
  const xssOptA = "Option A </script><script>alert(2)</script>"
  const xssOptB = 'Option B "><img src=x onerror=alert(3)>'
  const xssExp = "Explanation with <script>alert(4)</script> and <img src=x onerror=alert(5)>"
  const xssSrc = "BPSC <script>alert(6)</script>"

  const hiStem = "क्या होता है यहाँ? <script>alert(11)</script>"
  const hiOptA = "विकल्प A </script><script>alert(12)</script>"
  const hiOptB = 'विकल्प B "><img src=x onerror=alert(13)>'
  const hiExp = "हिंदी व्याख्या <script>alert(14)</script> और <img src=x onerror=alert(15)>"

  const slug = `q-${shortId}-xss-test-capital-payload`

  // Cleanup prior test records
  await prisma.contentEngineQuestion.deleteMany({
    where: {
      OR: [
        { shortId },
        { textHash: hashQuestionText(xssStem) },
      ],
    },
  })

  console.log(`\nStep 1: Inserting XSS payloads into Docker test DB (shortId: ${shortId})...`)
  const testQ = await prisma.contentEngineQuestion.create({
    data: {
      shortId,
      slug,
      textHash: hashQuestionText(xssStem),
      q: xssStem,
      options: [xssOptA, xssOptB, "Option C", "Option D"],
      answer: xssOptA,
      answerIndex: 0,
      explanation: xssExp,
      sub: "Ancient India",
      top: "Magadha Empire",
      exam: "BPSC",
      year: "2024",
      sourceTag: xssSrc,
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
      translations: {
        create: [
          {
            lang: "hi",
            q: hiStem,
            options: [hiOptA, hiOptB, "विकल्प C", "विकल्प D"],
            explanation: hiExp,
            isReviewed: true,
          },
        ],
      },
    },
    include: { translations: true },
  })

  // Ensure route caches are cleared
  revalidateContentEngineRoutes()

  const enUrl = `${BASE_URL}/question-answer/bpsc/ancient-india/${slug}`
  const hiUrl = `${BASE_URL}/hi/question-answer/bpsc/ancient-india/${slug}`

  console.log("\nStep 2: Fetching English page over HTTP (HTTP Integration assertion)...")
  const enRes = await fetch(enUrl)
  if (enRes.status !== 200) {
    throw new Error(`Expected 200 for English page, got ${enRes.status}`)
  }
  const enHtml = await enRes.text()

  // HTTP Integration Assertions on English Page
  console.log("Checking English page HTML for unescaped scripts / injection...")
  // 1. Assert no executable <script> beyond the app's own and JSON-LD
  const allScriptTags = [...enHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  let foreignScriptFound = false
  for (const s of allScriptTags) {
    const attrs = s[1]
    const body = s[2].trim()
    const isNextChunk = attrs.includes("src=")
    const isNextRsc = body.startsWith("self.__next_f") || body.startsWith("(self.__next_f")
    const isThemeInit = body.includes("ts_theme")
    const isJsonLd = attrs.includes("application/ld+json")
    if (!isNextChunk && !isNextRsc && !isThemeInit && !isJsonLd) {
      console.error("Foreign script tag detected:", s[0])
      foreignScriptFound = true
    }
  }
  console.log(`- [HTTP Integration] English page has foreign/injected <script>: ${foreignScriptFound} (expected false)`)
  if (foreignScriptFound) throw new Error("Found foreign/injected <script> in English HTML!")

  // 2. Assert no raw onerror attribute on any HTML tag
  const enHasRawOnerror = /<[a-z0-9]+[^>]*\bonerror\b/i.test(enHtml)
  console.log(`- [HTTP Integration] English page has raw HTML tag with onerror: ${enHasRawOnerror} (expected false)`)
  if (enHasRawOnerror) throw new Error("Found raw HTML tag with onerror attribute in English HTML!")

  // 3. Assert JSON-LD block parses as valid JSON and has no raw </script> breakout
  const enJsonLdMatches = [...enHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  console.log(`- [HTTP Integration] English JSON-LD blocks found: ${enJsonLdMatches.length}`)
  if (enJsonLdMatches.length === 0) throw new Error("Expected at least one JSON-LD block")

  for (const [idx, match] of enJsonLdMatches.entries()) {
    const jsonContent = match[1].trim()
    if (jsonContent.includes("</script>")) {
      throw new Error(`JSON-LD block ${idx} contains raw </script> tag!`)
    }
    // Must parse as valid JSON
    try {
      const parsed = JSON.parse(jsonContent)
      console.log(`  ✓ [HTTP Integration] JSON-LD block ${idx} parsed successfully as valid JSON`)
    } catch (err: any) {
      throw new Error(`JSON-LD block ${idx} failed to parse: ${err.message}`)
    }
  }

  // 4. Check Hindi Page over HTTP
  console.log("\nStep 3: Fetching Hindi page over HTTP (HTTP Integration assertion)...")
  const hiRes = await fetch(hiUrl)
  if (hiRes.status !== 200) {
    throw new Error(`Expected 200 for Hindi page, got ${hiRes.status}`)
  }
  const hiHtml = await hiRes.text()

  const allHiScripts = [...hiHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  let hiForeignScriptFound = false
  for (const s of allHiScripts) {
    const attrs = s[1]
    const body = s[2].trim()
    const isNextChunk = attrs.includes("src=")
    const isNextRsc = body.startsWith("self.__next_f") || body.startsWith("(self.__next_f")
    const isThemeInit = body.includes("ts_theme")
    const isJsonLd = attrs.includes("application/ld+json")
    if (!isNextChunk && !isNextRsc && !isThemeInit && !isJsonLd) {
      console.error("Foreign script tag in Hindi:", s[0])
      hiForeignScriptFound = true
    }
  }
  console.log(`- [HTTP Integration] Hindi page has foreign/injected <script>: ${hiForeignScriptFound} (expected false)`)
  if (hiForeignScriptFound) throw new Error("Found foreign/injected <script> in Hindi HTML!")

  const hiHasRawOnerror = /<[a-z0-9]+[^>]*\bonerror\b/i.test(hiHtml)
  console.log(`- [HTTP Integration] Hindi page has raw HTML tag with onerror: ${hiHasRawOnerror} (expected false)`)
  if (hiHasRawOnerror) throw new Error("Found raw HTML tag with onerror attribute in Hindi HTML!")

  const hiJsonLdMatches = [...hiHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const [idx, match] of hiJsonLdMatches.entries()) {
    let jsonContent = match[1].trim()
    if (jsonContent.startsWith("<script")) {
      const inner = jsonContent.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
      if (inner) jsonContent = inner[1].trim()
    }
    if (jsonContent.includes("</script>")) {
      throw new Error(`Hindi JSON-LD block ${idx} contains raw </script> tag!`)
    }
    JSON.parse(jsonContent)
  }
  console.log("  ✓ [HTTP Integration] Hindi JSON-LD blocks parsed cleanly")

  // 5. Check Sitemaps over HTTP
  console.log("\nStep 4: Fetching Sitemaps over HTTP (HTTP Integration assertion)...")
  const enSitemap = await (await fetch(`${BASE_URL}/question-answer/sitemap.xml`)).text()
  const hiSitemap = await (await fetch(`${BASE_URL}/hi/question-answer/sitemap.xml`)).text()

  const sitemapHasScript = /<script|<[a-z0-9]+[^>]*\bonerror\b/i.test(enSitemap) || /<script|<[a-z0-9]+[^>]*\bonerror\b/i.test(hiSitemap)
  console.log(`- [HTTP Integration] Sitemaps contain raw script/onerror tags: ${sitemapHasScript} (expected false)`)
  if (sitemapHasScript) throw new Error("Sitemap XML contains injected script/event handlers!")

  // 6. Check Static Export ZIP HTML files
  console.log("\nStep 5: Testing Static Export ZIP files (Unit/DB assertion)...")
  const exportFiles = generateStaticSiteFiles([testQ as any], "mirror", BASE_URL)

  let zipScriptAlertFound = false
  let zipOnerrorFound = false
  let htmlFilesChecked = 0

  for (const file of exportFiles) {
    if (file.path.endsWith(".html")) {
      htmlFilesChecked++
      const content = file.content
      if (/<script(?!\s+type="application\/ld\+json")\s*>[^<]*alert\(/i.test(content)) {
        zipScriptAlertFound = true
      }
      if (/<[a-z0-9]+[^>]*\bonerror\b/i.test(content)) {
        zipOnerrorFound = true
      }
      // Check JSON-LD in exported HTML
      const ldMatches = [...content.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
      for (const m of ldMatches) {
        if (m[1].includes("</script>")) {
          throw new Error(`Export HTML ${file.path} contains raw </script> in JSON-LD!`)
        }
        JSON.parse(m[1])
      }
    }
  }
  console.log(`- [Unit/DB] Checked ${htmlFilesChecked} exported HTML files`)
  console.log(`- [Unit/DB] ZIP HTML has executable script alert: ${zipScriptAlertFound} (expected false)`)
  console.log(`- [Unit/DB] ZIP HTML has raw onerror tag: ${zipOnerrorFound} (expected false)`)
  if (zipScriptAlertFound || zipOnerrorFound) {
    throw new Error("Exported ZIP HTML contains unescaped XSS payloads!")
  }

  // 7. Real Browser E2E Assertion with Playwright
  console.log("\nStep 6: Real Browser E2E Assertion with Playwright (Browser E2E)...")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  let dialogFired = false
  let dialogMessage = ""

  page.on("dialog", async (dialog) => {
    dialogFired = true
    dialogMessage = dialog.message()
    await dialog.dismiss()
  })

  console.log(`- [Browser E2E] Navigating to English question URL: ${enUrl}`)
  await page.goto(enUrl, { waitUntil: "domcontentloaded", timeout: 15000 })
  await page.waitForTimeout(1000)
  console.log(`- [Browser E2E] Page title: "${await page.title()}"`)
  console.log(`- [Browser E2E] Dialog fired on English page: ${dialogFired}`)
  if (dialogFired) {
    throw new Error(`XSS DIALOG FIRED on English page: "${dialogMessage}"`)
  }

  console.log(`- [Browser E2E] Navigating to Hindi question URL: ${hiUrl}`)
  await page.goto(hiUrl, { waitUntil: "domcontentloaded", timeout: 15000 })
  await page.waitForTimeout(1000)
  console.log(`- [Browser E2E] Hindi page title: "${await page.title()}"`)
  console.log(`- [Browser E2E] Dialog fired on Hindi page: ${dialogFired}`)
  if (dialogFired) {
    throw new Error(`XSS DIALOG FIRED on Hindi page: "${dialogMessage}"`)
  }

  await browser.close()
  console.log("✓ [Browser E2E] Real browser rendered pages cleanly with 0 dialogs fired!")

  console.log("\n=======================================================")
  console.log("PHASE 1.6 VERIFICATION: ALL XSS GATES PASSED CLEANLY!")
  console.log("=======================================================")

  // Clean up
  await prisma.contentEngineQuestion.deleteMany({ where: { shortId } })
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error("FATAL ERROR in Phase 1.6:", err)
  process.exit(1)
})
