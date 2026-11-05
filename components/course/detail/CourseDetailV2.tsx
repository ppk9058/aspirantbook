"use client"

import { useEffect, useMemo, useState } from "react"
import { Languages } from "lucide-react"
import type { Lang } from "@/lib/i18n/localized"
import type { CourseMetadataV2 } from "@/lib/courses/metadata-schema"
import { DEFAULT_SECTION_FLAGS, type SectionFlags } from "@/lib/courses/metadata-schema"
import { deriveCourseStats, deriveLateJoiner, formatIstDate } from "@/lib/courses/derive"
import { BRAND_NAME } from "@/lib/brand"
import { HeroSection } from "./HeroSection"
import { SubNav, type SubNavItem } from "./SubNav"
import { AboutSection } from "./AboutSection"
import { CoursePlanSection } from "./CoursePlanSection"
import { ExamSyllabusSection } from "./ExamSyllabusSection"
import { TeachersSection } from "./TeachersSection"
import { QuestionsSection } from "./QuestionsSection"
import { LecturesSection } from "./LecturesSection"
import { StickyCard, useEnrollActions } from "./StickyCard"
import { resolveCourseTheme, themeVariables, fontStackFor } from "./theme"
import type { DetailCourse, DetailFaq, DetailTeacher, RatingSummary, SyllabusPaperSummary, BadgeChip, LateJoinNote, HeroStat } from "./types"

const LANG_STORAGE_KEY = "cd_lang"

export interface CourseDetailV2Props {
  course: DetailCourse
  metadata: CourseMetadataV2
  sections?: Partial<SectionFlags> | null
  syllabus: { hasSyllabus: boolean; papers: SyllabusPaperSummary[] }
  ratingSummary?: RatingSummary | null
  teachers?: DetailTeacher[]
  faqs?: DetailFaq[]
  stats?: HeroStat[]
  badges?: BadgeChip[]
  lateJoinNote?: LateJoinNote | null
  goalLabel?: string
  goalLabelHi?: string | null
  pillTags?: string[]
  pillTagsHi?: string[]
  whatYouGet?: Array<{ en: string; hi?: string | null; icon?: string }>
  howItWorks?: Array<{ en: string; hi?: string | null }>
  isEnrolled?: boolean
  hasAccess?: boolean
  allowPurchases?: boolean
  shareUrl?: string
  nowIso?: string
}

export function CourseDetailV2(props: CourseDetailV2Props) {
  const {
    course,
    metadata,
    syllabus,
    ratingSummary,
    teachers = [],
    faqs = [],
    stats: propStats,
    badges: propBadges,
    lateJoinNote: propLateJoinNote,
    goalLabel: propGoalLabel,
    goalLabelHi: propGoalLabelHi,
    pillTags = [],
    pillTagsHi = [],
    whatYouGet = [],
    howItWorks = [],
    isEnrolled = false,
    hasAccess = false,
    allowPurchases = true,
    shareUrl = "",
    nowIso = new Date().toISOString(),
  } = props

  // Language switcher state
  const [lang, setLang] = useState<Lang>("en")
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY)
      if (stored === "hi" || stored === "en") setLang(stored)
    } catch {
      /* ignore */
    }
  }, [])

  const changeLang = (next: Lang) => {
    setLang(next)
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const flags: SectionFlags = { ...DEFAULT_SECTION_FLAGS, ...(props.sections || {}) }
  const { startTrial, buyNow, isProcessing } = useEnrollActions(course)

  // Derive stats if not explicitly passed
  const derivedCourseStats = useMemo(() => deriveCourseStats({ chapters: course.chapters }), [course.chapters])
  const derivedLate = useMemo(
    () => deriveLateJoiner({ chapters: course.chapters, now: new Date(nowIso) }),
    [course.chapters, nowIso]
  )

  const effectiveStats: HeroStat[] = useMemo(() => {
    if (propStats && propStats.length > 0) return propStats
    if (metadata.heroMetrics && metadata.heroMetrics.length > 0) {
      return metadata.heroMetrics.map((m) => ({
        value: m.value,
        valueHi: m.valueHi,
        caption: m.label,
        captionHi: m.labelHi,
      }))
    }
    // Fallback metrics: derived purely from real course data when no custom metrics are set
    const metrics: Array<{ value: string; valueHi?: string; caption: string; captionHi?: string; icon?: string }> = []
    if (metadata.firstClassDate || derivedCourseStats.firstClassDate) {
      const fc = metadata.firstClassDate || formatIstDate(derivedCourseStats.firstClassDate)
      metrics.push({ value: fc, valueHi: fc, caption: "first class", captionHi: "पहली कक्षा" })
    }
    if (metadata.scheduleText) {
      metrics.push({
        value: metadata.scheduleText,
        valueHi: metadata.scheduleTextHi || metadata.scheduleText,
        caption: "schedule",
        captionHi: "समय सारणी",
      })
    }
    if (metadata.validityText) {
      metrics.push({
        value: metadata.validityText,
        valueHi: metadata.validityTextHi || metadata.validityText,
        caption: metadata.validityNote || "course validity",
        captionHi: metadata.validityNoteHi || "कोर्स वैधता",
      })
    }
    if (derivedCourseStats.lectureCount > 0) {
      metrics.push({
        value: `${derivedCourseStats.lectureCount} lectures`,
        valueHi: `${derivedCourseStats.lectureCount} लेक्चर्स`,
        caption: `${derivedCourseStats.totalHours} hours of teaching`,
        captionHi: `${derivedCourseStats.totalHours} घंटे शिक्षण`,
      })
    }
    return metrics
  }, [propStats, metadata, derivedCourseStats])

  const effectiveLateJoin: LateJoinNote | null = useMemo(() => {
    if (propLateJoinNote) return propLateJoinNote
    if (metadata.lateJoinerTemplate) {
      return {
        enabled: true,
        label: "Joining late?",
        labelHi: "देर से जुड़ रहे हैं?",
        text: metadata.lateJoinerTemplate,
        textHi: metadata.lateJoinerTemplateHi,
      }
    }
    if (derivedLate.visible && derivedLate.count > 0) {
      return {
        enabled: true,
        label: "Joining late?",
        labelHi: "देर से जुड़ रहे हैं?",
        text: `The ${derivedLate.count} classes taught so far are kept as recordings, yours to watch from the day you join.`,
        textHi: `अब तक सिखाई गई ${derivedLate.count} कक्षाएं रिकॉर्डिंग के रूप में उपलब्ध हैं, जिन्हें आप जुड़ते ही देख सकते हैं।`,
      }
    }
    return null
  }, [propLateJoinNote, metadata, derivedLate])

  const effectiveBadges: BadgeChip[] = useMemo(() => {
    if (propBadges && propBadges.length > 0) return propBadges
    if (pillTags && pillTags.length > 0) {
      return pillTags.map((t, idx) => ({
        label: t,
        labelHi: pillTagsHi[idx] || t,
        variant: idx === 0 ? "outlined" : "filled",
      }))
    }
    return []
  }, [propBadges, pillTags, pillTagsHi])

  const effectiveGoal: string = String(propGoalLabel || (metadata as any)?.goalLabel || (metadata as any)?.targetText || course.technology || "")
  const effectiveGoalHi: string = String(propGoalLabelHi || (metadata as any)?.goalLabelHi || effectiveGoal)

  const effectiveWhatYouGet = useMemo(() => {
    if (whatYouGet && whatYouGet.length > 0) return whatYouGet
    if (metadata.whatYouGet && metadata.whatYouGet.length > 0) return metadata.whatYouGet
    if (metadata.aboutHighlights && metadata.aboutHighlights.length > 0) {
      return metadata.aboutHighlights.map((item: string, idx: number) => ({
        en: item,
        hi: metadata.aboutHighlightsHi?.[idx] || null,
      }))
    }
    return []
  }, [whatYouGet, metadata])

  const effectiveHowItWorks = useMemo(() => {
    if (howItWorks && howItWorks.length > 0) return howItWorks
    if (metadata.howItWorks && metadata.howItWorks.length > 0) return metadata.howItWorks
    return []
  }, [howItWorks, metadata])

  const theme = useMemo(() => resolveCourseTheme((metadata as any)?.theme), [metadata])
  const isFree = !course.isPremium && (!course.price || course.price === 0)
  const finalPrice = isFree ? 0 : Math.max(0, Math.round(course.price || 0))

  const primaryTeacher: DetailTeacher | null = teachers[0] || (metadata.instructor as any) || null

  const calendarLectures = useMemo(() => {
    return course.chapters.flatMap((ch) =>
      ch.lessons
        .filter((l) => l.scheduledAt)
        .map((l) => ({
          uid: l.id,
          title: l.title,
          start: l.scheduledAt as string,
          durationMinutes: l.duration ?? null,
          description: `${course.title} — ${ch.title}`,
        }))
    )
  }, [course.chapters, course.title])

  const showSyllabus = flags.syllabus && syllabus.hasSyllabus && syllabus.papers.length > 0
  const showPlan = flags.plan && (course.units?.length || 0) > 0 || course.chapters.length > 0
  const showTeachers = flags.teachers && teachers.length > 0
  const showQuestions = flags.questions && (faqs.length > 0 || (ratingSummary && ratingSummary.visible))
  const showLectures = flags.lectures && course.chapters.some((ch) => (ch.lessons?.length || 0) > 0)

  const configuredTabs: Array<{ id: string; label: string; labelHi?: string; enabled: boolean }> =
    Array.isArray((metadata as any)?.tabsConfig) && (metadata as any).tabsConfig.length > 0
      ? (metadata as any).tabsConfig
      : [
          { id: "about", label: "About", labelHi: "परिचय", enabled: true },
          { id: "plan", label: "Course plan", labelHi: "कोर्स प्लान", enabled: true },
          { id: "lectures", label: "Lectures", labelHi: "लेक्चर्स", enabled: true },
          { id: "syllabus", label: "Syllabus", labelHi: "सिलेबस", enabled: true },
          { id: "teachers", label: "Teachers", labelHi: "शिक्षक", enabled: true },
          { id: "questions", label: "Questions", labelHi: "सवाल", enabled: true },
        ]

  const navItems: SubNavItem[] = configuredTabs
    .filter((tab) => {
      if (!tab.enabled) return false
      if (tab.id === "about") return flags.about
      if (tab.id === "plan") return showPlan
      if (tab.id === "lectures") return showLectures
      if (tab.id === "syllabus") return showSyllabus
      if (tab.id === "teachers") return showTeachers
      if (tab.id === "questions") return showQuestions
      return true
    })
    .map((tab) => ({
      id: tab.id,
      label: tab.label,
      labelHi: tab.labelHi,
    }))

  const jumpToUnit = (unitId: string) => {
    const el = document.getElementById("plan")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const brandName = typeof metadata.brand === "string" && metadata.brand.trim() ? metadata.brand.trim() : BRAND_NAME

  return (
    <div
      data-testid="course-detail-v2"
      style={themeVariables(theme)}
      className="min-h-screen w-full bg-[color:var(--cd-cream)] text-[color:var(--cd-ink)] antialiased"
    >
      {/* Top Language Bar */}
      <div className="bg-[color:var(--cd-navy)] border-b border-white/10 px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-[color:var(--cd-gold)]">
            {brandName}
          </span>

          <div
            role="group"
            aria-label="Language selection"
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 p-0.5"
          >
            <Languages className="ml-2 h-3.5 w-3.5 text-white/70" aria-hidden="true" />
            <button
              type="button"
              onClick={() => changeLang("en")}
              aria-pressed={lang === "en"}
              className={`min-h-[28px] rounded-full px-3 text-xs font-extrabold transition-all ${
                lang === "en" ? "bg-[color:var(--cd-gold)] text-[color:var(--cd-ink)] shadow-2xs" : "text-white/80 hover:text-white"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => changeLang("hi")}
              aria-pressed={lang === "hi"}
              lang="hi"
              className={`min-h-[28px] rounded-full px-3 text-xs font-extrabold transition-all ${
                lang === "hi" ? "bg-[color:var(--cd-gold)] text-[color:var(--cd-ink)] shadow-2xs" : "text-white/80 hover:text-white"
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <HeroSection
        course={course}
        lang={lang}
        stats={effectiveStats}
        badges={effectiveBadges}
        pillTags={pillTags}
        teacher={primaryTeacher}
        lateJoinNote={effectiveLateJoin}
        goalLabel={effectiveGoal}
        goalLabelHi={effectiveGoalHi}
        hideIllustration={(metadata as any)?.hideIllustration ?? false}
        rightSlot={
          <div className="hidden lg:block lg:-mb-32 lg:translate-y-4 relative z-30">
            <StickyCard
              course={{
                ...course,
                enrollCtaLabel: (metadata as any)?.enrollCtaLabel || (course as any).enrollCtaLabel,
                enrollCtaLabelHi: (metadata as any)?.enrollCtaLabelHi || (course as any).enrollCtaLabelHi,
                enrollHelperText: (metadata as any)?.enrollHelperText || (course as any).enrollHelperText,
                enrollHelperTextHi: (metadata as any)?.enrollHelperTextHi || (course as any).enrollHelperTextHi,
              }}
              lang={lang}
              isEnrolled={isEnrolled}
              isFree={isFree}
              estimatedFinalPrice={finalPrice}
              isProcessing={isProcessing}
              buyNow={buyNow}
              startTrial={startTrial}
              thumbnailBadge={metadata.thumbnailBadge || course.technology || "Course"}
              disclaimer={metadata.enrollDisclaimer}
              lectures={calendarLectures}
              shareUrl={shareUrl}
            />
          </div>
        }
      />

      {/* Sticky Tab Bar */}
      <SubNav
        items={navItems}
        lang={lang}
        priceLabel={allowPurchases ? (isFree ? "FREE" : `₹${finalPrice.toLocaleString("en-IN")}`) : undefined}
        onEnroll={allowPurchases ? (isFree ? startTrial : buyNow) : undefined}
        enrollLabel={lang === "hi" ? "अभी जुड़ें" : "Enroll now"}
      />

      {/* Mobile Purchase Card (Rendered under SubNav on small screens) */}
      <div className="block lg:hidden px-4 pt-6 sm:px-6">
        <StickyCard
          course={{
            ...course,
            enrollCtaLabel: (metadata as any)?.enrollCtaLabel || (course as any).enrollCtaLabel,
            enrollCtaLabelHi: (metadata as any)?.enrollCtaLabelHi || (course as any).enrollCtaLabelHi,
            enrollHelperText: (metadata as any)?.enrollHelperText || (course as any).enrollHelperText,
            enrollHelperTextHi: (metadata as any)?.enrollHelperTextHi || (course as any).enrollHelperTextHi,
          }}
          lang={lang}
          isEnrolled={isEnrolled}
          isFree={isFree}
          estimatedFinalPrice={finalPrice}
          isProcessing={isProcessing}
          buyNow={buyNow}
          startTrial={startTrial}
          thumbnailBadge={metadata.thumbnailBadge || course.technology || "Course"}
          disclaimer={metadata.enrollDisclaimer}
          lectures={calendarLectures}
          shareUrl={shareUrl}
        />
      </div>

      {/* Main Content Sections on Cream Page */}
      <main className="mx-auto max-w-7xl px-4 pt-8 pb-36 sm:pb-40 lg:pb-16 space-y-12">
        {/* About Section */}
        {flags.about && (
          <AboutSection
            course={course}
            lang={lang}
            teacher={primaryTeacher}
            whatYouGet={effectiveWhatYouGet}
            howItWorks={effectiveHowItWorks}
          />
        )}

        {/* Course Plan Section */}
        {showPlan && (
          <CoursePlanSection
            lang={lang}
            units={course.units}
            chapters={course.chapters}
            goalLabel={effectiveGoal}
            goalLabelHi={effectiveGoalHi}
          />
        )}

        {/* Lecture By Lecture Section */}
        {showLectures && (
          <LecturesSection
            course={course}
            units={course.units}
            chapters={course.chapters}
            lang={lang}
            isEnrolled={isEnrolled}
            onOpenLesson={(lessonId) => {
              if (typeof window !== "undefined") {
                window.location.href = `/courses/${course.slug}/learn?lesson=${lessonId}`
              }
            }}
          />
        )}

        {/* Syllabus Section (optional per course) */}
        {showSyllabus && (
          <ExamSyllabusSection
            lang={lang}
            papers={syllabus.papers}
            courseCategory={course.technology}
            onJumpToUnit={jumpToUnit}
            onToggleLang={changeLang}
          />
        )}

        {/* Teachers Section */}
        {showTeachers && (
          <TeachersSection
            lang={lang}
            teachers={teachers}
          />
        )}

        {/* Questions Section */}
        {showQuestions && (
          <QuestionsSection
            lang={lang}
            faqs={faqs}
            ratingSummary={ratingSummary}
            courseTitle={course.title}
          />
        )}
      </main>

      {/* Fixed Bottom CTA bar for Phones (< 768px) */}
      {allowPurchases && (
        <div
          data-testid="mobile-bottom-cta-bar"
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)]/95 px-4 py-3 backdrop-blur-md lg:hidden shadow-lg"
          style={{ fontFamily: fontStackFor(lang) }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
              {lang === "hi" ? "कुल फीस" : "Total Fee"}
            </span>
            <span
              className="text-xl font-black text-[color:var(--cd-ink)]"
              style={{ fontFamily: "var(--cd-font-heading)" }}
            >
              {isFree ? "FREE" : `₹${finalPrice.toLocaleString("en-IN")}`}
            </span>
          </div>

          <button
            type="button"
            onClick={isFree || finalPrice <= 0 ? startTrial : buyNow}
            disabled={isProcessing}
            className="rounded-xl bg-[color:var(--cd-gold)] px-6 py-3 text-sm font-extrabold text-[color:var(--cd-ink)] shadow-md transition hover:brightness-105 disabled:opacity-60"
            style={{ fontFamily: "var(--cd-font-heading)" }}
          >
            {isProcessing ? "…" : isEnrolled ? "Go to course" : isFree ? "Start free" : (lang === "hi" ? "अभी जुड़ें" : "Enroll now")}
          </button>
        </div>
      )}
    </div>
  )
}
