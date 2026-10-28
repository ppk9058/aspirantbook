"use client"

import { useState, useEffect } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Cloud, Globe, FileCode, CheckCircle2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function ContentEngineExportPage() {
  const [exportMode, setExportMode] = useState<"mirror" | "primary">("mirror")
  const [exportBaseUrl, setExportBaseUrl] = useState<string>("")
  const [isSavingSetting, setIsSavingSetting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [publishedCount, setPublishedCount] = useState<number | null>(null)

  useEffect(() => {
    // Load current exportMode setting & question count. B11: a failed load must
    // be visible; silently showing defaults hides a broken export configuration.
    fetch("/api/admin/content-engine/settings?key=exportMode")
      .then((res) => res.json())
      .then((data) => {
        if (data.value) setExportMode(data.value)
      })
      .catch(() => toast.error("Could not load the export mode setting"))

    fetch("/api/admin/content-engine/settings?key=exportBaseUrl")
      .then((res) => res.json())
      .then((data) => {
        if (data.value) setExportBaseUrl(data.value)
      })
      .catch(() => toast.error("Could not load the export base URL setting"))

    fetch("/api/admin/content-engine/questions?isPublished=true&pageSize=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.total !== undefined) setPublishedCount(data.total)
      })
      .catch(() => toast.error("Could not count published questions"))
  }, [])

  async function handleModeChange(newMode: "mirror" | "primary") {
    setExportMode(newMode)
    setIsSavingSetting(true)
    try {
      const res = await fetch("/api/admin/content-engine/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "exportMode", value: newMode }),
      })
      if (res.ok) {
        toast.success(`Export mode set to ${newMode}`)
      } else {
        toast.error("Failed to save setting")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsSavingSetting(false)
    }
  }

  // B11: an export is bounded to EXPORT_PART_SIZE questions per archive, so a
  // large corpus downloads several parts. The response headers say whether
  // another part exists; following them keeps every archive complete instead of
  // silently shipping only the first page.
  const EXPORT_PART_SIZE = 2000

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  async function handleDownloadZip() {
    setIsDownloading(true)
    try {
      let offset = 0
      let part = 1
      let parts = Math.max(1, Math.ceil((publishedCount ?? 0) / EXPORT_PART_SIZE))

      while (offset >= 0) {
        if (parts > 1) {
          toast.info(`Generating export archive ${part} of ${parts}...`)
        } else {
          toast.info("Generating static ZIP package...")
        }

        const res = await fetch(
          `/api/admin/content-engine/export?limit=${EXPORT_PART_SIZE}&offset=${offset}`
        )
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || `Export failed with status ${res.status}`)
        }

        parts = Math.max(1, Number(res.headers.get("X-Export-Parts") || parts))
        const nextOffset = res.headers.get("X-Export-Next-Offset")
        const filename =
          parts > 1
            ? `content-engine-static-site-part-${part}-of-${parts}.zip`
            : "content-engine-static-site.zip"

        saveBlob(await res.blob(), filename)
        offset = nextOffset ? Number(nextOffset) : -1
        part += 1
      }

      toast.success(
        parts > 1 ? `Downloaded ${parts} export archives` : "Static ZIP downloaded"
      )
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate static export")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
      <ContentEngineHeader
        title="Static Cloudflare Pages ZIP Export"
        description="Generate and download a self-contained static site ZIP archive ready to deploy on Cloudflare Pages or any static CDN with zero runtime dependencies."
      />

      {/* Mode Selector Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <span>SEO Canonical Host Mode</span>
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Choose whether the static site acts as a mirror CDN (canonicals pointing back to the main domain) or as the primary standalone questions host.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div
            data-testid="mirror-mode-card"
            onClick={() => handleModeChange("mirror")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 ${
              exportMode === "mirror"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80 bg-background"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Mirror CDN Mode</span>
              {exportMode === "mirror" && (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Canonical tags point to the main site domain. Prevents duplicate content penalties while providing high-speed edge distribution.
            </p>
          </div>

          <div
            data-testid="primary-mode-card"
            onClick={() => handleModeChange("primary")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 ${
              exportMode === "primary"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80 bg-background"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Primary Host Mode</span>
              {exportMode === "primary" && (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Canonical tags point directly to the configured Setting.exportBaseUrl domain ({exportBaseUrl || "not configured"}). The static site serves as the primary search engine landing domain.
            </p>
          </div>
        </div>

        {exportMode === "primary" && !exportBaseUrl?.trim() && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
            <span className="font-semibold block">⚠️ Missing Export Base URL</span>
            <p className="leading-relaxed">
              Primary export mode host is not configured. Please set exportBaseUrl in settings before exporting.
            </p>
          </div>
        )}

        {exportMode === "primary" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <span className="font-semibold block">⚠️ Duplicate Content Notice</span>
            <p className="leading-relaxed">
              Primary Host Mode points all canonical tags and Schema.org Quiz JSON-LD directly to the static export domain instead of the main application. If both sites are published to the web simultaneously without domain redirection, search crawlers may detect duplicate content.
            </p>
          </div>
        )}
      </div>

      {/* Package Contents Breakdown */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileCode className="w-5 h-5 text-purple-600" />
          <span>Static Archive Architecture</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <span className="font-semibold text-foreground block">index.html</span>
            <span className="text-muted-foreground">Portal index listing top exam categories and verified questions.</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <span className="font-semibold text-foreground block">_headers</span>
            <span className="text-muted-foreground">HTTP security headers, nosniff, and Cloudflare Edge cache rules.</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <span className="font-semibold text-foreground block">_redirects</span>
            <span className="text-muted-foreground">Permanent 301 redirects mapping 8-char short IDs (/q/:id) to full SEO paths.</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-background space-y-1">
            <span className="font-semibold text-foreground block">sitemap.xml & sitemap-hi.xml</span>
            <span className="text-muted-foreground">Separate XML sitemaps for English questions and human-reviewed Hindi twins.</span>
          </div>
        </div>
      </div>

      {/* Download Action */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-sm font-semibold text-foreground block">Ready for Export</span>
          <span className="text-xs text-muted-foreground">
            {publishedCount !== null
              ? publishedCount > EXPORT_PART_SIZE
                ? `${publishedCount} published questions will be compiled into ${Math.ceil(
                    publishedCount / EXPORT_PART_SIZE
                  )} ZIP archives (${EXPORT_PART_SIZE} questions each).`
                : `${publishedCount} published questions will be compiled into static HTML.`
              : "Compiling published question repository..."}
          </span>
        </div>

        <Button
          onClick={handleDownloadZip}
          disabled={isDownloading || publishedCount === 0 || (exportMode === "primary" && !exportBaseUrl.trim())}
          className="min-h-[44px] px-6 text-sm font-semibold gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? "Generating..." : "Download Static Site ZIP"}</span>
        </Button>
      </div>
    </div>
  )
}
