"use client"

import { useState, useEffect } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Cloud, Globe, FileCode, CheckCircle2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function ContentEngineExportPage() {
  const [exportMode, setExportMode] = useState<"mirror" | "primary">("mirror")
  const [isSavingSetting, setIsSavingSetting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [publishedCount, setPublishedCount] = useState<number | null>(null)

  useEffect(() => {
    // Load current exportMode setting & question count
    fetch("/api/admin/content-engine/settings?key=exportMode")
      .then((res) => res.json())
      .then((data) => {
        if (data.value) setExportMode(data.value)
      })
      .catch(() => {})

    fetch("/api/admin/content-engine/questions?isPublished=true&pageSize=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.total !== undefined) setPublishedCount(data.total)
      })
      .catch(() => {})
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

  function handleDownloadZip() {
    setIsDownloading(true)
    toast.info("Generating static ZIP package...")
    const link = document.createElement("a")
    link.href = "/api/admin/content-engine/export"
    link.download = "content-engine-static-site.zip"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setIsDownloading(false), 2000)
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
              Canonical tags point to <strong className="text-foreground">https://aspirantbook.com</strong>. Prevents duplicate content penalties while providing high-speed edge distribution.
            </p>
          </div>

          <div
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
              Canonical tags point directly to <strong className="text-foreground">https://questions.aspirantbook.com</strong>. The Cloudflare Pages site serves as the primary search engine landing domain.
            </p>
          </div>
        </div>
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
              ? `${publishedCount} published questions will be compiled into static HTML.`
              : "Compiling published question repository..."}
          </span>
        </div>

        <Button
          onClick={handleDownloadZip}
          disabled={isDownloading || publishedCount === 0}
          className="min-h-[44px] px-6 text-sm font-semibold gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? "Generating..." : "Download Static Site ZIP"}</span>
        </Button>
      </div>
    </div>
  )
}
