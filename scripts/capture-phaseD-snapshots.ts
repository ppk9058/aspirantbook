import fs from "fs"
import path from "path"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"
import { getQuizSlug } from "@/lib/current-affairs/slugs"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const prisma = new PrismaClient({ datasourceUrl: env.TEST_DATABASE_URL })

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"
const TARGET_DIR = process.argv[2] || "docs/release/evidence/snapshots_before"

interface SeoSnapshot {
  url: string
  path: string
  module: string
  statusCode: number
  redirectTarget: string | null
  title: string | null
  metaDescription: string | null
  canonical: string | null
  robots: string | null
  hreflang: Record<string, string>
  jsonLd: any[]
}

function extractSeoFromHtml(html: string): {
  title: string | null
  metaDescription: string | null
  canonical: string | null
  robots: string | null
  hreflang: Record<string, string>
  jsonLd: any[]
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : null

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const metaDescription = descMatch ? descMatch[1].trim() : null

  const canonMatch =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)
  const canonical = canonMatch ? canonMatch[1].trim() : null

  const robotsMatch =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i)
  const robots = robotsMatch ? robotsMatch[1].trim() : null

  const hreflang: Record<string, string> = {}
  const altRegex = /<link[^>]+rel=["']alternate["'][^>]*>/gi
  let altMatch
  while ((altMatch = altRegex.exec(html)) !== null) {
    const tag = altMatch[0]
    const langMatch = tag.match(/hreflang=["']([^"']+)["']/i)
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i)
    if (langMatch && hrefMatch) {
      hreflang[langMatch[1]] = hrefMatch[1]
    }
  }

  const jsonLd: any[] = []
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let scriptMatch
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    try {
      jsonLd.push(JSON.parse(scriptMatch[1]))
    } catch {
      jsonLd.push({ raw: scriptMatch[1].trim() })
    }
  }

  return { title, metaDescription, canonical, robots, hreflang, jsonLd }
}

async function getUrlsToTest(): Promise<Array<{ module: string; path: string }>> {
  const routes: Array<{ module: string; path: string }> = []

  // 1. Courses (10 URLs)
  routes.push({ module: "courses", path: "/courses" })
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
    take: 9,
  })
  courses.forEach((c) => routes.push({ module: "courses", path: `/courses/${c.slug}` }))

  // 2. Tutorials (10 URLs: list, several details, 1 unpublished)
  routes.push({ module: "tutorials", path: "/tutorials" })
  courses.slice(0, 8).forEach((c) => routes.push({ module: "tutorials", path: `/tutorials/${c.slug}` }))
  routes.push({ module: "tutorials", path: "/tutorials/draft-course-hidden" })

  // 3. Current Affairs (10 URLs: list and several quizzes)
  routes.push({ module: "current-affairs", path: "/current-affairs-quizzes" })
  const quizzes = await prisma.examTest.findMany({
    where: { testType: "CURRENT_AFFAIRS", isPublished: true },
    select: { id: true, title: true, updatedAt: true },
    take: 9,
  })
  quizzes.forEach((q) => {
    routes.push({ module: "current-affairs", path: `/current-affairs-quizzes/${getQuizSlug(q)}` })
  })

  // 4. PYQs (10 URLs: catalog and several exams)
  routes.push({ module: "pyqs", path: "/pyqs" })
  const pyqExams = ["bpsc", "upsc-cse", "uppcs", "mppsc", "ras", "ssc-cgl", "cds", "nda", "ugc-net"]
  pyqExams.forEach((e) => routes.push({ module: "pyqs", path: `/pyqs/${e}` }))

  // 5. Test Series (10 URLs: list and several details)
  routes.push({ module: "test-series", path: "/test-series" })
  const series = await prisma.examSeries.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      slug: { notIn: ["current-affairs-system-series", "pyq-system-series", "unassigned-tests-system-series"] },
    },
    select: { id: true, slug: true },
    take: 9,
  })
  series.forEach((s) => routes.push({ module: "test-series", path: `/test-series/${s.slug || s.id}` }))

  // 6. Content Engine (10 URLs: hubs, English detail, reviewed Hindi detail, unreviewed Hindi detail)
  routes.push({ module: "content-engine", path: "/question-answer" })
  routes.push({ module: "content-engine", path: "/hi/question-answer" })
  routes.push({ module: "content-engine", path: "/question-answer/upsc-cse" })
  routes.push({ module: "content-engine", path: "/hi/question-answer/upsc-cse" })
  routes.push({ module: "content-engine", path: "/question-answer/upsc-cse/2023" })
  routes.push({ module: "content-engine", path: "/hi/question-answer/upsc-cse/2023" })
  routes.push({ module: "content-engine", path: "/question-answer/upsc-cse/history" })
  routes.push({ module: "content-engine", path: "/hi/question-answer/upsc-cse/history" })
  routes.push({
    module: "content-engine",
    path: "/question-answer/upsc-cse/history/4d3fa9c7-upsc-cse-2023-q1-consider-the-following-statements",
  })
  routes.push({
    module: "content-engine",
    path: "/hi/question-answer/upsc-cse/history/4d3fa9c7-upsc-cse-2023-q1-consider-the-following-statements",
  })

  return routes
}

async function capture() {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
  console.log(`\n======================================================`)
  console.log(`CAPTURING SEO SNAPSHOTS AGAINST ${BASE_URL}`)
  console.log(`Target Directory: ${TARGET_DIR}`)
  console.log(`======================================================`)

  const routes = await getUrlsToTest()
  console.log(`Total URLs to snapshot: ${routes.length}`)

  const summary: Record<string, SeoSnapshot> = {}

  for (const item of routes) {
    const fullUrl = `${BASE_URL}${item.path}`
    try {
      const res = await fetch(fullUrl, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
      })
      const statusCode = res.status
      const redirectTarget = res.headers.get("location") || null
      const html = statusCode === 200 ? await res.text() : ""

      const seo = extractSeoFromHtml(html)
      const snapshot: SeoSnapshot = {
        url: fullUrl,
        path: item.path,
        module: item.module,
        statusCode,
        redirectTarget,
        ...seo,
      }

      const fileSafeName = item.path.replace(/[^a-z0-9]/gi, "_").replace(/^_+|_+$/g, "") || "root"
      const outPath = path.join(TARGET_DIR, `${item.module}__${fileSafeName}.json`)
      fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8")
      summary[item.path] = snapshot
      console.log(`[${statusCode}] ${item.path} -> ${outPath}`)
    } catch (e: any) {
      console.error(`Failed ${item.path}:`, e.message)
    }
  }

  const allSummaryPath = path.join(TARGET_DIR, "_all_snapshots.json")
  fs.writeFileSync(allSummaryPath, JSON.stringify(summary, null, 2), "utf8")
  console.log(`\n✓ All ${routes.length} snapshots successfully captured into ${TARGET_DIR}`)

  await prisma.$disconnect()
}

capture().catch((err) => {
  console.error("FATAL ERROR in capture:", err)
  process.exit(1)
})
