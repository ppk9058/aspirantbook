import { runSeoAudit } from "@/lib/seo/audit"
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  Languages,
  FileText,
  BookOpen,
  HelpCircle,
  TrendingUp,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminSeoPage() {
  const audit = await runSeoAudit()
  const { summary, modules } = audit
  const isSiteUrlConfigured = Boolean(
    (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
    (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim())
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" />
            SEO Health & Audit Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-module indexing policy, hreflang parity, canonical audit, and sitemap coverage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isSiteUrlConfigured
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
            }`}
          >
            Site URL configured: {isSiteUrlConfigured ? "OK" : "MISSING"}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Engine Active
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Indexed Pages</span>
            <Search className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              {summary.indexablePages}
            </span>
            <span className="text-xs text-muted-foreground">public URLs</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Noindex Guarded</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
              {summary.noindexPages}
            </span>
            <span className="text-xs text-muted-foreground">drafts / unreviewed</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Unreviewed Hindi</span>
            <Languages className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {summary.unreviewedHindi}
            </span>
            <span className="text-xs text-muted-foreground">awaiting human review</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Sitemap Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.sitemapCoverageScore}%
            </span>
            <span className="text-xs text-muted-foreground">healthy metadata</span>
          </div>
        </div>
      </div>

      {/* Module Breakdown Grid */}
      <h2 className="text-lg font-semibold tracking-tight text-foreground pt-2">
        Module Indexing Status
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Content Engine */}
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              Content Engine (MCQs)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Static / ISR
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div className="text-muted-foreground">Total Questions:</div>
            <div className="font-medium text-foreground">{modules.contentEngine.totalQuestions}</div>
            <div className="text-muted-foreground">Published:</div>
            <div className="font-medium text-foreground">{modules.contentEngine.publishedQuestions}</div>
            <div className="text-muted-foreground">Reviewed Hindi:</div>
            <div className="font-medium text-emerald-600 dark:text-emerald-400">
              {modules.contentEngine.reviewedHindiCount} (indexable)
            </div>
            <div className="text-muted-foreground">Unreviewed Hindi:</div>
            <div className="font-medium text-amber-600 dark:text-amber-400">
              {modules.contentEngine.unreviewedHindiCount} (noindex)
            </div>
          </div>
        </div>

        {/* PYQs */}
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Previous Year Papers (PYQs)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Catalog & Detail
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div className="text-muted-foreground">Exam Categories:</div>
            <div className="font-medium text-foreground">{modules.pyqs.totalCategories}</div>
            <div className="text-muted-foreground">Published Categories:</div>
            <div className="font-medium text-foreground">{modules.pyqs.publishedCategories}</div>
            <div className="text-muted-foreground">Missing Descriptions:</div>
            <div className="font-medium text-foreground">{modules.pyqs.missingDescriptions}</div>
          </div>
        </div>

        {/* Test Series */}
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Exam Test Series
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Dynamic Metadata
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div className="text-muted-foreground">Total Series:</div>
            <div className="font-medium text-foreground">{modules.testSeries.totalSeries}</div>
            <div className="text-muted-foreground">Published Series:</div>
            <div className="font-medium text-foreground">{modules.testSeries.publishedSeries}</div>
            <div className="text-muted-foreground">Missing Descriptions:</div>
            <div className="font-medium text-foreground">{modules.testSeries.missingDescriptions}</div>
          </div>
        </div>

        {/* Tutorials */}
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Tutorials & Courses
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              TechArticle JSON-LD
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div className="text-muted-foreground">Total Courses:</div>
            <div className="font-medium text-foreground">{modules.tutorials.totalTutorials}</div>
            <div className="text-muted-foreground">Published (Indexed):</div>
            <div className="font-medium text-emerald-600 dark:text-emerald-400">
              {modules.tutorials.publishedTutorials}
            </div>
            <div className="text-muted-foreground">Drafts (Noindex):</div>
            <div className="font-medium text-amber-600 dark:text-amber-400">
              {modules.tutorials.draftTutorials}
            </div>
          </div>
        </div>
      </div>

      {/* Safeguards Summary */}
      <div className="p-5 rounded-xl border bg-muted/40 text-card-foreground space-y-2">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Zero-Regress SEO Hardening Guarantees
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>All canonical origins derive dynamically from NEXT_PUBLIC_SITE_URL or fallback; no hardcoded hosts.</li>
          <li>XSS protection: All inline JSON-LD script tags escape {"<"} as \u003c.</li>
          <li>Bilingual hreflang alternate links emit strictly if Hindi counterpart is human-reviewed.</li>
          <li>Public routes remain 100% static/ISR without turning dynamic (ƒ).</li>
        </ul>
      </div>
    </div>
  )
}
