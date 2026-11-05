"use client"

import React, { useMemo, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import { localized, type Lang } from "@/lib/i18n/localized"
import { pluralize } from "@/lib/i18n/pluralize"
import type { SyllabusPaperSummary } from "./types"
import { fontStackFor } from "./theme"

interface ExamSyllabusSectionProps {
  lang: Lang
  papers: SyllabusPaperSummary[]
  courseCategory?: string | null
  onJumpToUnit?: (unitId: string) => void
  onToggleLang?: (nextLang: Lang) => void
}

export function ExamSyllabusSection({
  lang,
  papers = [],
  courseCategory,
  onJumpToUnit,
  onToggleLang,
}: ExamSyllabusSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activePaperId, setActivePaperId] = useState<string>(papers[0]?.id || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"subject" | "mostAsked">("subject")
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const activePaper = useMemo(
    () => papers.find((p) => p.id === activePaperId) || papers[0],
    [papers, activePaperId]
  )

  const getSectionQuestions = (sec: any): number => {
    const q = Number(sec?.totalQuestions)
    return Number.isFinite(q) && q > 0 ? q : 0
  }

  const getPaperQuestions = (paper?: SyllabusPaperSummary | null): number => {
    if (!paper || !Array.isArray(paper.sections)) return 0
    return paper.sections.reduce((acc, s) => acc + getSectionQuestions(s), 0)
  }

  // Auto-generated sentence from real counts with exam name from course category
  const paperSummaries = papers
    .map((p) => {
      const qCount = getPaperQuestions(p)
      const title = localized(p, "title", lang) || p.title
      if (qCount <= 0) return null
      return lang === "hi"
        ? `${title} में ${pluralize(qCount, "question", "hi")}`
        : `${title} has had ${pluralize(qCount, "question", "en")}`
    })
    .filter((s): s is string => Boolean(s))

  const examContext = courseCategory?.trim()
    ? (lang === "hi" ? `${courseCategory} परीक्षाओं में` : `Across recent ${courseCategory} exams`)
    : (lang === "hi" ? "हाल की परीक्षाओं में" : "Across recent exams")

  const infoBoxText =
    paperSummaries.length > 0
      ? lang === "hi"
        ? `${examContext}, ${paperSummaries.join(", ")} पूछे गए हैं।`
        : `${examContext}, ${paperSummaries.join(", ")}, fully mapped to course units below.`
      : lang === "hi"
      ? `विस्तृत परीक्षा पाठ्यक्रम और मुख्य विषय नीचे दिए गए हैं।`
      : `Detailed syllabus topic breakdown mapped to course units below.`

  if (papers.length === 0 || !activePaper) return null

  // Filter sections by search and exclude placeholder/empty sections
  const validSections = (activePaper.sections || []).filter(
    (sec) => sec.title && sec.title.trim() !== "" && sec.title.trim().toLowerCase() !== "new syllabus section"
  )

  const filteredSections = validSections.filter((sec) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const nameMatch = sec.title.toLowerCase().includes(q) || (sec.titleHi || "").toLowerCase().includes(q)
    const topicMatch =
      (sec.subtopics || []).some((t) => t.toLowerCase().includes(q)) ||
      (sec.subtopicsHi || []).some((t) => t.toLowerCase().includes(q))
    return nameMatch || topicMatch
  })

  // Order sections
  const displaySections =
    viewMode === "mostAsked"
      ? [...filteredSections].sort((a, b) => getSectionQuestions(b) - getSectionQuestions(a))
      : filteredSections

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    displaySections.forEach((s) => {
      next[s.id] = true
    })
    setExpandedSections(next)
  }

  return (
    <section
      id="syllabus"
      aria-labelledby="syllabus-heading"
      className="scroll-mt-24 pt-8 pb-16"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      {/* Header with Hide/Show Toggle */}
      <div className="flex items-center justify-between">
        <h2
          id="syllabus-heading"
          className="text-3xl font-black tracking-tight text-[color:var(--cd-ink)] sm:text-4xl"
          style={{ fontFamily: "var(--cd-font-heading)" }}
          lang={lang}
        >
          {lang === "hi" ? "सिलेबस" : "Syllabus"}
        </h2>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] px-3.5 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-white transition-colors"
        >
          <span>{isOpen ? (lang === "hi" ? "सिलेबस छुपाएं" : "Hide syllabus") : (lang === "hi" ? "सिलेबस दिखाएं" : "Show syllabus")}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 space-y-6">
          {/* Info Box (Cream-dark) */}
          <div className="rounded-2xl border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-dark)]/70 p-4 sm:p-5 text-xs sm:text-sm text-gray-900 font-medium leading-relaxed">
            {infoBoxText}
          </div>

          {/* Paper Tabs + Language control */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-400">
            {/* Paper Tabs */}
            <div
              role="tablist"
              aria-label="Syllabus papers"
              className="flex items-stretch overflow-x-auto no-scrollbar"
            >
              {papers.map((paper) => {
                const isSelected = paper.id === activePaper.id
                const title = localized(paper, "title", lang) || paper.title
                const questionsCount = getPaperQuestions(paper)
                const tabLabel = questionsCount > 0 ? `${title} – ${pluralize(questionsCount, "question", lang)}` : title

                return (
                  <button
                    key={paper.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActivePaperId(paper.id)}
                    className={`flex min-h-[48px] items-center rounded-t-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all shrink-0 ${
                      isSelected
                        ? "border-t-4 border-[color:var(--cd-gold)] bg-[color:var(--cd-cream-card)] -mb-[1px] border-l border-r border-gray-300 text-gray-950 font-black"
                        : "bg-[color:var(--cd-cream-dark)]/40 hover:bg-[color:var(--cd-cream-dark)]/70 text-gray-700"
                    }`}
                  >
                    {tabLabel}
                  </button>
                )
              })}
            </div>

            {/* Language Segmented Control */}
            {onToggleLang && (
              <div className="inline-flex items-center rounded-full border border-gray-300 bg-white p-0.5 shadow-2xs mb-2">
                <button
                  type="button"
                  onClick={() => onToggleLang("en")}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    lang === "en" ? "bg-[color:var(--cd-olive)] text-white" : "text-gray-700"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLang("hi")}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    lang === "hi" ? "bg-[color:var(--cd-olive)] text-white" : "text-gray-700"
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            )}
          </div>

          {/* Main Paper Content Panel */}
          <div className="rounded-b-2xl border-x border-b border-gray-300 bg-[color:var(--cd-cream-card)] p-6 shadow-xs">
            {/* Search + Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-[color:var(--cd-cream-dark)]">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "hi" ? "पाठ्यक्रम और उसके प्रश्नों में एक विषय खोजें" : "Find a topic in the syllabus and its questions"}
                  className="w-full rounded-xl border border-[color:var(--cd-cream-dark)] bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-gray-900 shadow-2xs focus:border-[color:var(--cd-gold)] focus:outline-none"
                />
              </div>

              {/* Segmented Mode Toggle: By subject | Most asked */}
              <div className="inline-flex self-start sm:self-auto rounded-xl border border-[color:var(--cd-cream-dark)] bg-white/70 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("subject")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "subject" ? "bg-[color:var(--cd-olive)] text-white" : "text-gray-700 hover:text-black"
                  }`}
                >
                  {lang === "hi" ? "विषय अनुसार" : "By subject"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("mostAsked")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "mostAsked" ? "bg-[color:var(--cd-olive)] text-white" : "text-gray-700 hover:text-black"
                  }`}
                >
                  {lang === "hi" ? "सर्वाधिक पूछे गए" : "Most asked"}
                </button>
              </div>
            </div>

            {/* Paper Details Row */}
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h3
                  className="text-xl font-black text-gray-950 sm:text-2xl"
                  style={{ fontFamily: "var(--cd-font-heading)" }}
                  lang={lang}
                >
                  {localized(activePaper, "title", lang) || activePaper.title}
                </h3>
                {(() => {
                  const paperQuestions = getPaperQuestions(activePaper)
                  const durationHrs = Number(activePaper.durationMinutes) > 0 ? Math.round(Number(activePaper.durationMinutes) / 60) : 0
                  const marksNum = Number(activePaper.marks) > 0 ? Number(activePaper.marks) : 0
                  const parts: string[] = []
                  if (marksNum > 0) parts.push(`${marksNum} ${lang === "hi" ? "अंक" : "marks"}`)
                  if (durationHrs > 0) parts.push(pluralize(durationHrs, "hour", lang))
                  if (paperQuestions > 0) {
                    parts.push(lang === "hi" ? `विगत प्रश्नपत्रों के ${paperQuestions} प्रश्न` : `${paperQuestions} questions since recent papers`)
                  }
                  return parts.length > 0 ? (
                    <p className="mt-1 text-xs text-gray-600">
                      {parts.join(", ")}
                    </p>
                  ) : null
                })()}
              </div>

              {/* Legend & Show all button */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-xs bg-[color:var(--cd-gold)] inline-block" />
                    <span>Asked</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-xs bg-[color:var(--cd-olive)] inline-block" />
                    <span>Asked 2+ times</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={expandAll}
                  className="rounded-lg border border-[color:var(--cd-cream-dark)] bg-white px-3 py-1 text-xs font-bold text-gray-800 shadow-2xs hover:bg-gray-50"
                >
                  {lang === "hi" ? "सभी अनुभाग दिखाएं" : "Show all sections"}
                </button>
              </div>
            </div>

            {/* Intro Quote */}
            {activePaper.introText && (
              <blockquote className="mt-4 border-l-4 border-[color:var(--cd-olive)] bg-[color:var(--cd-cream)]/50 py-2.5 pl-4 pr-3 text-xs italic text-gray-700">
                {localized(activePaper, "introText", lang) || activePaper.introText}
              </blockquote>
            )}

            {/* Section Rows */}
            <div className="mt-6 space-y-4">
              {displaySections.map((section) => {
                const isExpanded = !!expandedSections[section.id]
                const sectionTitle = localized(section, "title", lang) || section.title
                const questionsCount = getSectionQuestions(section)

                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-[color:var(--cd-cream-dark)] bg-white overflow-hidden shadow-2xs"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between p-4">
                      {/* Left: Gold bar + Section Name + Sparkline */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Gold Left Bar */}
                        <div className="h-8 w-1.5 rounded-full bg-[color:var(--cd-gold)] shrink-0" />

                        <div className="min-w-0">
                          <p
                            className="text-sm sm:text-base font-black text-gray-950 truncate"
                            style={{ fontFamily: "var(--cd-font-heading)" }}
                            lang={lang}
                          >
                            {sectionTitle}
                          </p>

                          {/* Sparkline of bars if real PYQs exist */}
                          {questionsCount > 0 && section.byYear && section.byYear.length > 0 ? (
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className="flex items-end gap-1 h-4">
                                {section.byYear.map((yr, idx) => (
                                  <div
                                    key={idx}
                                    title={`${yr.year}: ${yr.count} questions`}
                                    className={`w-1.5 rounded-t-xs ${
                                      yr.count >= 2
                                        ? "bg-[color:var(--cd-olive)] h-3.5"
                                        : yr.count === 1
                                        ? "bg-[color:var(--cd-gold)] h-2"
                                        : "bg-gray-200 h-1"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] text-gray-600 font-semibold">
                                {pluralize(questionsCount, "question", lang)}
                              </span>
                            </div>
                          ) : questionsCount > 0 ? (
                            <span className="text-[11px] text-gray-600 font-semibold">
                              {pluralize(questionsCount, "question", lang)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-medium">
                              {lang === "hi" ? "पाठ्यक्रम विषय" : "Syllabus topic"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: In the course pill + expand chevron */}
                      <div className="flex items-center gap-3 shrink-0">
                        {section.unitId && onJumpToUnit && (
                          <button
                            type="button"
                            onClick={() => onJumpToUnit(section.unitId!)}
                            className="hidden sm:inline-flex items-center rounded-full bg-[color:var(--cd-cream-dark)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--cd-olive)] hover:bg-amber-200 transition-colors"
                          >
                            In the course [{section.unitTitle || "Unit"}]
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Collapse section ${section.title}` : `Expand section ${section.title}`}
                          className="p-1 text-gray-500 hover:text-black transition-colors"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Topics & PYQ subtopics */}
                    {isExpanded && (
                      <div className="border-t border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)]/40 p-4 text-xs text-gray-700 space-y-2">
                        {section.subtopics && section.subtopics.length > 0 ? (
                          <div>
                            <span className="font-bold text-gray-900 block mb-1">Topics covered:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(lang === "hi" && section.subtopicsHi?.length
                                ? section.subtopicsHi
                                : section.subtopics
                              ).map((st, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="rounded-md border border-[color:var(--cd-cream-dark)] bg-white px-2 py-0.5 text-[11px] text-gray-800"
                                >
                                  {st}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No specific subtopics mapped.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
