import fs from "fs"
import path from "path"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"
const TARGET_DIR = process.argv[2] || "docs/seo/evidence/snapshots_before"

interface SeoSnapshot {
  url: string
  path: string
  module: string
  statusCode: number
  title: string | null
  metaDescription: string | null
  canonical: string | null
  robots: string | null
  hreflang: Record<string, string>
  jsonLd: any[]
}

const SAMPLE_ROUTES = [
  // 10 Mandatory Targets for Cross-Module Baseline Snapshot Comparison
  { module: "home", path: "/" },
  { module: "courses", path: "/courses" },
  { module: "books", path: "/books" },
  { module: "test-series", path: "/test-series" },
  { module: "tutorials", path: "/tutorials" },
  { module: "current-affairs", path: "/current-affairs-quizzes" },
  { module: "pyqs", path: "/pyqs" },
  { module: "content-engine", path: "/question-answer" },
  { module: "content-engine", path: "/question-answer/upsc-cse/history/4d3fa9c7-upsc-cse-2023-q1-consider-the-following-statements" },
  { module: "test-series", path: "/test-series/e2e-series-e2e-20261021124106098-4akv9" },

  // Additional Sub-routes
  { module: "content-engine", path: "/hi/question-answer" },
  { module: "content-engine", path: "/question-answer/upsc-cse" },
  { module: "content-engine", path: "/hi/question-answer/upsc-cse" },
  { module: "content-engine", path: "/question-answer/upsc-cse/2023" },
  { module: "content-engine", path: "/question-answer/upsc-cse/history" },
  { module: "content-engine", path: "/hi/question-answer/upsc-cse/history" },
  { module: "content-engine", path: "/hi/question-answer/upsc-cse/history/4d3fa9c7-upsc-cse-2023-q1-consider-the-following-statements" },
  { module: "pyqs-test-series", path: "/pyqs/bpsc" },
  { module: "current-affairs", path: "/current-affairs-quizzes/upsc-economy-ca" },
  { module: "tutorials", path: "/tutorials/e2e-20261021025140619-1frn8-course-studio" },
]

function extractSeoFromHtml(html: string): Omit<SeoSnapshot, "url" | "path" | "module" | "statusCode"> {
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : null

  // Meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const metaDescription = descMatch ? descMatch[1].trim() : null

  // Canonical
  const canonMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ||
                     html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)
  const canonical = canonMatch ? canonMatch[1].trim() : null

  // Robots
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i)
  const robots = robotsMatch ? robotsMatch[1].trim() : null

  // Hreflang
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

  // JSON-LD
  const jsonLd: any[] = []
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let scriptMatch
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(scriptMatch[1])
      jsonLd.push(parsed)
    } catch {
      jsonLd.push({ raw: scriptMatch[1].trim() })
    }
  }

  return {
    title,
    metaDescription,
    canonical,
    robots,
    hreflang,
    jsonLd,
  }
}

async function takeSnapshots() {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
  console.log(`Taking SEO snapshots against ${BASE_URL} into ${TARGET_DIR}...`)

  const summary: Record<string, SeoSnapshot> = {}

  for (const item of SAMPLE_ROUTES) {
    const targetUrl = `${BASE_URL}${item.path}`
    try {
      const res = await fetch(targetUrl, {
        headers: { "User-Agent": "SEO-Audit-Bot/1.0" },
      })
      const statusCode = res.status
      const html = await res.text()

      const parsed = extractSeoFromHtml(html)
      const snapshot: SeoSnapshot = {
        url: targetUrl,
        path: item.path,
        module: item.module,
        statusCode,
        ...parsed,
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
  console.log(`All snapshots saved to ${allSummaryPath}`)
}

takeSnapshots().catch(console.error)
