/**
 * Static Site File Generator for Cloudflare Pages ZIP Export
 * Source: Exam_Content_Engine-4.html
 */

import { buildSeoModel, SeoQuestionInput } from "./seo-model"
import { createZipBuffer, ZipFileInput } from "./zip"
import { formatSolutionHtml } from "./solution-formatter"
import { slugify } from "./paths"
import { getBaseUrl } from "@/lib/seo/core"

export interface ExportQuestionRecord {
  id: string
  shortId: string
  slug: string | null
  q: string
  options: string[]
  answer: string
  answerIndex: number
  explanation?: string | null
  sub: string
  top: string
  exam?: string | null
  year?: string | null
  sourceTag?: string | null
  isPublished: boolean
  isVerified: boolean
  translations?: Array<{
    lang: string
    q: string
    options: string[]
    explanation?: string | null
    top?: string | null
    isReviewed: boolean
  }>
}

/**
 * Renders a full standalone HTML document for a question page.
 */
function renderStaticQuestionHtml(
  seo: ReturnType<typeof buildSeoModel>,
  qText: string,
  options: string[],
  answerIndex: number,
  explanation: string,
  meta: {
    sub: string
    top: string
    exam?: string | null
    year?: string | null
    lang: "en" | "hi"
    shortId: string
  }
): string {
  const isHi = meta.lang === "hi"
  const optLetters = ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)"]
  const solHtml = formatSolutionHtml({
    id: meta.shortId,
    q: qText,
    o: options,
    a: answerIndex,
    exp: explanation,
    top: meta.top,
    sub: meta.sub,
  })

  const optionsHtml = options
    .map((opt, i) => {
      const isCorrect = i === answerIndex
      return `
      <div class="option-item ${isCorrect ? "correct" : ""}">
        <span class="opt-label">${optLetters[i] || `(${i + 1})`}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </div>`
    })
    .join("\n")

  return `<!DOCTYPE html>
<html lang="${meta.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(seo.title)}</title>
  <meta name="description" content="${escapeHtml(seo.description)}" />
  <link rel="canonical" href="${seo.canonicalUrl}" />
  <meta name="robots" content="${seo.robots}" />
  <link rel="alternate" hreflang="en" href="${seo.hreflang.en}" />
  ${seo.hreflang.hi ? `<link rel="alternate" hreflang="hi" href="${seo.hreflang.hi}" />` : ""}
  <link rel="alternate" hreflang="x-default" href="${seo.hreflang["x-default"]}" />
  ${seo.jsonLdScriptString}
  <style>
    :root {
      --bg: #ffffff;
      --fg: #0f172a;
      --card: #f8fafc;
      --border: #e2e8f0;
      --primary: #4f46e5;
      --correct: #16a34a;
      --correct-bg: #f0fdf4;
      --correct-border: #bbf7d0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0f19;
        --fg: #f1f5f9;
        --card: #131b2e;
        --border: #1e293b;
        --primary: #6366f1;
        --correct: #22c55e;
        --correct-bg: #052e16;
        --correct-border: #166534;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      padding: 24px 16px;
    }
    .container { max-width: 768px; margin: 0 auto; }
    .breadcrumbs { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .breadcrumbs a { color: var(--primary); text-decoration: none; }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--card);
      border: 1px solid var(--border);
    }
    .question-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .question-text { font-size: 17px; font-weight: 600; margin-bottom: 20px; line-height: 1.5; white-space: pre-wrap; }
    .options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      font-size: 15px;
    }
    .option-item.correct {
      background: var(--correct-bg);
      border-color: var(--correct-border);
      color: var(--correct);
      font-weight: 600;
    }
    .opt-label { font-weight: 700; color: #64748b; shrink: 0; }
    .solution {
      border-top: 1px solid var(--border);
      padding-top: 20px;
      margin-top: 20px;
    }
    .solution h3 { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
    .sol-body { font-size: 14px; color: var(--fg); line-height: 1.7; }
    footer { text-align: center; font-size: 13px; color: #64748b; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      ${seo.breadcrumbs.map((b) => `<a href="${b.url}">${escapeHtml(b.name)}</a>`).join(" &gt; ")}
    </nav>

    <div class="badges">
      <span class="badge">${escapeHtml(meta.sub)}</span>
      <span class="badge">${escapeHtml(meta.top)}</span>
      ${meta.exam ? `<span class="badge">${escapeHtml(meta.exam)}${meta.year ? " " + escapeHtml(meta.year) : ""}</span>` : ""}
    </div>

    <article class="question-card">
      <h1 class="question-text">${escapeHtml(qText)}</h1>

      <div class="options">
        ${optionsHtml}
      </div>

      <section class="solution">
        <h3>${isHi ? "विस्तृत व्याख्या" : "Detailed Explanation"}</h3>
        <div class="sol-body">
          ${solHtml}
        </div>
      </section>
    </article>

    <footer>
      <p>&copy; ${new Date().getFullYear()} AspirantBook — Multilingual PYQ Repository</p>
    </footer>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Builds the complete static site files map ready for ZIP packing.
 */
export function generateStaticSiteFiles(
  questions: ExportQuestionRecord[],
  exportMode: "mirror" | "primary" = "mirror",
  customBaseUrl?: string
): ZipFileInput[] {
  const files: ZipFileInput[] = []
  if (exportMode === "primary" && (!customBaseUrl || !customBaseUrl.trim())) {
    throw new Error("Primary export mode requires Setting.exportBaseUrl to be configured.")
  }
  const defaultMirror = getBaseUrl()
  const defaultPrimary = customBaseUrl?.trim() || ""
  const baseUrl =
    customBaseUrl || (exportMode === "primary" ? defaultPrimary : defaultMirror)

  const published = questions.filter((q) => q.isPublished && q.slug)

  // 1. _headers
  files.push({
    path: "_headers",
    content: `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
`,
  })

  // 2. _redirects
  const redirectLines: string[] = []
  published.forEach((q) => {
    if (q.exam && q.sub && q.slug) {
      redirectLines.push(
        `/q/${q.shortId}  /question-answer/${slugify(q.exam)}/${slugify(q.sub)}/${q.slug}/  308`
      )
    }
  })
  files.push({
    path: "_redirects",
    content: redirectLines.join("\n"),
  })

  // 3. Question HTML pages
  const sitemapUrlsEn: string[] = []
  const sitemapUrlsHi: string[] = []

  published.forEach((q) => {
    if (!q.slug) return
    const hiTr = q.translations?.find((t) => t.lang === "hi")

    const seoInput: SeoQuestionInput = {
      id: q.id,
      shortId: q.shortId,
      slug: q.slug,
      q: q.q,
      o: q.options,
      a: q.answerIndex,
      exp: q.explanation || "",
      sub: q.sub,
      top: q.top,
      exam: q.exam || undefined,
      year: q.year || undefined,
      src: q.sourceTag || undefined,
      isPublished: true,
      isVerified: q.isVerified,
      hindiTwin: hiTr
        ? {
            q: hiTr.q,
            o: hiTr.options,
            exp: hiTr.explanation || "",
            top: hiTr.top || undefined,
            isReviewed: hiTr.isReviewed,
          }
        : null,
    }

    const examSlug = slugify(q.exam || "general")
    const subSlug = slugify(q.sub || "uncategorized")

    // English page
    const seoEn = buildSeoModel(seoInput, "en", baseUrl)
    const htmlEn = renderStaticQuestionHtml(
      seoEn,
      q.q,
      q.options,
      q.answerIndex,
      q.explanation || "",
      {
        sub: q.sub,
        top: q.top,
        exam: q.exam,
        year: q.year,
        lang: "en",
        shortId: q.shortId,
      }
    )

    files.push({
      path: `question-answer/${examSlug}/${subSlug}/${q.slug}/index.html`,
      content: htmlEn,
    })
    sitemapUrlsEn.push(seoEn.canonicalUrl)

    // Hindi page (if present and reviewed)
    if (hiTr && hiTr.isReviewed) {
      const seoHi = buildSeoModel(seoInput, "hi", baseUrl)
      const htmlHi = renderStaticQuestionHtml(
        seoHi,
        hiTr.q,
        hiTr.options,
        q.answerIndex,
        hiTr.explanation || q.explanation || "",
        {
          sub: q.sub,
          top: q.top,
          exam: q.exam,
          year: q.year,
          lang: "hi",
          shortId: q.shortId,
        }
      )

      files.push({
        path: `hi/question-answer/${examSlug}/${subSlug}/${q.slug}/index.html`,
        content: htmlHi,
      })
      sitemapUrlsHi.push(seoHi.canonicalUrl)
    }
  })

  // 4. sitemap.xml
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrlsEn.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`
  files.push({ path: "sitemap.xml", content: sitemapXml })

  // 5. sitemap-hi.xml
  const sitemapHiXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrlsHi.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`
  files.push({ path: "sitemap-hi.xml", content: sitemapHiXml })

  // 6. index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Competitive Exam Question Repository | AspirantBook</title>
  <meta name="description" content="Browse verified previous year questions (PYQs) for UPSC, State PSCs, SSC, and Banking exams with bilingual solutions." />
  <link rel="canonical" href="${baseUrl}/question-answer/" />
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 16px; line-height: 1.6; }
    h1 { margin-bottom: 8px; font-size: 28px; }
    p { color: #64748b; margin-bottom: 24px; }
    .q-list { list-style: none; padding: 0; }
    .q-list li { margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .q-list a { color: #4f46e5; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <h1>Exam Question Repository</h1>
  <p>Static high-speed delivery of verified competitive exam questions and bilingual answers.</p>
  <ul class="q-list">
    ${published
      .slice(0, 50)
      .map(
        (q) =>
          `<li><a href="/question-answer/${slugify(q.exam || "general")}/${slugify(q.sub || "uncategorized")}/${q.slug}/">${escapeHtml(
            q.q.slice(0, 100)
          )}...</a></li>`
      )
      .join("\n")}
  </ul>
</body>
</html>`
  files.push({ path: "index.html", content: indexHtml })

  return files
}
