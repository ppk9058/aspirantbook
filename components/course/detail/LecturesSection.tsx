"use client"

import { useState } from "react"
import { ChevronDown, Lock, Play } from "lucide-react"
import type { Lang } from "@/lib/i18n/localized"
import type { DetailChapter, DetailCourse, DetailLesson, DetailUnit } from "./types"
import { fontStackFor } from "./theme"
import { formatIstDate, formatLectureTime } from "@/lib/courses/derive"

interface LecturesSectionProps {
  course: DetailCourse
  units?: DetailUnit[]
  chapters: DetailChapter[]
  lang: Lang
  isEnrolled: boolean
  onOpenLesson?: (lessonId: string) => void
}

function parseMonthAndDay(dateStr?: string | Date | null): { month: string; day: string } {
  if (!dateStr) return { month: "OCT", day: "19" }
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return { month: "OCT", day: "19" }
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Kolkata" }).toUpperCase()
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "Asia/Kolkata" })
    return { month, day }
  } catch {
    return { month: "OCT", day: "19" }
  }
}

function formatLectureDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "19 Oct"
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return "19 Oct"
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
  } catch {
    return "19 Oct"
  }
}

export function LecturesSection({
  course,
  units = [],
  chapters = [],
  lang,
  isEnrolled,
  onOpenLesson,
}: LecturesSectionProps) {
  const [activeUnitId, setActiveUnitId] = useState<string>(units[0]?.id || "")
  const [collapsedThemes, setCollapsedThemes] = useState<Record<string, boolean>>({})

  const toggleTheme = (themeId: string) => {
    setCollapsedThemes((prev) => ({ ...prev, [themeId]: !prev[themeId] }))
  }

  // Active unit
  const activeUnit = units.find((u) => u.id === activeUnitId) || units[0]
  const unitChapters = activeUnit ? chapters.filter((c) => c.unitId === activeUnit.id) : chapters

  if (units.length === 0 && chapters.length === 0) return null

  return (
    <section
      id="lectures"
      aria-labelledby="lectures-heading"
      className="scroll-mt-24 pt-8 pb-16"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      {/* Header */}
      <div>
        <h2
          id="lectures-heading"
          className="text-3xl font-black tracking-tight text-[color:var(--cd-ink)] sm:text-4xl"
          style={{ fontFamily: "var(--cd-font-heading)" }}
          lang={lang}
        >
          {lang === "hi" ? "लेक्चर्स" : "Lectures"}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-gray-600">
          {isEnrolled
            ? lang === "hi"
              ? "आपकी नामांकित कक्षाएं। देखने के लिए किसी भी लेक्चर पर क्लिक करें।"
              : "Your enrolled lectures. Click any lecture to start learning."
            : lang === "hi"
            ? "ये तब खुलते हैं जब आप कोर्स में शामिल होते हैं।"
            : "These open when you join the course."}
        </p>
      </div>

      {/* Unit Tabs (Card style, horizontally scrollable) */}
      <div
        role="tablist"
        aria-label="Course units"
        className="mt-6 flex items-stretch overflow-x-auto no-scrollbar border-b border-gray-400"
      >
        {units.map((unit) => {
          const isSelected = unit.id === (activeUnit?.id ?? "")
          const unitChaptersList = chapters.filter((c) => c.unitId === unit.id)
          const lecturesCount = unitChaptersList.flatMap((c) => c.lessons).length
          const metaText = lecturesCount > 0 ? `${lecturesCount} lectures` : `${unitChaptersList.length} themes`
          const title = lang === "hi" && unit.titleHi ? unit.titleHi : unit.title

          return (
            <button
              key={unit.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveUnitId(unit.id)}
              className={`flex min-h-[56px] min-w-[130px] flex-col justify-center rounded-t-xl px-4 py-2 text-left transition-all shrink-0 ${
                isSelected
                  ? "border-t-4 border-[color:var(--cd-gold)] bg-[color:var(--cd-cream-card)] -mb-[1px] border-l border-r border-gray-300"
                  : "bg-[color:var(--cd-cream-dark)]/40 hover:bg-[color:var(--cd-cream-dark)]/70 text-gray-700"
              }`}
            >
              <span
                className="text-sm font-black text-gray-950 truncate max-w-[150px]"
                style={{ fontFamily: "var(--cd-font-heading)" }}
                lang={lang}
              >
                {title}
              </span>
              <span className="text-[11px] font-semibold text-gray-600">
                {metaText}
              </span>
            </button>
          )
        })}
      </div>

      {/* Unit Lectures Panel */}
      <div className="rounded-b-2xl border-x border-b border-gray-300 bg-[color:var(--cd-cream-card)] p-6 shadow-xs">
        {unitChapters.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">
            {lang === "hi" ? "इस यूनिट के लिए कोई लेक्चर अभी निर्धारित नहीं है।" : "No lectures currently scheduled for this unit."}
          </p>
        ) : (
          <div className="space-y-8">
            {unitChapters.map((theme, themeIdx) => {
              const isCollapsed = !!collapsedThemes[theme.id]
              const themeNum = String(themeIdx + 1).padStart(2, "0")
              const themeTitle = lang === "hi" && theme.titleHi ? theme.titleHi : theme.title
              const lessons = theme.lessons || []

              // Compute theme dates
              const dates = lessons
                .map((l) => (l.scheduledAt ? new Date(l.scheduledAt) : null))
                .filter((d): d is Date => Boolean(d) && !Number.isNaN(d!.getTime()))
                .sort((a, b) => a.getTime() - b.getTime())

              const dateRangeStr =
                dates.length > 0
                  ? `${dates[0].getDate()} to ${dates[dates.length - 1].getDate()} ${dates[dates.length - 1].toLocaleDateString("en-US", { month: "short" })}`
                  : ""

              const metaInfo = [
                lessons.length > 0 ? `${lessons.length} lectures` : null,
                dateRangeStr,
              ].filter(Boolean).join(" | ")

              return (
                <div key={theme.id} className="relative">
                  {/* Theme Header with gold numbered circle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--cd-gold)] text-xs font-black text-[color:var(--cd-ink)] shadow-xs shrink-0">
                        {themeNum}
                      </div>
                      <h3
                        className="text-lg font-black tracking-tight text-gray-950 sm:text-xl"
                        style={{ fontFamily: "var(--cd-font-heading)" }}
                        lang={lang}
                      >
                        {themeTitle}
                      </h3>
                      {metaInfo && (
                        <span className="hidden sm:inline-block text-xs font-medium text-gray-600">
                          {metaInfo}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTheme(theme.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? `Expand ${theme.title}` : `Collapse ${theme.title}`}
                      className="p-1 text-gray-500 hover:text-black transition-colors"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isCollapsed ? "" : "rotate-180"
                        }`}
                      />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="mt-3 pl-10 space-y-4">
                      {/* Subtopics separated by vertical lines */}
                      {theme.subtopics && theme.subtopics.length > 0 && (
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {(lang === "hi" && theme.subtopicsHi?.length
                            ? theme.subtopicsHi
                            : theme.subtopics
                          ).join(" | ")}
                        </p>
                      )}

                      {/* Lectures list */}
                      {lessons.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          {lessons.map((lesson: DetailLesson) => {
                            const { month, day } = parseMonthAndDay(lesson.scheduledAt)
                            const dateLabel = formatLectureDate(lesson.scheduledAt)
                            const duration = lesson.durationText || `${lesson.duration || 90} minutes`
                            const statusText = lesson.status === "live" ? "Live" : "Recording ready"
                            const lessonTitle = lang === "hi" && lesson.titleHi ? lesson.titleHi : lesson.title

                            return (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--cd-cream-dark)] bg-white/70 p-3 shadow-2xs hover:bg-white transition-colors"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  {/* Calendar Tile: Dark header + big day number */}
                                  <div className="flex h-12 w-11 flex-col overflow-hidden rounded-lg border border-gray-800 text-center shadow-xs shrink-0">
                                    <div className="bg-gray-900 py-0.5 text-[9px] font-black tracking-wide text-white">
                                      {month}
                                    </div>
                                    <div className="flex flex-1 items-center justify-center bg-white text-base font-black text-gray-950">
                                      {day}
                                    </div>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p
                                        className="text-sm font-black text-gray-950 truncate"
                                        style={{ fontFamily: "var(--cd-font-heading)" }}
                                        lang={lang}
                                      >
                                        {lessonTitle}
                                      </p>
                                      {lesson.isTrial && (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                          {lang === "hi" ? "फ्री प्रीव्यू" : "Free Preview"}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-600">
                                      {lesson.scheduledAt ? (
                                        <span>{formatIstDate(lesson.scheduledAt)} · {formatLectureTime(lesson.scheduledAt)}</span>
                                      ) : (
                                        <span>{dateLabel}</span>
                                      )} • {duration} • <span className="font-medium text-emerald-800">{statusText}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Lock / Play CTA */}
                                <div className="shrink-0">
                                  {isEnrolled ? (
                                    <button
                                      type="button"
                                      onClick={() => onOpenLesson?.(lesson.id)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--cd-gold)] text-[color:var(--cd-ink)] shadow-xs hover:scale-105 transition-transform"
                                      aria-label={`Play ${lessonTitle}`}
                                    >
                                      <Play className="h-4 w-4 fill-current ml-0.5" />
                                    </button>
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center text-gray-400">
                                      <Lock className="h-4 w-4" aria-hidden="true" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No scheduled sessions in this theme yet.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
