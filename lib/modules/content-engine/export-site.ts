/**
 * Static Site & Cloudflare ZIP Export Generator
 * Uses the exact same paths.ts and buildSeoModel as Native Next.js routes.
 * Source: Exam_Content_Engine-4.html
 */

import { buildSeoModel, SeoQuestionInput, safeJsonLdStringify } from "./seo-model"
import {
  qaPath,
  homeHubPath,
  examHubPath,
  yearHubPath,
  subjectHubPath,
  slugify,
} from "./paths"
import { formatSolutionHtml, esc } from "./solution-formatter"
import { GateResult } from "./quality-gates"

export interface ExportSiteOptions {
  mainSiteUrl: string
  exportBaseUrl: string
  exportMode: "mirror" | "primary"
  reviewerName?: string
  indexNowKey?: string
}

export interface GeneratedFile {
  path: string
  content: string
}

const CSS = `body{font:16px/1.6 system-ui,-apple-system,sans-serif;max-width:820px;margin:auto;padding:16px;color:#1e293b;background:#f8fafc}a{color:#4f46e5;text-decoration:none}a:hover{text-decoration:underline}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:6px 10px}.cd{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin:12px 0;box-shadow:0 1px 2px rgba(0,0,0,0.05)}.mu{color:#64748b;font-size:14px}.opt{padding:8px 12px;margin:6px 0;border:1px solid #cbd5e1;border-radius:8px;background:#fff}`

function htmlShell(
  title: string,
  desc: string,
  canonicalUrl: string,
  robots: string,
  jsonLdScript: string,
  bodyHtml: string,
  lang: "en" | "hi" = "en",
  hreflangs: { en: string; hi?: string; "x-default": string } = { en: canonicalUrl, "x-default": canonicalUrl }
): string {
  const altTags = `
    <link rel="alternate" hreflang="en" href="${hreflangs.en}">
    ${hreflangs.hi ? `<link rel="alternate" hreflang="hi" href="${hreflangs.hi}">` : ""}
    <link rel="alternate" hreflang="x-default" href="${hreflangs["x-default"]}">
  `

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="${robots}">
  ${altTags}
  ${jsonLdScript}
  <style>${CSS}</style>
</head>
<body>
  <nav class="cd"><a href="${homeHubPath(lang)}">Home</a> · <a href="${lang === "hi" ? "/question-answer" : "/hi/question-answer"}">${lang === "hi" ? "English" : "हिन्दी"}</a></nav>
  ${bodyHtml}
</body>
</html>`
}

/**
 * Builds the static site export files as a list of { path, content } objects.
 */
export function generateStaticSiteFiles(
  questions: SeoQuestionInput[],
  gateResults: Map<string | number, GateResult>,
  options: ExportSiteOptions
): GeneratedFile[] {
  const files: GeneratedFile[] = []
  const today = new Date().toISOString().slice(0, 10)

  // In "mirror" mode, canonical points to main site; in "primary", it points to exportBaseUrl
  const effectiveBaseUrl =
    options.exportMode === "primary" ? options.exportBaseUrl : options.mainSiteUrl

  const published = questions.filter((q) => {
    const gate = gateResults.get(q.id)
    return q.isPublished && gate?.passed
  })

  const sitemapUrls: string[] = []
  const sitemapHiUrls: string[] = []

  // 1. Export Published English Question Pages
  published.forEach((q) => {
    const seo = buildSeoModel(q, "en", effectiveBaseUrl)
    const solHtml = formatSolutionHtml(
      {
        id: q.id,
        q: q.q,
        o: q.o,
        a: q.a,
        exp: q.resolvedExp || q.exp,
        sub: q.sub,
        top: q.top,
      },
      published
    )

    const questionBody = `
      <div class="cd">
        <p class="mu">${esc(q.sub)} › ${esc(q.top)} ${q.exam ? "· " + esc(q.exam) : ""} ${q.year ? "· " + esc(q.year) : ""}</p>
        <h1>${esc(q.q)}</h1>
        <ol type="A">${q.o.map((opt) => `<li class="opt">${esc(opt)}</li>`).join("")}</ol>
        <p class="mu">Source: ${esc(q.src || "Not stated")}</p>
        ${solHtml}
      </div>
    `

    const html = htmlShell(
      seo.title,
      seo.description,
      seo.canonicalUrl,
      seo.robots,
      seo.jsonLdScriptString,
      questionBody,
      "en",
      seo.hreflang
    )

    const cleanPath = seo.canonicalPath.replace(/^\/+/, "")
    files.push({
      path: `${cleanPath}/index.html`,
      content: html,
    })

    sitemapUrls.push(seo.canonicalUrl)

    // 2. Export Hindi Twin Page if translation exists
    if (q.hindiTwin && q.hindiTwin.q) {
      const isReviewed = Boolean(q.hindiTwin.isReviewed)
      const seoHi = buildSeoModel(q, "hi", effectiveBaseUrl)
      const solHtmlHi = formatSolutionHtml(
        {
          id: q.id,
          q: q.hindiTwin.q,
          o: q.hindiTwin.o,
          a: q.a,
          exp: q.hindiTwin.exp || q.resolvedExp || q.exp,
          sub: q.sub,
          top: q.hindiTwin.top || q.top,
        },
        published
      )

      const questionBodyHi = `
        <div class="cd">
          <p class="mu">${esc(q.sub)} › ${esc(q.hindiTwin.top || q.top)} ${q.exam ? "· " + esc(q.exam) : ""} ${q.year ? "· " + esc(q.year) : ""}</p>
          <h1>${esc(q.hindiTwin.q)}</h1>
          <ol type="A">${q.hindiTwin.o.map((opt) => `<li class="opt">${esc(opt)}</li>`).join("")}</ol>
          <p class="mu">स्रोत: ${esc(q.src || "उल्लेख नहीं")}</p>
          ${solHtmlHi}
        </div>
      `

      const htmlHi = htmlShell(
        seoHi.title,
        seoHi.description,
        seoHi.canonicalUrl,
        seoHi.robots,
        seoHi.jsonLdScriptString,
        questionBodyHi,
        "hi",
        seoHi.hreflang
      )

      const cleanPathHi = seoHi.canonicalPath.replace(/^\/+/, "")
      files.push({
        path: `${cleanPathHi}/index.html`,
        content: htmlHi,
      })

      if (isReviewed) {
        sitemapHiUrls.push(seoHi.canonicalUrl)
      }
    }
  })

  // 3. Export Hub Pages
  const homeUrl = `${effectiveBaseUrl}${homeHubPath("en")}`
  sitemapUrls.push(homeUrl)
  files.push({
    path: `${homeHubPath("en").replace(/^\/+/, "")}/index.html`,
    content: htmlShell(
      "Question & Answer Bank | TrillionSkill",
      `Explore ${published.length} verified competitive exam MCQs with detailed explanations.`,
      homeUrl,
      "index, follow",
      "",
      `<h1>Question & Answer Bank</h1><p>${published.length} verified questions with detailed solutions.</p>`,
      "en"
    ),
  })

  // 4. Quality Report CSV
  const csvRows = [
    `"id","status","failures","canonical_url","subject","topic","exam","year"`,
    ...questions.map((q) => {
      const gate = gateResults.get(q.id)
      const passed = q.isPublished && gate?.passed
      const status = passed ? "published" : gate?.failures.length ? "noindex" : "queued"
      const url = `${effectiveBaseUrl}${qaPath("en", q.exam, q.sub, q.slug)}`
      return `"${q.id}","${status}","${(gate?.failures || []).join(" ")}","${url}","${q.sub || ""}","${q.top || ""}","${q.exam || ""}","${q.year || ""}"`
    }),
  ]
  files.push({
    path: "quality-report.csv",
    content: csvRows.join("\n"),
  })

  // 5. Sitemaps & robots.txt
  files.push({
    path: "sitemap.xml",
    content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
      .map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
      .join("\n")}\n</urlset>`,
  })

  if (sitemapHiUrls.length > 0) {
    files.push({
      path: "sitemap-hi.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapHiUrls
        .map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
        .join("\n")}\n</urlset>`,
    })
  }

  files.push({
    path: "robots.txt",
    content: `User-agent: *\nAllow: /\nSitemap: ${effectiveBaseUrl}/sitemap.xml\n${
      sitemapHiUrls.length ? `Sitemap: ${effectiveBaseUrl}/sitemap-hi.xml\n` : ""
    }`,
  })

  return files
}
