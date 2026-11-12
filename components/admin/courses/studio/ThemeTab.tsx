"use client"

import { useMemo } from "react"
import { Palette, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"
import { DEFAULT_COURSE_THEME, type CourseTheme } from "@/components/course/detail/theme"
import { evaluateThemeContrast } from "@/lib/courses/contrast"
import { StudioSection, Field, InlineError } from "./fields"

interface ThemeTabProps {
  theme: CourseTheme
  onChange: (patch: Partial<CourseTheme>) => void
  onReset: () => void
}

const HEADING_FONT_OPTIONS = [
  { value: `'Roboto Condensed', 'Archivo Narrow', sans-serif`, label: "Roboto Condensed (Default)" },
  { value: `'Montserrat', sans-serif`, label: "Montserrat Bold" },
  { value: `'Oswald', sans-serif`, label: "Oswald Condensed" },
  { value: `'Inter', sans-serif`, label: "Inter Modern" },
  { value: `'Cinzel', serif`, label: "Cinzel Classical Serif" },
]

const BODY_FONT_OPTIONS = [
  { value: `'Mukta', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`, label: "Mukta (Supports Devanagari / Hindi)" },
  { value: `'Inter', sans-serif`, label: "Inter Neutral" },
  { value: `'Roboto', sans-serif`, label: "Roboto" },
  { value: `'Open Sans', sans-serif`, label: "Open Sans" },
]

export function ThemeTab({ theme, onChange, onReset }: ThemeTabProps) {
  const contrastChecks = useMemo(() => {
    return evaluateThemeContrast({
      navy: theme.navy,
      gold: theme.gold,
      cream: theme.cream,
      creamCard: theme.creamCard,
      olive: theme.olive,
      ink: theme.ink,
    })
  }, [theme])

  const hasContrastFailure = contrastChecks.some((c) => !c.passes)

  const colorFields: Array<{ key: keyof CourseTheme; label: string; desc: string }> = [
    { key: "navy", label: "Navy (Hero Background)", desc: "Main hero background banner and dark accents" },
    { key: "navyLight", label: "Navy Light (Hill Decoration)", desc: "Lighter rolling hill and path background" },
    { key: "gold", label: "Gold (Action & Accents)", desc: "CTA button, active stars, highlight badges" },
    { key: "cream", label: "Cream (Page Background)", desc: "Warm public page background" },
    { key: "creamCard", label: "Cream Card (Cards & Panels)", desc: "Floating card and accordion panel background" },
    { key: "creamDark", label: "Cream Dark (Dividers & Borders)", desc: "Borders, hair lines, and subtle chips" },
    { key: "olive", label: "Olive (Active Tabs & Subheads)", desc: "Active tab pill fill and section titles" },
    { key: "ink", label: "Ink (Primary Headings & Text)", desc: "Primary text and heading dark ink" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>Course Visual Theme & Palette</span>
            <Palette className="w-5 h-5 text-orange-600" />
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Customize branding colors and typography per-course. Applied dynamically on the public page.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset to Default
        </button>
      </div>

      {/* WCAG Contrast Health Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          hasContrastFailure
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-emerald-50 border-emerald-200 text-emerald-900"
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          {hasContrastFailure ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>WCAG Contrast Warning: Some colors have low readability</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>WCAG AA Contrast Check: All text combinations are highly readable</span>
            </>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {contrastChecks.map((check, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border flex items-center justify-between ${
                check.passes ? "bg-white/80 border-emerald-100" : "bg-white border-amber-300 font-semibold text-amber-900"
              }`}
            >
              <span>{check.pair}</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-gray-100">
                {check.ratio}:1 ({check.rating})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Color Tokens Grid */}
      <StudioSection title="Color Palette Tokens" description="Pick colors using the visual swatch or enter hex codes.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {colorFields.map(({ key, label, desc }) => {
            const val = String(theme[key] || DEFAULT_COURSE_THEME[key])
            return (
              <div key={key} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">{label}</span>
                  <div
                    className="w-6 h-6 rounded-full border border-gray-300 shadow-2xs shrink-0"
                    style={{ backgroundColor: val }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">{desc}</p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={val.startsWith("#") && (val.length === 7 || val.length === 4) ? val : "#1B1F4A"}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    data-testid={`theme-color-${key}`}
                    value={val}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    placeholder="#1B1F4A"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-mono text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </StudioSection>

      {/* Typography Configuration */}
      <StudioSection title="Typography Selection" description="Font stacks applied across headings and body content.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Headings & Hero Font</label>
            <select
              value={theme.fontHeading}
              onChange={(e) => onChange({ fontHeading: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-gray-800"
            >
              {HEADING_FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Body Text Font (Supports Devanagari)</label>
            <select
              value={theme.fontBody}
              onChange={(e) => onChange({ fontBody: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-gray-800"
            >
              {BODY_FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </StudioSection>
    </div>
  )
}
