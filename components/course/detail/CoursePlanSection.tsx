"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { Lang } from "@/lib/i18n/localized"
import { pluralize, formatLecturesAndHours } from "@/lib/i18n/pluralize"
import type { DetailChapter, DetailUnit } from "./types"
import { fontStackFor } from "./theme"

export interface PlanTheme {
  id: string
  title: string
  titleHi?: string | null
  lectureCount: number
  subtopics: string[]
  subtopicsHi: string[]
}

export interface PlanUnitDisplay {
  id: string
  number: number
  numberStr: string // "01", "02", etc.
  title: string
  titleHi?: string | null
  tag: string
  lectureCount: number
  themeCount: number
  hours: number
  dateRange?: string
  themes: PlanTheme[]
}

export interface SnakeRow {
  rowIndex: number
  isReversed: boolean
  units: PlanUnitDisplay[]
  hasCurveToNext: boolean
  curveSide?: "right" | "left"
  hasSun: boolean
  sunSide?: "right" | "left"
}

export function getSnakeRows(units: PlanUnitDisplay[], rowSize = 5): SnakeRow[] {
  if (!units || units.length === 0) return []
  const rows: SnakeRow[] = []
  const totalRows = Math.ceil(units.length / rowSize)

  for (let r = 0; r < totalRows; r++) {
    const chunk = units.slice(r * rowSize, (r + 1) * rowSize)
    const isReversed = r % 2 === 1
    const hasCurveToNext = r < totalRows - 1
    const curveSide = r % 2 === 0 ? "right" : "left"
    const isLastRow = r === totalRows - 1
    const sunSide = isReversed ? "left" : "right"

    // If reversed, the units in the row visually flow from right to left
    // so the first unit of this chunk (e.g. Unit 06) is at the right edge,
    // and the last unit of this chunk (e.g. Unit 09) is at the left edge!
    const displayUnits = isReversed ? [...chunk].reverse() : chunk

    rows.push({
      rowIndex: r,
      isReversed,
      units: displayUnits,
      hasCurveToNext,
      curveSide: hasCurveToNext ? curveSide : undefined,
      hasSun: isLastRow,
      sunSide: isLastRow ? sunSide : undefined,
    })
  }

  return rows
}

export function CheeringKidsSvg({ className = "h-14 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Green hill base */}
      <path d="M0 60C15 50 45 44 90 50L90 60H0Z" fill="#A8D5BA" />
      <path d="M10 60C25 52 50 48 85 54L85 60H10Z" fill="#78B892" />

      {/* Kid 1 (Left - girl with arms raised up) */}
      <g id="cheering-girl">
        <circle cx="26" cy="18" r="6" fill="#F8B195" />
        {/* Hair with pigtails */}
        <path d="M20 18C20 13 23 11 26 11C29 11 32 13 32 18C30 17 28 17 26 17C23 17 21 17 20 18Z" fill="#3D2314" />
        <circle cx="18" cy="16" r="2.5" fill="#3D2314" />
        <circle cx="34" cy="16" r="2.5" fill="#3D2314" />
        {/* Happy Face */}
        <circle cx="24" cy="18" r="0.8" fill="#2C3E50" />
        <circle cx="28" cy="18" r="0.8" fill="#2C3E50" />
        <path d="M24.5 20.5C25.5 21.5 26.5 21.5 27.5 20.5" stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
        {/* Raised arms */}
        <path d="M22 25L16 16M30 25L36 16" stroke="#F8B195" strokeWidth="2.5" strokeLinecap="round" />
        {/* Red Shirt */}
        <rect x="22" y="24" width="8" height="11" rx="2" fill="#E84A5F" />
        {/* Skirt */}
        <path d="M21 35L22 40H30L31 35H21Z" fill="#99B898" />
        {/* Legs */}
        <rect x="23" y="40" width="2" height="7" fill="#F8B195" />
        <rect x="27" y="40" width="2" height="7" fill="#F8B195" />
        {/* Shoes */}
        <rect x="22" y="46" width="3.5" height="2" rx="1" fill="#2A363B" />
        <rect x="27" y="46" width="3.5" height="2" rx="1" fill="#2A363B" />
      </g>

      {/* Kid 2 (Right - boy with arms raised in victory) */}
      <g id="cheering-boy">
        <circle cx="48" cy="17" r="6.5" fill="#F8B195" />
        {/* Hair */}
        <path d="M41.5 16C41.5 11 44.5 10 48 10C51.5 10 54.5 11 54.5 16C52 14.5 49 14.5 48 14.5C46 14.5 43 15 41.5 16Z" fill="#2C3E50" />
        {/* Happy Face */}
        <circle cx="46" cy="17" r="0.8" fill="#2C3E50" />
        <circle cx="50" cy="17" r="0.8" fill="#2C3E50" />
        <path d="M46.5 19.5C47.5 20.5 48.5 20.5 49.5 19.5" stroke="#2C3E50" strokeWidth="0.8" strokeLinecap="round" />
        {/* Raised arms */}
        <path d="M44 24L38 15M52 24L58 15" stroke="#F8B195" strokeWidth="2.5" strokeLinecap="round" />
        {/* Green/Teal Shirt */}
        <rect x="44" y="23" width="9" height="12" rx="2" fill="#2A9D8F" />
        {/* Shorts */}
        <rect x="44.5" y="35" width="8" height="6" rx="1" fill="#264653" />
        {/* Legs */}
        <rect x="45.5" y="41" width="2" height="6" fill="#F8B195" />
        <rect x="49.5" y="41" width="2" height="6" fill="#F8B195" />
        {/* Shoes */}
        <rect x="45" y="46" width="3.5" height="2" rx="1" fill="#E76F51" />
        <rect x="49.5" y="46" width="3.5" height="2" rx="1" fill="#E76F51" />
      </g>
    </svg>
  )
}

interface CoursePlanSectionProps {
  lang: Lang
  units?: DetailUnit[]
  chapters: DetailChapter[]
  goalLabel?: string
  goalLabelHi?: string | null
}

export function CoursePlanSection({
  lang,
  units = [],
  chapters = [],
  goalLabel,
  goalLabelHi,
}: CoursePlanSectionProps) {
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({})

  const toggleTheme = (themeId: string) => {
    setExpandedThemes((prev) => ({ ...prev, [themeId]: !prev[themeId] }))
  }

  // Build structured display units (fallback to chapters if no units are defined)
  const sourceUnits =
    units && units.length > 0
      ? units
      : chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          titleHi: ch.titleHi,
          tags: ["GS"],
          dateRange: undefined,
        }))

  const displayUnits: PlanUnitDisplay[] = sourceUnits.map((unit, idx) => {
    const unitChapters =
      units && units.length > 0
        ? chapters.filter((c) => c.unitId === unit.id)
        : chapters.filter((c) => c.id === unit.id)
    const unitLectures = unitChapters.flatMap((c) => c.lessons)
    const totalMinutes = unitLectures.reduce((sum, l) => sum + (l.duration || 90), 0)
    const hours = Math.round((totalMinutes / 60) * 10) / 10

    const themes: PlanTheme[] = unitChapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      titleHi: ch.titleHi,
      lectureCount: ch.lessons.length,
      subtopics: ch.subtopics || [],
      subtopicsHi: ch.subtopicsHi || [],
    }))

    const tag = unit.tags && unit.tags.length > 0 ? unit.tags[0] : ""

    return {
      id: unit.id,
      number: idx + 1,
      numberStr: String(idx + 1).padStart(2, "0"),
      title: unit.title,
      titleHi: unit.titleHi,
      tag,
      lectureCount: unitLectures.length,
      themeCount: themes.length,
      hours,
      dateRange: unit.dateRange,
      themes,
    }
  })

  // Compute derived summary metrics
  const totalUnitCount = displayUnits.length
  const totalThemeCount = displayUnits.reduce((acc, u) => acc + u.themes.length, 0)
  const totalLectureCount = displayUnits.reduce((acc, u) => acc + u.lectureCount, 0)

  const effectiveGoal = (lang === "hi" && goalLabelHi) ? goalLabelHi : (goalLabel || "")

  const rows = getSnakeRows(displayUnits, 5)

  if (displayUnits.length === 0) return null

  return (
    <section
      id="plan"
      aria-labelledby="plan-heading"
      className="scroll-mt-24 pt-8 pb-16"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      {/* Heading with computed totals */}
      <div className="flex flex-wrap items-baseline gap-3">
        <h2
          id="plan-heading"
          className="text-3xl font-black tracking-tight text-[color:var(--cd-ink)] sm:text-4xl"
          style={{ fontFamily: "var(--cd-font-heading)" }}
          lang={lang}
        >
          {lang === "hi" ? "कोर्स प्लान" : "Course plan"}
        </h2>
        <span className="text-sm font-semibold text-gray-600 sm:text-base">
          {pluralize(totalUnitCount, "unit", lang)},{" "}
          {pluralize(totalThemeCount, "theme", lang)},{" "}
          {pluralize(totalLectureCount, "lecture", lang)}
        </span>
      </div>

      {/* Desktop Snake Board (Hidden on mobile) */}
      <div className="hidden lg:block mt-8 space-y-16">
        {rows.map((row) => {
          return (
            <div key={row.rowIndex} className="relative">
              {/* Connector Curve on Right edge if row goes right and continues down */}
              {row.hasCurveToNext && row.curveSide === "right" && (
                <div
                  className="pointer-events-none absolute -right-6 top-5 h-44 w-12 rounded-r-3xl border-r-2 border-t-2 border-b-2 border-dashed border-gray-400"
                  aria-hidden="true"
                />
              )}

              {/* Connector Curve on Left edge if row goes left and continues down */}
              {row.hasCurveToNext && row.curveSide === "left" && (
                <div
                  className="pointer-events-none absolute -left-6 top-5 h-44 w-12 rounded-l-3xl border-l-2 border-t-2 border-b-2 border-dashed border-gray-400"
                  aria-hidden="true"
                />
              )}

              {/* Horizontal Dotted Connector Line passing through circles */}
              <div
                className="pointer-events-none absolute left-0 right-0 top-5 border-t-2 border-dashed border-gray-400 z-0"
                aria-hidden="true"
              />

              {/* Grid of 5 units (or units + Sun Node) */}
              <div className="relative z-10 grid grid-cols-5 gap-6 items-start">
                {/* If row has sun on the left (as in Row 2 of screenshot 4) */}
                {row.hasSun && row.sunSide === "left" && (
                  <div className="flex flex-col items-center justify-start pt-1 text-center">
                    {/* Sun with glowing halo */}
                    <div className="relative flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-[color:var(--cd-gold)] shadow-[0_0_28px_rgba(245,200,66,0.85)] flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-amber-400/80" />
                      </div>
                    </div>
                    {/* Goal label */}
                    <p
                      className="mt-3 text-lg font-black tracking-tight text-[color:var(--cd-ink)]"
                      style={{ fontFamily: "var(--cd-font-heading)" }}
                    >
                      {effectiveGoal}
                    </p>
                    {/* Cheering Kids */}
                    <div className="mt-1">
                      <CheeringKidsSvg className="h-14 w-auto" />
                    </div>
                  </div>
                )}

                {/* Units */}
                {row.units.map((unit) => {
                  const unitTitle = lang === "hi" && unit.titleHi ? unit.titleHi : unit.title
                  const metaLabel =
                    unit.lectureCount > 0
                      ? formatLecturesAndHours(unit.lectureCount, unit.hours, lang)
                      : pluralize(unit.themeCount, "theme", lang)

                  return (
                    <div key={unit.id} className="flex flex-col">
                      {/* Top circle number aligned with dotted line */}
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-900 bg-[color:var(--cd-cream-card)] font-black text-sm text-[color:var(--cd-ink)] shadow-xs">
                          {unit.numberStr}
                        </div>
                      </div>

                      {/* Unit Title */}
                      <h3
                        className="mt-3 text-2xl font-black tracking-tight text-[color:var(--cd-ink)] leading-tight"
                        style={{ fontFamily: "var(--cd-font-heading)" }}
                        lang={lang}
                      >
                        {unitTitle}
                      </h3>

                      {/* Tag pill + lecture/theme count */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {unit.tag ? (
                          <span className="rounded-full bg-[color:var(--cd-cream-dark)] px-2 py-0.5 text-[11px] font-extrabold text-[color:var(--cd-olive)] uppercase tracking-wide">
                            {unit.tag}
                          </span>
                        ) : null}
                        <span className="text-xs font-semibold text-gray-700">
                          {metaLabel}
                        </span>
                      </div>

                      {/* Olive date range */}
                      {unit.dateRange && (
                        <p className="mt-1 text-xs font-semibold text-[color:var(--cd-olive)]">
                          {unit.dateRange}
                        </p>
                      )}

                      {/* Themes List with hairline dividers */}
                      <div className="mt-4 divide-y divide-[color:var(--cd-cream-dark)] border-t border-[color:var(--cd-cream-dark)]">
                        {unit.themes.map((theme) => {
                          const isExpanded = !!expandedThemes[theme.id]
                          const themeTitle = lang === "hi" && theme.titleHi ? theme.titleHi : theme.title

                          return (
                            <div key={theme.id} className="py-2.5">
                              <button
                                type="button"
                                onClick={() => toggleTheme(theme.id)}
                                aria-expanded={isExpanded}
                                className="flex w-full items-center justify-between gap-1 text-left hover:opacity-80 transition-opacity"
                              >
                                <span className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                                  {themeTitle}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0 text-gray-500">
                                  {theme.lectureCount > 0 && (
                                    <span className="text-[11px] font-bold text-gray-700">
                                      {theme.lectureCount}
                                    </span>
                                  )}
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                    aria-hidden="true"
                                  />
                                </div>
                              </button>

                              {/* Accordion Subtopics */}
                              {isExpanded && theme.subtopics.length > 0 && (
                                <div className="mt-2 pl-1 text-[11px] leading-relaxed text-gray-800">
                                  {(lang === "hi" && theme.subtopicsHi?.length > 0
                                    ? theme.subtopicsHi
                                    : theme.subtopics
                                  ).join(" | ")}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* If row has sun on the right (for single row or odd row counts) */}
                {row.hasSun && row.sunSide === "right" && (
                  <div className="flex flex-col items-center justify-start pt-1 text-center">
                    <div className="relative flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-[color:var(--cd-gold)] shadow-[0_0_28px_rgba(245,200,66,0.85)] flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-amber-400/80" />
                      </div>
                    </div>
                    <p
                      className="mt-3 text-lg font-black tracking-tight text-[color:var(--cd-ink)]"
                      style={{ fontFamily: "var(--cd-font-heading)" }}
                    >
                      {effectiveGoal}
                    </p>
                    <div className="mt-1">
                      <CheeringKidsSvg className="h-14 w-auto" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile Plan (Single Vertical Column with Dotted line on the left) */}
      <div className="block lg:hidden mt-8 relative pl-6 border-l-2 border-dashed border-gray-400 space-y-8">
        {displayUnits.map((unit) => {
          const unitTitle = lang === "hi" && unit.titleHi ? unit.titleHi : unit.title
          const metaLabel =
            unit.lectureCount > 0
              ? formatLecturesAndHours(unit.lectureCount, unit.hours, lang)
              : pluralize(unit.themeCount, "theme", lang)

          return (
            <div key={unit.id} className="relative">
              {/* Circle number pinned to dotted line */}
              <div className="absolute -left-[37px] top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-900 bg-[color:var(--cd-cream-card)] font-black text-xs text-[color:var(--cd-ink)]">
                {unit.numberStr}
              </div>

              <div>
                <h3
                  className="text-xl font-black tracking-tight text-[color:var(--cd-ink)]"
                  style={{ fontFamily: "var(--cd-font-heading)" }}
                  lang={lang}
                >
                  {unitTitle}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {unit.tag ? (
                    <span className="rounded-full bg-[color:var(--cd-cream-dark)] px-2 py-0.5 text-[10px] font-extrabold text-[color:var(--cd-olive)] uppercase">
                      {unit.tag}
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold text-gray-700">
                    {metaLabel}
                  </span>
                </div>

                {unit.dateRange && (
                  <p className="mt-0.5 text-xs font-semibold text-[color:var(--cd-olive)]">
                    {unit.dateRange}
                  </p>
                )}

                <div className="mt-3 divide-y divide-[color:var(--cd-cream-dark)] border-t border-[color:var(--cd-cream-dark)]">
                  {unit.themes.map((theme) => {
                    const isExpanded = !!expandedThemes[theme.id]
                    const themeTitle = lang === "hi" && theme.titleHi ? theme.titleHi : theme.title

                    return (
                      <div key={theme.id} className="py-2">
                        <button
                          type="button"
                          onClick={() => toggleTheme(theme.id)}
                          aria-expanded={isExpanded}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <span className="text-xs font-bold text-gray-900">
                            {themeTitle}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 text-gray-500">
                            {theme.lectureCount > 0 && (
                              <span className="text-[11px] font-bold text-gray-700">
                                {theme.lectureCount}
                              </span>
                            )}
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              aria-hidden="true"
                            />
                          </div>
                        </button>

                        {isExpanded && theme.subtopics.length > 0 && (
                          <div className="mt-1.5 text-[11px] text-gray-600">
                            {(lang === "hi" && theme.subtopicsHi?.length > 0
                              ? theme.subtopicsHi
                              : theme.subtopics
                            ).join(" | ")}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

        {/* Bottom Sun Node on Mobile */}
        <div className="relative pt-4">
          <div className="absolute -left-[37px] top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--cd-gold)] shadow-[0_0_12px_rgba(245,200,66,0.8)]">
            <div className="h-4 w-4 rounded-full bg-amber-400" />
          </div>
          <div className="pl-2">
            <p
              className="text-base font-black text-[color:var(--cd-ink)]"
              style={{ fontFamily: "var(--cd-font-heading)" }}
            >
              {effectiveGoal}
            </p>
            <CheeringKidsSvg className="mt-1 h-12 w-auto" />
          </div>
        </div>
      </div>
    </section>
  )
}
