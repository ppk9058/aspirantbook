"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Lock, Unlock, ShieldAlert, Sparkles, Globe, AlertTriangle, CheckCircle2, Save, Loader2 } from "lucide-react"

export interface GateState {
  isGated: boolean
  previewPercentage: number
  seoMode: "preview" | "bot-full"
  gateTitle?: string
  gateSubtitle?: string
}

export interface GateItemSummary {
  gateMode: string
  previewPercentage?: number | null
}

interface GateControlPanelProps {
  gate: GateState
  onChange: (updated: Partial<GateState>) => void
  onSave?: () => Promise<void> | void
  isSaving?: boolean
  items?: GateItemSummary[]
  estimatedWordCount?: number
  hasHeading?: boolean
  disabled?: boolean
  moduleName?: string
}

export function GateControlPanel({
  gate,
  onChange,
  onSave,
  isSaving = false,
  items = [],
  estimatedWordCount = 450,
  hasHeading = true,
  disabled = false,
  moduleName = "Content",
}: GateControlPanelProps) {
  // Summary counts
  const summary = useMemo(() => {
    let freeCount = 0
    let lockedCount = 0
    let customPreviewCount = 0
    let inheritCount = 0

    for (const it of items) {
      const mode = (it.gateMode || "inherit").toLowerCase()
      if (mode === "free") freeCount++
      else if (mode === "locked") lockedCount++
      else if (mode === "preview") customPreviewCount++
      else inheritCount++
    }

    return { freeCount, lockedCount, customPreviewCount, inheritCount, total: items.length }
  }, [items])

  // SEO Preview calculation
  const seoPreview = useMemo(() => {
    const previewPct = gate.isGated ? gate.previewPercentage : 100
    const crawlerWordCount = Math.round((estimatedWordCount * previewPct) / 100)
    const shareText = previewPct

    let warning: string | null = null
    if (gate.isGated && crawlerWordCount < 150 && estimatedWordCount >= 150) {
      warning = `Warning: Crawlers see only ~${crawlerWordCount} words (< 150 words). Pages meant to rank should use a higher preview % or remain ungated.`
    } else if (gate.isGated && !hasHeading) {
      warning = "Warning: Preview slice has no heading (H1-H3). Add a heading in the preview range for search engines."
    }

    return {
      crawlerWordCount,
      shareText,
      warning,
    }
  }, [gate.isGated, gate.previewPercentage, estimatedWordCount, hasHeading])

  return (
    <Card className="border border-indigo-200 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/20 dark:from-indigo-950/20 dark:via-gray-900 dark:to-blue-950/10 shadow-xs">
      <CardHeader className="p-4 sm:p-5 border-b border-indigo-100 dark:border-indigo-950/60 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${gate.isGated ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
              {gate.isGated ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>Authwall Gate Controls</span>
                <span className="text-xs font-normal text-muted-foreground">({moduleName})</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Centralized server-sliced paywall with bot SEO rules & per-item overrides
              </p>
            </div>
          </div>

          {/* Status summary badge and Save Button */}
          <div className="flex items-center gap-2">
            <Badge
              variant={gate.isGated ? "default" : "outline"}
              className={`text-xs px-2.5 py-1 ${
                gate.isGated
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              }`}
            >
              {gate.isGated
                ? `Gated, ${gate.previewPercentage}% preview, ${summary.freeCount} free, ${summary.lockedCount} locked`
                : "Ungated (100% Free for Guests)"}
            </Badge>

            {onSave && (
              <Button
                type="button"
                size="sm"
                onClick={() => onSave()}
                disabled={disabled || isSaving}
                className="h-7 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                data-testid="save-gate-settings-button"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Gate Settings</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Toggle Enable Gate */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700">
          <div className="space-y-0.5">
            <Label htmlFor="gate-toggle" className="text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">
              Enable Authwall Gating
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, guests only see the server-sliced preview before logging in.
            </p>
          </div>
          <Switch
            id="gate-toggle"
            checked={gate.isGated}
            onCheckedChange={(checked) => onChange({ isGated: checked })}
            disabled={disabled}
            data-testid="authwall-enable-toggle"
          />
        </div>

        {gate.isGated && (
          <div className="space-y-5 pt-1">
            {/* Preview Percentage Slider + Number Input */}
            <div className="space-y-2 p-3.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Default Preview Percentage
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                  {gate.previewPercentage}%
                </span>
              </div>

              <div className="flex items-center gap-4">
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[gate.previewPercentage]}
                  onValueChange={(val) => onChange({ previewPercentage: val[0] })}
                  disabled={disabled}
                  className="flex-1"
                  data-testid="authwall-preview-slider"
                />
                <div className="w-20 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={gate.previewPercentage}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10)
                      if (!isNaN(num)) {
                        onChange({ previewPercentage: Math.max(0, Math.min(100, num)) })
                      }
                    }}
                    disabled={disabled}
                    className="h-8 text-xs text-center font-bold"
                    data-testid="authwall-preview-input"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Guests see the first {gate.previewPercentage}% blocks. Items set to "Inherit" will follow this percentage. 0% locks all body content.
              </p>
            </div>

            {/* SEO Mode Select */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Search Engine Crawler SEO Mode</span>
              </div>
              <Select
                value={gate.seoMode}
                onValueChange={(val: "preview" | "bot-full") => onChange({ seoMode: val })}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 text-xs" data-testid="authwall-seo-mode-select">
                  <SelectValue placeholder="Select SEO Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preview" className="text-xs">
                    Preview (Default) — Bots & guests both receive {gate.previewPercentage}% preview + paywall schema
                  </SelectItem>
                  <SelectItem value="bot-full" className="text-xs">
                    Bot-Full — Verified Googlebot/Bingbot gets 100% text; humans get {gate.previewPercentage}% preview
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Help: Pages meant to rank on search engines should be ungated or use a higher preview percentage. "Bot-full" strictly verifies DNS to prevent spoofing.
              </p>
            </div>

            {/* SEO Preview Diagnostic Line */}
            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-indigo-950 dark:text-indigo-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>SEO Crawler Preview Analysis</span>
                </span>
                <span className="font-mono text-xs">
                  {seoPreview.shareText}% text visible ({seoPreview.crawlerWordCount} words)
                </span>
              </div>

              {seoPreview.warning ? (
                <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{seoPreview.warning}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Good SEO preview length and heading coverage for search crawlers.</span>
                </div>
              )}
            </div>

            {/* Optional Custom Gate Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="gate-title-input" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Custom Authwall Title (Optional)
                </Label>
                <Input
                  id="gate-title-input"
                  placeholder="e.g. Sign in to read full tutorial"
                  value={gate.gateTitle || ""}
                  onChange={(e) => onChange({ gateTitle: e.target.value })}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gate-subtitle-input" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Custom Authwall Subtitle (Optional)
                </Label>
                <Input
                  id="gate-subtitle-input"
                  placeholder="e.g. Unlock all chapters and code examples"
                  value={gate.gateSubtitle || ""}
                  onChange={(e) => onChange({ gateSubtitle: e.target.value })}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
