"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Layers,
  BookOpen,
  DollarSign,
  Users,
  Palette,
  Eye,
  Sliders,
  HelpCircle,
  Upload,
  FileText,
  Video,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
  RefreshCw,
} from "lucide-react"
import { COURSE_TEMPLATES, BLANK_TEMPLATE } from "@/lib/courses/templates"
import { EXAM_CATEGORIES, EXAM_CATEGORY_GROUPS, isKnownExamCategory } from "@/lib/courses/categories"
import { COURSE_LANGUAGES, DEFAULT_COURSE_LANGUAGE } from "@/lib/courses/languages"
import { DEFAULT_THEME_TOKENS, type CourseThemeTokens } from "@/components/course/detail/theme"
import { DEFAULT_TABS, type TabConfigItem } from "./studio/TabsTab"
import { BRAND_NAME } from "@/lib/brand"
import { IconPicker } from "./studio/IconPicker"
import { CourseDetailV2 } from "@/components/course/detail/CourseDetailV2"
import { PreviewErrorBoundary } from "@/components/course/detail/PreviewErrorBoundary"
import { buildCourseDetailViewModel } from "@/lib/courses/view-model"
import { computeContrastRatio, hasContrastWarning } from "@/lib/courses/contrast"

export interface WizardTeacher {
  id: string
  name: string
  nameHi?: string
  role: string
  roleHi?: string
  photo?: string
  bio?: string
  bioHi?: string
  credentials: Array<{ label: string; labelHi?: string }>
  isPrimary: boolean
}

export interface WizardLecture {
  id: string
  title: string
  titleHi?: string
  date?: string
  time?: string
  durationMin: number
  status: "upcoming" | "live" | "recording_ready"
  videoSourceType: "add_later" | "youtube" | "vimeo" | "hls" | "upload"
  videoUrl?: string
  isTrial: boolean
  attachmentName?: string
  attachmentUrl?: string
}

export interface WizardTheme {
  id: string
  title: string
  titleHi?: string
  subtopics: string[]
  subtopicsHi?: string[]
  lectures: WizardLecture[]
}

export interface WizardUnit {
  id: string
  number: number
  title: string
  titleHi?: string
  tag: string
  tagHi?: string
  dateRange?: string
  themes: WizardTheme[]
}

export interface WizardSyllabusSection {
  id: string
  title: string
  titleHi?: string
  subtopics: string[]
  unitIndex?: number
  pyqSubject?: string
  pyqTopic?: string
}

export interface WizardSyllabusPaper {
  id: string
  key: string
  title: string
  titleHi?: string
  marks?: number
  durationMinutes?: number
  introQuote?: string
  sections: WizardSyllabusSection[]
}

export function CourseCreationWizard() {
  const router = useRouter()

  // Stepper State: 1: Template, 2: Basics, 3: Pricing, 4: Teachers, 5: Hero & About, 6: Plan, 7: Syllabus, 8: Tabs/Theme/FAQ, 9: Review
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank")

  // Step A: Basics
  const [category, setCategory] = useState<string>("UPSC")
  const [customCategory, setCustomCategory] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [titleHi, setTitleHi] = useState<string>("")
  const [subtitle, setSubtitle] = useState<string>("")
  const [subtitleHi, setSubtitleHi] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [descriptionHi, setDescriptionHi] = useState<string>("")
  const [slug, setSlug] = useState<string>("")
  const [isSlugCustomized, setIsSlugCustomized] = useState<boolean>(false)
  const [languageMode, setLanguageMode] = useState<string>("Bilingual")
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT")
  const [brandName, setBrandName] = useState<string>("")
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
  const [thumbnailAlt, setThumbnailAlt] = useState<string>("")
  const [heroBackground, setHeroBackground] = useState<string>("")
  const [hideIllustration, setHideIllustration] = useState<boolean>(false)

  // Step B: Pricing
  const [isFree, setIsFree] = useState<boolean>(false)
  const [price, setPrice] = useState<number>(999)
  const [mrp, setMrp] = useState<number>(1999)
  const [currency, setCurrency] = useState<string>("INR")
  const [ctaLabel, setCtaLabel] = useState<string>("Enroll now")
  const [ctaLabelHi, setCtaLabelHi] = useState<string>("अभी प्रवेश लें")
  const [ctaHelperText, setCtaHelperText] = useState<string>("")
  const [ctaHelperTextHi, setCtaHelperTextHi] = useState<string>("")
  const [offerEndDate, setOfferEndDate] = useState<string>("")

  // Step C: Teachers
  const [teachers, setTeachers] = useState<WizardTeacher[]>([])
  const [reusableLibraryTeachers, setReusableLibraryTeachers] = useState<WizardTeacher[]>([
    {
      id: "lib-1",
      name: "Dr. Vikramaditya Rathore",
      nameHi: "डॉ. विक्रमादित्य राठौड़",
      role: "Polity & Governance Expert",
      roleHi: "राजव्यवस्था एवं शासन विशेषज्ञ",
      bio: "14+ years mentoring civil services aspirants.",
      credentials: [{ label: "14+ Yrs Mentorship" }, { label: "Ph.D Public Admin" }],
      isPrimary: true,
    },
    {
      id: "lib-2",
      name: "Sneha Sharma",
      nameHi: "स्नेहा शर्मा",
      role: "Quantitative Aptitude Faculty",
      roleHi: "गणितीय अभियोग्यता विशेषज्ञ",
      bio: "Top Educator with 7+ years of exam coaching.",
      credentials: [{ label: "AIR 14" }, { label: "7+ Yrs Teaching" }],
      isPrimary: false,
    },
    {
      id: "lib-3",
      name: "Amit Sen",
      nameHi: "अमित सेन",
      role: "Railways & SSC Specialist",
      roleHi: "रेलवे एवं एसएससी विशेषज्ञ",
      bio: "Mentored over 15,000 successful candidates.",
      credentials: [{ label: "9+ Yrs Coaching" }],
      isPrimary: false,
    },
  ])

  // Step D: Hero & About
  const [goalLabel, setGoalLabel] = useState<string>("")
  const [goalLabelHi, setGoalLabelHi] = useState<string>("")
  const [stats, setStats] = useState<Array<{ value: string; valueHi?: string; caption: string; captionHi?: string; icon?: string }>>([])
  const [badges, setBadges] = useState<Array<{ label: string; labelHi?: string; variant: "outlined" | "filled" }>>([])
  const [lateJoinEnabled, setLateJoinEnabled] = useState<boolean>(false)
  const [lateJoinText, setLateJoinText] = useState<string>("")
  const [lateJoinTextHi, setLateJoinTextHi] = useState<string>("")
  const [whatYouGet, setWhatYouGet] = useState<Array<{ en: string; hi?: string; icon?: string }>>([])
  const [howItWorks, setHowItWorks] = useState<Array<{ en: string; hi?: string }>>([])

  // Step E: Course Plan (Units -> Themes -> Lectures)
  const [units, setUnits] = useState<WizardUnit[]>([])
  const [scheduleGenDays, setScheduleGenDays] = useState<string>("mon-fri")
  const [scheduleGenTime, setScheduleGenTime] = useState<string>("19:00")
  const [scheduleGenWeeks, setScheduleGenWeeks] = useState<number>(4)
  const [scheduleGenStartDate, setScheduleGenStartDate] = useState<string>("2026-11-10")
  const [showScheduleGen, setShowScheduleGen] = useState<boolean>(false)
  const [bulkPlanText, setBulkPlanText] = useState<string>("")
  const [showBulkPlan, setShowBulkPlan] = useState<boolean>(false)

  // Step F: Syllabus (Optional)
  const [syllabusEnabled, setSyllabusEnabled] = useState<boolean>(false)
  const [syllabusPapers, setSyllabusPapers] = useState<WizardSyllabusPaper[]>([])
  const [pyqTaxonomy, setPyqTaxonomy] = useState<Record<string, Record<string, string[]>>>({})

  // Step G: Tabs, Theme, FAQ
  const [tabsConfig, setTabsConfig] = useState<TabConfigItem[]>(DEFAULT_TABS)
  const [themeTokens, setThemeTokens] = useState<CourseThemeTokens>(DEFAULT_THEME_TOKENS)
  const [faqs, setFaqs] = useState<Array<{ question: string; questionHi?: string; answer: string; answerHi?: string }>>([])

  // Step H: Completeness & Submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showLivePreviewModal, setShowLivePreviewModal] = useState<boolean>(false)
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop")

  // Auto slug generation from title
  useEffect(() => {
    if (!isSlugCustomized && title) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      setSlug(generated)
    }
  }, [title, isSlugCustomized])

  // Load PYQ Taxonomy on mount
  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const res = await fetch("/api/admin/courses/pyq-taxonomy")
        const data = await res.json()
        if (data.success && data.taxonomy) {
          setPyqTaxonomy(data.taxonomy)
        }
      } catch (e) {
        // Fallback gracefully
      }
    }
    loadTaxonomy()
  }, [])

  // Auto-calculated Discount %
  const discountPercent = useMemo(() => {
    if (isFree) return 100
    if (mrp > 0 && mrp > price) {
      return Math.round(((mrp - price) / mrp) * 100)
    }
    return 0
  }, [isFree, price, mrp])

  // Load template into wizard
  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const match: any = COURSE_TEMPLATES.find((t) => t.id === templateId)?.template || BLANK_TEMPLATE

    setTitle(match.title || "")
    setTitleHi(match.titleHi || "")
    setSubtitle(match.subtitle || "")
    setSubtitleHi(match.subtitleHi || "")
    setDescription(match.description || "")
    setDescriptionHi(match.descriptionHi || "")
    setSlug(match.slug || "")
    setIsSlugCustomized(Boolean(match.slug))
    setCategory(match.technology || "General")
    setLanguageMode(match.language || "Bilingual")
    setStatus(match.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")
    setPrice(match.price || 0)
    setMrp(match.mrp || 0)
    setIsFree(templateId === "blank" ? false : !match.price)
    setCtaLabel(match.enrollCtaLabel || "Enroll now")
    setCtaLabelHi(match.enrollCtaLabelHi || "अभी प्रवेश लें")
    setCtaHelperText(match.enrollHelperText || "")
    setCtaHelperTextHi(match.enrollHelperTextHi || "")
    setGoalLabel(match.goalLabel || "")
    setGoalLabelHi(match.goalLabelHi || "")
    setBrandName(match.brand || "")
    setThumbnailUrl(match.thumbnailUrl || "")

    if (match.theme) {
      setThemeTokens(match.theme as CourseThemeTokens)
    }

    if (Array.isArray(match.teachers)) {
      setTeachers(
        match.teachers.map((t: any) => ({
          id: t.id || Math.random().toString(36).substring(2, 7),
          name: t.name,
          nameHi: t.nameHi,
          role: t.role || "Faculty",
          roleHi: t.roleHi,
          photo: t.photo || t.avatar,
          bio: t.bio,
          bioHi: t.bioHi,
          credentials: Array.isArray(t.credentials)
            ? t.credentials.map((c: any) => (typeof c === "string" ? { label: c } : c))
            : [],
          isPrimary: Boolean(t.isPrimary),
        }))
      )
    } else {
      setTeachers([])
    }

    if (Array.isArray(match.stats)) {
      setStats(
        match.stats.map((s: any) => ({
          value: s.value,
          valueHi: s.valueHi,
          caption: s.caption,
          captionHi: s.captionHi,
          icon: s.icon,
        }))
      )
    } else {
      setStats([])
    }

    if (Array.isArray(match.badges)) {
      setBadges(match.badges)
    } else {
      setBadges([])
    }

    if (match.whatYouGet && Array.isArray(match.whatYouGet)) {
      setWhatYouGet(
        match.whatYouGet.map((w: any) => ({
          en: w.text || w.en || "",
          hi: w.textHi || w.hi || "",
          icon: w.icon,
        }))
      )
    } else {
      setWhatYouGet([])
    }

    if (match.howItWorks && Array.isArray(match.howItWorks)) {
      setHowItWorks(
        match.howItWorks.map((h: any) => ({
          en: h.text || h.en || "",
          hi: h.textHi || h.hi || "",
        }))
      )
    } else {
      setHowItWorks([])
    }

    if (match.lateJoinNote) {
      setLateJoinEnabled(Boolean(match.lateJoinNote.enabled))
      setLateJoinText(match.lateJoinNote.text || "")
      setLateJoinTextHi(match.lateJoinNote.textHi || "")
    }

    // Units
    if (Array.isArray(match.units)) {
      setUnits(
        match.units.map((u: any, idx: number) => ({
          id: `u-${idx + 1}`,
          number: u.number || idx + 1,
          title: u.title,
          titleHi: u.titleHi,
          tag: u.tag || "",
          tagHi: u.tagHi || null,
          dateRange: u.dateRange,
          themes: Array.isArray(u.themes)
            ? u.themes.map((th: any, tIdx: number) => ({
                id: `th-${idx + 1}-${tIdx + 1}`,
                title: th.title,
                titleHi: th.titleHi,
                subtopics: Array.isArray(th.subtopics) ? th.subtopics : [],
                subtopicsHi: Array.isArray(th.subtopicsHi) ? th.subtopicsHi : [],
                lectures: Array.isArray(th.lectures)
                  ? th.lectures.map((l: any, lIdx: number) => ({
                      id: `l-${idx + 1}-${tIdx + 1}-${lIdx + 1}`,
                      title: l.title,
                      titleHi: l.titleHi,
                      date: l.date,
                      durationMin: l.durationMin || 60,
                      status: l.status || "upcoming",
                      videoSourceType: "add_later",
                      isTrial: Boolean(l.isTrial),
                    }))
                  : [],
              }))
            : [],
        }))
      )
    } else {
      setUnits([])
    }

    // Syllabus
    if (match.syllabus && match.syllabus.enabled && Array.isArray(match.syllabus.papers)) {
      setSyllabusEnabled(true)
      setSyllabusPapers(
        match.syllabus.papers.map((p: any, idx: number) => ({
          id: `p-${idx + 1}`,
          key: p.key || `PAPER_${idx + 1}`,
          title: p.title,
          titleHi: p.titleHi,
          marks: p.marks,
          durationMinutes: p.durationMinutes,
          introQuote: p.introQuote || p.introText,
          sections: Array.isArray(p.sections)
            ? p.sections.map((sec: any, sIdx: number) => ({
                id: `sec-${idx + 1}-${sIdx + 1}`,
                title: sec.title,
                titleHi: sec.titleHi,
                subtopics: Array.isArray(sec.subtopics) ? sec.subtopics : [],
                unitIndex: sec.unitIndex,
                pyqSubject: sec.pyqSubject,
                pyqTopic: sec.pyqTopic,
              }))
            : [],
        }))
      )
    } else {
      setSyllabusEnabled(false)
      setSyllabusPapers([])
    }

    // FAQs
    if (Array.isArray(match.faqs)) {
      setFaqs(
        match.faqs.map((f: any) => ({
          question: f.q || f.question || "",
          questionHi: f.qHi || f.questionHi || "",
          answer: f.a || f.answer || "",
          answerHi: f.aHi || f.answerHi || "",
        }))
      )
    } else {
      setFaqs([])
    }
  }

  // Generate SVG Cover Fallback
  const handleGenerateCover = () => {
    const courseTitle = title.trim() || "Course Cover"
    const bg = themeTokens.navy || "#1B1F4A"
    const gold = themeTokens.gold || "#F5C842"
    const cream = themeTokens.cream || "#F0EAD9"

    // Clean SVG with 16:10 aspect ratio (1600x1000)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${bg}" />
            <stop offset="100%" stop-color="#0B0F2A" />
          </linearGradient>
        </defs>
        <rect width="1600" height="1000" fill="url(#g)" />
        <circle cx="1400" cy="200" r="300" fill="${gold}" opacity="0.15" />
        <circle cx="200" cy="800" r="250" fill="${gold}" opacity="0.1" />
        <rect x="120" y="140" width="120" height="8" rx="4" fill="${gold}" />
        <text x="120" y="240" fill="${gold}" font-family="sans-serif" font-size="32" font-weight="900" letter-spacing="4">
          ${(brandName || BRAND_NAME).toUpperCase()} • ${(category || "COURSE").toUpperCase()}
        </text>
        <text x="120" y="440" fill="${cream}" font-family="sans-serif" font-size="76" font-weight="900" width="1360">
          ${courseTitle.length > 50 ? courseTitle.substring(0, 48) + "..." : courseTitle}
        </text>
        <text x="120" y="550" fill="#CBD5E1" font-family="sans-serif" font-size="36" font-weight="500">
          ${subtitle ? (subtitle.length > 70 ? subtitle.substring(0, 68) + "..." : subtitle) : "Structured comprehensive curriculum & interactive study resources"}
        </text>
        <rect x="120" y="760" width="360" height="70" rx="20" fill="${gold}" />
        <text x="300" y="805" fill="#1B1F4A" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle">
          ENROLL NOW
        </text>
      </svg>
    `.trim()

    const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    setThumbnailUrl(encoded)
    if (!thumbnailAlt) setThumbnailAlt(`${courseTitle} Course Cover`)
  }

  // Schedule Generator
  const handleRunScheduleGenerator = () => {
    if (!scheduleGenStartDate || scheduleGenWeeks <= 0) return
    const startDate = new Date(scheduleGenStartDate)
    const [hours, minutes] = scheduleGenTime.split(":").map(Number)
    startDate.setHours(hours || 19, minutes || 0, 0, 0)

    const isMonFri = scheduleGenDays === "mon-fri"
    const totalDays = scheduleGenWeeks * 7
    const generatedLectures: WizardLecture[] = []
    let lectureNumber = 1

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const cur = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      const dayOfWeek = cur.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
      if (isMonFri && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue // Skip weekends for mon-fri schedule
      }

      const dateStr = cur.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })
      generatedLectures.push({
        id: `gen-lec-${lectureNumber}`,
        title: `Lecture ${lectureNumber} — Class Session`,
        titleHi: `व्याख्यान ${lectureNumber}`,
        date: dateStr,
        time: `${cur.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })} IST`,
        durationMin: 90,
        status: cur.getTime() < Date.now() ? "recording_ready" : "upcoming",
        videoSourceType: "add_later",
        isTrial: lectureNumber === 1,
      })
      lectureNumber++
    }

    // Attach to first theme or create a default unit
    if (units.length === 0) {
      setUnits([
        {
          id: "u-1",
          number: 1,
          title: "Unit 1 — Core Curriculum",
          titleHi: "इकाई 1",
          tag: "Core",
          themes: [
            {
              id: "th-1-1",
              title: "Theme 1 — Foundation Sessions",
              subtopics: ["Class Lectures", "Live Discussions"],
              lectures: generatedLectures,
            },
          ],
        },
      ])
    } else {
      const next = [...units]
      if (next[0].themes.length === 0) {
        next[0].themes.push({
          id: "th-auto",
          title: "Theme 1 — Schedule Slots",
          subtopics: ["Lectures"],
          lectures: generatedLectures,
        })
      } else {
        next[0].themes[0].lectures = [...next[0].themes[0].lectures, ...generatedLectures]
      }
      setUnits(next)
    }

    setShowScheduleGen(false)
  }

  // Bulk add lines parser for Course Plan
  const handleBulkAddPlan = () => {
    const lines = bulkPlanText.split("\n").map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    const newUnits: WizardUnit[] = []
    lines.forEach((line, idx) => {
      // Format: Unit Title | Theme Title | Subtopic1, Subtopic2 | Tag
      const parts = line.split("|").map((p) => p.trim())
      const unitTitle = parts[0] || `Unit ${idx + 1}`
      const themeTitle = parts[1] || "Core Concepts"
      const subtopics = parts[2] ? parts[2].split(",").map((s) => s.trim()).filter(Boolean) : []
      const tag = parts[3] || ""

      newUnits.push({
        id: `u-bulk-${idx + 1}`,
        number: units.length + idx + 1,
        title: unitTitle,
        tag,
        themes: [
          {
            id: `th-bulk-${idx + 1}`,
            title: themeTitle,
            subtopics,
            lectures: [
              {
                id: `l-bulk-${idx + 1}`,
                title: `${themeTitle} Overview`,
                durationMin: 60,
                status: "upcoming",
                videoSourceType: "add_later",
                isTrial: idx === 0,
              },
            ],
          },
        ],
      })
    })

    setUnits((prev) => [...prev, ...newUnits])
    setBulkPlanText("")
    setShowBulkPlan(false)
  }

  // CSV Template download
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      "Unit Title,Unit Title Hindi,Unit Tag,Theme Title,Subtopics,Lecture Title,Duration Mins,Scheduled Date IST\n" +
      "Unit 1 Foundations,इकाई 1 आधार,Core,Orientation & Basics,Concepts; Overview,Intro Lecture,60,2026-11-10 19:00\n" +
      "Unit 2 Core Concepts,इकाई 2 अवधारणा,Module A,Deep Dive,Analysis; Problem Solving,Session 2,90,2026-11-11 19:00\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "course-plan-template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Teacher Library Attachment
  const handleAttachFromLibrary = (libTeacherId: string) => {
    const found = reusableLibraryTeachers.find((t) => t.id === libTeacherId)
    if (!found) return
    if (teachers.some((t) => t.name.toLowerCase() === found.name.toLowerCase())) return
    setTeachers((prev) => [...prev, { ...found, id: Math.random().toString(36).substring(2, 7) }])
  }

  // Derived Completeness Checklist
  const completeness = useMemo(() => {
    const isHindiTarget = languageMode === "hi" || languageMode === "bilingual" || Boolean(titleHi.trim())
    const missingHindiFields: string[] = []
    if (isHindiTarget) {
      if (!titleHi.trim()) missingHindiFields.push("Title")
      if (!subtitleHi.trim()) missingHindiFields.push("Subtitle")
      if (!descriptionHi.trim()) missingHindiFields.push("Description")
      if (teachers.some((t) => !t.nameHi?.trim())) missingHindiFields.push("Teacher Name(s)")
      if (units.some((u) => !u.titleHi?.trim())) missingHindiFields.push("Unit Title(s)")
      if (stats.some((s) => s.caption && !s.captionHi?.trim())) missingHindiFields.push("Stats Caption(s)")
      if (badges.some((b) => b.label && !b.labelHi?.trim())) missingHindiFields.push("Badge Label(s)")
    }

    const emptyUnits = units.filter((u) => u.themes.length === 0)
    const hasEmptyUnits = emptyUnits.length > 0

    const items = [
      { name: "Course Title", ready: Boolean(title.trim()), required: true, emptyEffect: "Blocks course creation" },
      { name: "Target Category", ready: Boolean(category.trim()), required: true, emptyEffect: "Blocks categorization" },
      { name: "Pricing & Currency", ready: isFree || price >= 0, required: true, emptyEffect: "Defaults to Free" },
      { name: "Lead Instructor", ready: teachers.length > 0, required: false, emptyEffect: "Hides teacher profile block" },
      { name: "Course Plan (Units & Lectures)", ready: units.length > 0 && units.some((u) => u.themes.some((th) => th.lectures.length > 0)), required: false, emptyEffect: "Hides snake board / timeline" },
      { name: "Exam Syllabus (Optional)", ready: !syllabusEnabled || syllabusPapers.length > 0, required: false, emptyEffect: "Hides exam syllabus section" },
      { name: "Thumbnail Cover", ready: Boolean(thumbnailUrl), required: false, emptyEffect: "Uses auto-generated gradient cover" },
      { name: "Frequently Asked Questions", ready: faqs.length > 0, required: false, emptyEffect: "Hides FAQs accordion" },
    ]

    if (isHindiTarget) {
      items.push({
        name: "Hindi Localization",
        ready: missingHindiFields.length === 0,
        required: languageMode === "hi",
        emptyEffect: missingHindiFields.length === 0 ? "All key fields localized" : `Missing Hindi: ${missingHindiFields.join(", ")}`,
      })
    }

    if (hasEmptyUnits) {
      items.push({
        name: "Empty Units Validation",
        ready: false,
        required: true,
        emptyEffect: `Warning: ${emptyUnits.length} unit(s) have 0 themes (${emptyUnits.map((u) => u.title).join(", ")}). Must add themes or remove before publish.`,
      })
    }

    const totalLectures = units.reduce((acc, u) => acc + u.themes.reduce((tAcc, th) => tAcc + th.lectures.length, 0), 0)
    const hasZeroLectures = totalLectures === 0

    return {
      items,
      allReady: items.every((i) => !i.required || i.ready),
      hasZeroLectures,
      totalLectures,
      hasEmptyUnits,
      emptyUnits,
      isHindiTarget,
      missingHindiFields,
    }
  }, [title, titleHi, subtitleHi, descriptionHi, category, isFree, price, teachers, units, syllabusEnabled, syllabusPapers, thumbnailUrl, faqs, stats, badges, languageMode])

  const wizardPreviewModel = useMemo(() => {
    return buildCourseDetailViewModel({
      id: "preview-id",
      title,
      titleHi,
      subtitle,
      subtitleHi,
      description,
      descriptionHi,
      slug,
      category,
      price: isFree ? 0 : price,
      originalPrice: isFree ? 0 : mrp,
      isFree,
      thumbnailUrl,
      brand: brandName,
      language: languageMode,
      units,
      teachers,
      faqs,
      stats,
      badges,
      whatYouGet,
      howItWorks,
      goalLabel,
      goalLabelHi,
      enrollCtaLabel: ctaLabel,
      enrollCtaLabelHi: ctaLabelHi,
      enrollHelperText: ctaHelperText,
      enrollHelperTextHi: ctaHelperTextHi,
      tabsConfig,
      themeTokens,
      syllabusEnabled,
      syllabusPapers,
    })
  }, [
    title,
    titleHi,
    subtitle,
    subtitleHi,
    description,
    descriptionHi,
    slug,
    category,
    price,
    mrp,
    isFree,
    thumbnailUrl,
    brandName,
    languageMode,
    units,
    teachers,
    faqs,
    stats,
    badges,
    whatYouGet,
    howItWorks,
    goalLabel,
    goalLabelHi,
    ctaLabel,
    ctaLabelHi,
    ctaHelperText,
    ctaHelperTextHi,
    tabsConfig,
    themeTokens,
    syllabusEnabled,
    syllabusPapers,
  ])

  // Final Course Submission
  const handleSubmitCourse = async (publishImmediate = false) => {
    setSubmitError(null)
    if (!title.trim()) {
      setSubmitError("Course title is required before saving.")
      setCurrentStep(2)
      return
    }

    if (publishImmediate && completeness.hasEmptyUnits) {
      setSubmitError(
        `Cannot publish: ${completeness.emptyUnits.length} unit(s) have 0 themes (${completeness.emptyUnits.map((u) => u.title).join(", ")}). Please add themes or remove empty units.`
      )
      setCurrentStep(6)
      return
    }

    if (publishImmediate && completeness.hasZeroLectures) {
      const proceed = confirm(
        "Warning: This course has 0 lectures. Publishing will display an empty curriculum to students. Proceed anyway?"
      )
      if (!proceed) return
    }

    setIsSubmitting(true)

    try {
      const finalStatus = publishImmediate ? "PUBLISHED" : status

      const payload = {
        title: title.trim(),
        titleHi: titleHi.trim() || null,
        subtitle: subtitle.trim() || null,
        subtitleHi: subtitleHi.trim() || null,
        slug: slug.trim() || undefined,
        description: description.trim() || "",
        descriptionHi: descriptionHi.trim() || null,
        technology: category === "custom" ? customCategory.trim() : category,
        price: isFree ? 0 : price,
        originalPrice: isFree ? 0 : mrp,
        discountPercent,
        isPremium: !isFree,
        status: finalStatus,
        thumbnailUrl: thumbnailUrl || "/placeholder-course.svg",
        theme: themeTokens,
        schemaVersion: 2,
        metadataJson: {
          schemaVersion: 2,
          brand: brandName.trim() || null,
          language: languageMode,
          goalLabel: goalLabel.trim() || null,
          goalLabelHi: goalLabelHi.trim() || null,
          enrollCtaLabel: ctaLabel.trim() || null,
          enrollCtaLabelHi: ctaLabelHi.trim() || null,
          enrollHelperText: ctaHelperText.trim() || null,
          enrollHelperTextHi: ctaHelperTextHi.trim() || null,
          heroBackground: heroBackground.trim() || null,
          hideIllustration,
          teachers,
          heroMetrics: stats.filter((s) => s.value.trim() && s.caption.trim()),
          badges,
          whatYouGet: whatYouGet.filter((w) => w.en.trim()),
          howItWorks: howItWorks.filter((h) => h.en.trim()),
          tabsConfig,
          faqs: faqs.filter((f) => f.question.trim()),
          lateJoinNote: lateJoinEnabled
            ? {
                enabled: true,
                text: lateJoinText,
                textHi: lateJoinTextHi,
              }
            : null,
        },
        units: units.map((u, uIdx) => ({
          title: u.title.trim() || `Unit ${u.number || uIdx + 1}`,
          titleHi: u.titleHi || null,
          tag: u.tag || "",
          tagHi: u.tagHi || null,
          order: u.number || uIdx + 1,
          themes: u.themes
            .filter((th) => th.title && th.title.trim() && th.title.trim().toLowerCase() !== "theme 1")
            .map((th, thIdx) => ({
              title: th.title.trim(),
              titleHi: th.titleHi || null,
              subtopics: th.subtopics,
              subtopicsHi: th.subtopicsHi || [],
              order: thIdx + 1,
              lectures: th.lectures.map((l, lIdx) => {
              let scheduledIso: string | undefined = undefined
              if (l.date) {
                const timeStr = l.time && l.time.length === 5 ? l.time : "19:00"
                try {
                  scheduledIso = new Date(`${l.date}T${timeStr}:00+05:30`).toISOString()
                } catch {
                  scheduledIso = new Date().toISOString()
                }
              }
              return {
                title: l.title,
                titleHi: l.titleHi || null,
                durationMin: l.durationMin,
                scheduledAt: scheduledIso,
                isTrial: l.isTrial,
                status: l.status,
                videoUrl: l.videoUrl || null,
              }
            }),
          })),
        })),
        syllabusPapers: syllabusEnabled
          ? syllabusPapers.map((p, pIdx) => ({
              key: p.key,
              title: p.title,
              titleHi: p.titleHi || null,
              marks: p.marks,
              durationMinutes: p.durationMinutes,
              introText: p.introQuote,
              order: pIdx + 1,
              sections: p.sections
                .filter((sec) => sec.title && sec.title.trim() && sec.title.trim().toLowerCase() !== "new syllabus section")
                .map((sec, sIdx) => ({
                  title: sec.title.trim(),
                  titleHi: sec.titleHi || null,
                  subtopics: sec.subtopics,
                  unitIndex: sec.unitIndex,
                  pyqSubject: sec.pyqSubject,
                  pyqTopic: sec.pyqTopic,
                  order: sIdx + 1,
                })),
            }))
          : [],
      }

      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create course")

      // Redirect to Course Studio Tab Editor
      router.push(`/admin/courses/${data.id}/edit`)
    } catch (err: any) {
      setSubmitError(err.message || "Course creation failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-orange-600 text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Guided Studio Wizard
            </span>
            <span className="text-xs font-bold text-gray-500">
              Create ANY Course • Zero Leakage • Real Form Inputs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10162F]">
            Course Creation Studio
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-0.5 font-medium">
            Step-by-step authoring for UPSC, SSC, Banking, Railways, NEET, School, or Tech.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="btn-live-preview"
            onClick={() => setShowLivePreviewModal(true)}
            className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>Live Preview</span>
          </button>
          <Link
            href="/admin/courses"
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Courses</span>
          </Link>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-[720px] text-xs font-bold">
          {[
            { step: 1, label: "Template" },
            { step: 2, label: "A. Basics" },
            { step: 3, label: "B. Pricing" },
            { step: 4, label: "C. Teachers" },
            { step: 5, label: "D. Hero & About" },
            { step: 6, label: "E. Course Plan" },
            { step: 7, label: "F. Syllabus" },
            { step: 8, label: "G. Theme & Tabs" },
            { step: 9, label: "H. Review" },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              data-testid={`step-nav-${item.step}`}
              onClick={() => setCurrentStep(item.step)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                currentStep === item.step
                  ? "bg-orange-600 text-white shadow-xs"
                  : currentStep > item.step
                  ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === item.step ? "bg-white text-orange-600" : currentStep > item.step ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {currentStep > item.step ? "✓" : item.step}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notification error banner */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: TEMPLATE PICKER (Optional Sample Picker) */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">Step 1 • Optional Picker</span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Start from Blank or Choose a Sample Template</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              The Blank Course starts completely empty with zero hardcoded or exam defaults. Samples demonstrate how other exams structure their courses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COURSE_TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id
              return (
                <div
                  key={tmpl.id}
                  data-testid={`template-card-${tmpl.id}`}
                  onClick={() => applyTemplate(tmpl.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-orange-600 bg-orange-50/40 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        tmpl.id === "blank" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {tmpl.id === "blank" ? "Default • Clean" : "Sample Template"}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
                    </div>
                    <h3 className="font-extrabold text-sm text-gray-900">{tmpl.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tmpl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-600">
                    <span>{tmpl.id === "blank" ? "0 units • 0 teachers" : `${tmpl.template.units?.length || 0} units • ${tmpl.template.teachers?.length || 0} teachers`}</span>
                    <span className="text-orange-600 font-extrabold">{isSelected ? "Selected ✓" : "Click to select"}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              data-testid="wizard-next-btn"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Basics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2 (A): BASICS */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section A • Basics</span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Course Identity &amp; Categorization</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter the core identity. Every text field has a dedicated Hindi twin for bilingual presentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Category / Exam */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Exam / Target Category *</label>
              <select
                data-testid="select-course-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-gray-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="UPSC">UPSC Civil Services</option>
                <option value="SSC">SSC (CGL, CHSL, MTS)</option>
                <option value="Banking">Banking (IBPS, SBI, RBI)</option>
                <option value="Railways">Railways (RRB NTPC, Group D)</option>
                <option value="State Services">State PCS (UPPSC, BPSC, MPPSC, RAS)</option>
                <option value="NEET">NEET &amp; Medical Entrance</option>
                <option value="School">School &amp; CBSE Boards</option>
                <option value="Coding">Coding &amp; Software Development</option>
                <option value="custom">+ Add Custom Category...</option>
              </select>
            </div>

            {category === "custom" && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">Custom Category Name *</label>
                <input
                  type="text"
                  data-testid="input-course-custom-category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Defence / CDS / NDA"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            )}

            {/* Language Mode */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Delivery Language Mode</label>
              <select
                data-testid="select-course-language"
                value={languageMode}
                onChange={(e) => setLanguageMode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-gray-800"
              >
                <option value="English">English only</option>
                <option value="Hindi">Hindi only (हिंदी-प्रथम)</option>
                <option value="Bilingual">Bilingual (English + हिन्दी)</option>
                <option value="Hinglish">Hinglish</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-0.5">
                If Hindi text is omitted, the public page cleanly falls back to English with no broken UI.
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Publication Status</label>
              <select
                data-testid="select-course-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-gray-800"
              >
                <option value="DRAFT">Draft (Internal Review)</option>
                <option value="PUBLISHED">Published (Live for Students)</option>
              </select>
            </div>

            {/* Brand Override */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Brand Name (Optional Override)</label>
              <input
                type="text"
                data-testid="input-course-brand"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={`Default: ${BRAND_NAME}`}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Leave blank to use the site-level brand ({BRAND_NAME}).
              </p>
            </div>
          </div>

          {/* Titles & Subtitles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-gray-100">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Course Title (English) *</label>
              <input
                type="text"
                data-testid="input-course-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Railway NTPC CBT-1 Crash Course"
                className="w-full px-3 py-2 text-sm font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Course Title (Hindi) (Optional)</label>
              <input
                type="text"
                data-testid="input-course-title-hi"
                value={titleHi}
                onChange={(e) => setTitleHi(e.target.value)}
                placeholder="e.g. रेलवे एनटीपीसी सीबीटी-1 क्रैश कोर्स"
                className="w-full px-3 py-2 text-sm font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Subtitle (English)</label>
              <input
                type="text"
                data-testid="input-course-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. 60-Day Target Batch with Live Speed Drills & Formula Notes"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Subtitle (Hindi)</label>
              <input
                type="text"
                data-testid="input-course-subtitle-hi"
                value={subtitleHi}
                onChange={(e) => setSubtitleHi(e.target.value)}
                placeholder="e.g. 60-दिवसीय टारगेट बैच लाइव स्पीड अभ्यास एवं नोट्स सहित"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">URL Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-mono text-[11px]">/courses/</span>
                <input
                  type="text"
                  data-testid="input-course-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setIsSlugCustomized(true)
                  }}
                  placeholder="course-url-slug"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Short Description (English)</label>
              <textarea
                rows={3}
                data-testid="input-course-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive description of topics, practice pedagogy, and outcomes..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Short Description (Hindi)</label>
              <textarea
                rows={3}
                data-testid="input-course-description-hi"
                value={descriptionHi}
                onChange={(e) => setDescriptionHi(e.target.value)}
                placeholder="कोर्स की विस्तृत विशेषताएं, शिक्षण पद्धति और परिणाम..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
            </div>
          </div>

          {/* Thumbnail & Hero Background */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-orange-600" />
                  Thumbnail (16:10 Ratio) &amp; Auto-Cover Generator
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Upload a 16:10 poster or auto-generate a clean vector cover from course title and theme colors.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-generate-cover"
                  onClick={handleGenerateCover}
                  className="px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Auto-Generate Cover</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border-2 border-orange-200 bg-gray-100 shadow-2xs flex items-center justify-center">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt={thumbnailAlt || "Course Cover"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] text-gray-400 font-medium">No cover set</span>
                )}
              </div>
              <div className="sm:col-span-2 space-y-2">
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Enter image URL or use Auto-Generate Cover"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono"
                />
                <input
                  type="text"
                  value={thumbnailAlt}
                  onChange={(e) => setThumbnailAlt(e.target.value)}
                  placeholder="Image Alt Text (e.g. Railway NTPC Crash Course Poster)"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs"
                />
                <input
                  type="text"
                  value={heroBackground}
                  onChange={(e) => setHeroBackground(e.target.value)}
                  placeholder="Optional Hero Background Image URL (https://...)"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Pricing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3 (B): PRICING */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section B • Pricing</span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Course Pricing &amp; Checkout CTA</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set the price, MRP discount, free course flag, and customized enroll button microcopy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-3 p-3 rounded-xl bg-orange-50/60 border border-orange-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-orange-950">100% Free Course?</span>
                <p className="text-[11px] text-orange-800">Free courses let students enroll in one click without payment gateway.</p>
              </div>
              <input
                type="checkbox"
                data-testid="checkbox-course-free"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5 rounded text-orange-600 cursor-pointer"
              />
            </div>

            {!isFree && (
              <>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Selling Price (₹ INR) *</label>
                  <input
                    type="number"
                    data-testid="input-course-price"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-base font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">List Price / MRP (₹ INR)</label>
                  <input
                    type="number"
                    data-testid="input-course-mrp"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="w-full px-3 py-2 text-base font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Auto-Computed Discount</label>
                  <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-extrabold text-emerald-800 text-sm">
                    {discountPercent}% OFF
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-gray-700 mb-1">CTA Label (English)</label>
              <input
                type="text"
                data-testid="input-course-cta-label"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="e.g. Enroll now"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">CTA Label (Hindi)</label>
              <input
                type="text"
                data-testid="input-course-cta-label-hi"
                value={ctaLabelHi}
                onChange={(e) => setCtaLabelHi(e.target.value)}
                placeholder="e.g. अभी प्रवेश लें"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Offer End Date (Optional)</label>
              <input
                type="date"
                value={offerEndDate}
                onChange={(e) => setOfferEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Helper Text Under CTA (English)</label>
              <input
                type="text"
                data-testid="input-course-cta-helper"
                value={ctaHelperText}
                onChange={(e) => setCtaHelperText(e.target.value)}
                placeholder="e.g. One-time payment with full validity until the exam."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Helper Text (Hindi)</label>
              <input
                type="text"
                data-testid="input-course-cta-helper-hi"
                value={ctaHelperTextHi}
                onChange={(e) => setCtaHelperTextHi(e.target.value)}
                placeholder="e.g. एकमुश्त भुगतान, परीक्षा तक संपूर्ण वैधता।"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Teachers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4 (C): TEACHERS (Reusable Library) */}
      {/* ======================================================== */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section C • Teachers</span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">Instructor Faculty &amp; Reusable Library</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Attach instructors from the library or create a new faculty profile once to reuse across multiple courses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Pick from Teacher Library"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAttachFromLibrary(e.target.value)
                    e.target.value = ""
                  }
                }}
                className="px-3 py-2 rounded-xl border border-orange-200 bg-orange-50 text-xs font-bold text-orange-800"
              >
                <option value="">+ Pick from Teacher Library...</option>
                {reusableLibraryTeachers.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.role})
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="btn-add-teacher"
                onClick={() => {
                  setTeachers((prev) => [
                    ...prev,
                    {
                      id: Math.random().toString(36).substring(2, 7),
                      name: "",
                      nameHi: "",
                      role: "",
                      roleHi: "",
                      credentials: [],
                      isPrimary: prev.length === 0,
                    },
                  ])
                }}
                className="px-3.5 py-2 rounded-xl bg-orange-600 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Teacher</span>
              </button>
            </div>
          </div>

          {teachers.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              No teachers attached yet. Click &quot;Pick from Teacher Library&quot; or &quot;Create New Teacher&quot; above.
            </div>
          ) : (
            <div className="space-y-4">
              {teachers.map((teacher, idx) => (
                <div key={teacher.id || idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 uppercase">Instructor #{idx + 1}</span>
                      {teacher.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={teacher.isPrimary}
                          onChange={(e) => {
                            setTeachers((prev) =>
                              prev.map((t, i) => ({ ...t, isPrimary: i === idx ? e.target.checked : false }))
                            )
                          }}
                          className="rounded text-orange-600"
                        />
                        <span>Set Primary</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setTeachers((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-700 font-bold p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                      <input
                        type="text"
                        data-testid={`input-teacher-name-${idx}`}
                        value={teacher.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, name: val } : t)))
                        }}
                        placeholder="e.g. Dr. Rajesh Sharma"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Full Name (Hindi)</label>
                      <input
                        type="text"
                        data-testid={`input-teacher-name-hi-${idx}`}
                        value={teacher.nameHi || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, nameHi: val } : t)))
                        }}
                        placeholder="e.g. डॉ. राजेश शर्मा"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Role / Designation (English) *</label>
                      <input
                        type="text"
                        data-testid={`input-teacher-role-${idx}`}
                        value={teacher.role}
                        onChange={(e) => {
                          const val = e.target.value
                          setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, role: val } : t)))
                        }}
                        placeholder="e.g. Senior Faculty & Subject Expert"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Role / Designation (Hindi)</label>
                      <input
                        type="text"
                        data-testid={`input-teacher-role-hi-${idx}`}
                        value={teacher.roleHi || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, roleHi: val } : t)))
                        }}
                        placeholder="e.g. वरिष्ठ शिक्षक एवं विषय विशेषज्ञ"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-gray-700 mb-1">
                        Credentials Chips (comma separated, shown under teacher name)
                      </label>
                      <input
                        type="text"
                        value={teacher.credentials.map((c) => c.label).join(", ")}
                        onChange={(e) => {
                          const chips = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((label) => ({ label }))
                          setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, credentials: chips } : t)))
                        }}
                        placeholder="e.g. 10+ Yrs Mentorship, Ph.D, Subject Expert"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Bio / Mentorship Statement (English)</label>
                      <textarea
                        rows={2}
                        value={teacher.bio || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, bio: val } : t)))
                        }}
                        placeholder="Brief summary of teaching achievements and pedagogical focus..."
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Bio (Hindi)</label>
                      <textarea
                        rows={2}
                        value={teacher.bioHi || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setTeachers((prev) => prev.map((t, i) => (i === idx ? { ...t, bioHi: val } : t)))
                        }}
                        placeholder="शिक्षण अनुभव और मार्गदर्शन का संक्षिप्त विवरण..."
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Hero &amp; About</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 5 (D): HERO & ABOUT */}
      {/* ======================================================== */}
      {currentStep === 5 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section D • Hero &amp; About</span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Stats Row, Badges, What You Get &amp; How It Works</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure hero metrics (up to 6), target milestone label, badges, and bullet highlights with icon pickers.
            </p>
          </div>

          {/* Goal Label & Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Goal Label (English)</label>
              <input
                type="text"
                value={goalLabel}
                onChange={(e) => setGoalLabel(e.target.value)}
                placeholder="e.g. UPSC Prelims 2027 or RRB NTPC CBT-1"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Goal Label (Hindi)</label>
              <input
                type="text"
                value={goalLabelHi}
                onChange={(e) => setGoalLabelHi(e.target.value)}
                placeholder="e.g. यूपीएससी प्रारंभिक 2027"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold"
              />
            </div>
          </div>

          {/* Stats Row (Up to 6) */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">Hero Stats Row (Up to 6 Metrics)</span>
                <p className="text-[11px] text-gray-500">
                  Values shown in the hero stats cards. Left empty, the page derives them automatically from lectures.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (stats.length < 6) {
                    setStats((prev) => [...prev, { value: "10 Nov", caption: "batch starts", icon: "calendar" }])
                  }
                }}
                disabled={stats.length >= 6}
                data-testid="btn-add-stat"
                className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
              >
                + Add Stat
              </button>
            </div>

            {stats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.map((stat, sIdx) => (
                  <div key={sIdx} className="p-3 rounded-lg border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-600 text-[11px]">Metric #{sIdx + 1}</span>
                      <div className="flex items-center gap-2">
                        <IconPicker value={stat.icon || "sparkles"} onChange={(icon) => {
                          setStats((prev) => prev.map((s, i) => (i === sIdx ? { ...s, icon } : s)))
                        }} />
                        <button
                          type="button"
                          onClick={() => setStats((prev) => prev.filter((_, i) => i !== sIdx))}
                          className="text-red-600 hover:text-red-700 font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        data-testid={`input-stat-value-${sIdx}`}
                        value={stat.value}
                        onChange={(e) => {
                          const val = e.target.value
                          setStats((prev) => prev.map((s, i) => (i === sIdx ? { ...s, value: val } : s)))
                        }}
                        placeholder="Value (e.g. 15 Nov)"
                        className="px-2.5 py-1 text-xs rounded border border-gray-200 bg-white font-bold"
                      />
                      <input
                        type="text"
                        data-testid={`input-stat-value-hi-${sIdx}`}
                        value={stat.valueHi || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setStats((prev) => prev.map((s, i) => (i === sIdx ? { ...s, valueHi: val } : s)))
                        }}
                        placeholder="Value (हिन्दी)"
                        className="px-2.5 py-1 text-xs rounded border border-gray-200 bg-white font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        data-testid={`input-stat-caption-${sIdx}`}
                        value={stat.caption}
                        onChange={(e) => {
                          const val = e.target.value
                          setStats((prev) => prev.map((s, i) => (i === sIdx ? { ...s, caption: val } : s)))
                        }}
                        placeholder="Caption (e.g. Batch starts)"
                        className="px-2.5 py-1 text-xs rounded border border-gray-200 bg-white font-medium"
                      />
                      <input
                        type="text"
                        data-testid={`input-stat-caption-hi-${sIdx}`}
                        value={stat.captionHi || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setStats((prev) => prev.map((s, i) => (i === sIdx ? { ...s, captionHi: val } : s)))
                        }}
                        placeholder="Caption (हिन्दी)"
                        className="px-2.5 py-1 text-xs rounded border border-gray-200 bg-white font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badges Section */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">Hero Badges &amp; Tags</span>
                <p className="text-[11px] text-gray-500">
                  Highlight key course characteristics (e.g. Bilingual, Live + Recorded, Full Access).
                </p>
              </div>
              <button
                type="button"
                data-testid="btn-add-badge"
                onClick={() => setBadges((prev) => [...prev, { label: "", variant: prev.length === 0 ? "outlined" : "filled" }])}
                className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs cursor-pointer"
              >
                + Add Badge
              </button>
            </div>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {badges.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-1.5 p-2 rounded-lg border border-gray-200 bg-white">
                    <input
                      type="text"
                      data-testid={`input-badge-label-${bIdx}`}
                      value={b.label}
                      onChange={(e) => {
                        const val = e.target.value
                        setBadges((prev) => prev.map((item, i) => (i === bIdx ? { ...item, label: val } : item)))
                      }}
                      placeholder="Badge label"
                      className="px-2 py-1 text-xs rounded border border-gray-200 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setBadges((prev) => prev.filter((_, i) => i !== bIdx))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Late Join Note Section */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold text-gray-900 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="checkbox-late-join"
                  checked={lateJoinEnabled}
                  onChange={(e) => setLateJoinEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600"
                />
                <span>Enable Late-Join Note on Hero</span>
              </label>
            </div>
            {lateJoinEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <input
                  type="text"
                  data-testid="input-late-join-text"
                  value={lateJoinText}
                  onChange={(e) => setLateJoinText(e.target.value)}
                  placeholder="e.g. Recordings of all past sessions are available immediately."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
                />
                <input
                  type="text"
                  data-testid="input-late-join-text-hi"
                  value={lateJoinTextHi}
                  onChange={(e) => setLateJoinTextHi(e.target.value)}
                  placeholder="e.g. पिछली सभी कक्षाओं की रिकॉर्डिंग तुरंत उपलब्ध हैं।"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
                />
              </div>
            )}
          </div>

          {/* What You Get & How It Works */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">What You Get (Features)</span>
                <button
                  type="button"
                  onClick={() => setWhatYouGet((prev) => [...prev, { en: "", hi: "" }])}
                  className="text-orange-600 font-bold text-xs"
                >
                  + Add Item
                </button>
              </div>
              {whatYouGet.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.en}
                    onChange={(e) => {
                      const val = e.target.value
                      setWhatYouGet((prev) => prev.map((w, i) => (i === idx ? { ...w, en: val } : w)))
                    }}
                    placeholder={`Feature ${idx + 1} (English)`}
                    className="flex-1 px-2.5 py-1.5 rounded border border-gray-200 bg-white font-medium"
                  />
                  <input
                    type="text"
                    value={item.hi || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      setWhatYouGet((prev) => prev.map((w, i) => (i === idx ? { ...w, hi: val } : w)))
                    }}
                    placeholder="Hindi"
                    className="w-1/3 px-2.5 py-1.5 rounded border border-gray-200 bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setWhatYouGet((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">How It Works (Steps)</span>
                <button
                  type="button"
                  onClick={() => setHowItWorks((prev) => [...prev, { en: "", hi: "" }])}
                  className="text-orange-600 font-bold text-xs"
                >
                  + Add Step
                </button>
              </div>
              {howItWorks.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.en}
                    onChange={(e) => {
                      const val = e.target.value
                      setHowItWorks((prev) => prev.map((h, i) => (i === idx ? { ...h, en: val } : h)))
                    }}
                    placeholder={`Step ${idx + 1} (English)`}
                    className="flex-1 px-2.5 py-1.5 rounded border border-gray-200 bg-white font-medium"
                  />
                  <input
                    type="text"
                    value={item.hi || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      setHowItWorks((prev) => prev.map((h, i) => (i === idx ? { ...h, hi: val } : h)))
                    }}
                    placeholder="Hindi"
                    className="w-1/3 px-2.5 py-1.5 rounded border border-gray-200 bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setHowItWorks((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Course Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 6 (E): COURSE PLAN */}
      {/* ======================================================== */}
      {currentStep === 6 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section E • Course Plan</span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">Units, Themes &amp; Lecture Schedule</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Build the 4-level hierarchy: Units → Themes → Subtopics → Lectures with IST times and free previews.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowScheduleGen(!showScheduleGen)}
                className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Schedule Generator</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBulkPlan(!showBulkPlan)}
                className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bulk Add Units</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>CSV Template</span>
              </button>
            </div>
          </div>

          {/* Schedule Generator Drawer */}
          {showScheduleGen && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 space-y-3 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-950 uppercase tracking-wider">
                  Automated Lecture Schedule Generator
                </span>
                <span className="text-[11px] text-indigo-700 font-semibold">Generates recurring slots</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-indigo-900 mb-1">Days Pattern</label>
                  <select
                    value={scheduleGenDays}
                    onChange={(e) => setScheduleGenDays(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white font-medium"
                  >
                    <option value="mon-fri">Mon – Fri (Weekdays)</option>
                    <option value="daily">Daily (7 Days a Week)</option>
                    <option value="weekends">Sat &amp; Sun (Weekends)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-indigo-900 mb-1">Start Time (IST)</label>
                  <input
                    type="time"
                    value={scheduleGenTime}
                    onChange={(e) => setScheduleGenTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-indigo-900 mb-1">Duration (Weeks)</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={scheduleGenWeeks}
                    onChange={(e) => setScheduleGenWeeks(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-indigo-900 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={scheduleGenStartDate}
                    onChange={(e) => setScheduleGenStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowScheduleGen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunScheduleGenerator}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Generate Lecture Slots
                </button>
              </div>
            </div>
          )}

          {/* Bulk Add Drawer */}
          {showBulkPlan && (
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/60 space-y-2 text-xs">
              <span className="font-extrabold text-orange-950 uppercase tracking-wider block">
                Bulk Add Units (Paste lines)
              </span>
              <p className="text-orange-800 text-[11px]">
                Format: <code className="bg-orange-100 px-1 rounded">Unit Title | Theme Title | Subtopic1, Subtopic2 | Tag</code>
              </p>
              <textarea
                rows={3}
                value={bulkPlanText}
                onChange={(e) => setBulkPlanText(e.target.value)}
                placeholder={"Unit 1 Foundations | Core Concepts | Number System, Decimals | Section A\nUnit 2 Advanced Math | Speed Drills | Percentages, Profit & Loss | Section B"}
                className="w-full p-2.5 rounded-lg border border-orange-200 bg-white font-mono text-[11px]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPlan(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddPlan}
                  className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Add Units
                </button>
              </div>
            </div>
          )}

          {/* Units List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Units Created ({units.length})</span>
              <button
                type="button"
                data-testid="btn-add-unit"
                onClick={() => {
                  setUnits((prev) => [
                    ...prev,
                    {
                      id: `u-${prev.length + 1}`,
                      number: prev.length + 1,
                      title: "",
                      tag: "",
                      themes: [
                        {
                          id: `th-${prev.length + 1}-1`,
                          title: "",
                          subtopics: [],
                          lectures: [],
                        },
                      ],
                    },
                  ])
                }}
                className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Unit</span>
              </button>
            </div>

            {units.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                No units created yet. Click &quot;+ Add Unit&quot;, &quot;Bulk Add Units&quot;, or &quot;Schedule Generator&quot; above.
              </div>
            ) : (
              units.map((unit, uIdx) => (
                <div key={unit.id || uIdx} className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-extrabold">
                        Unit {unit.number || uIdx + 1}
                      </span>
                      <input
                        type="text"
                        data-testid={`input-unit-title-${uIdx}`}
                        value={unit.title}
                        onChange={(e) => {
                          const val = e.target.value
                          setUnits((prev) => prev.map((u, i) => (i === uIdx ? { ...u, title: val } : u)))
                        }}
                        placeholder="Unit Title"
                        className="font-extrabold text-gray-900 border-b border-dashed border-gray-300 focus:outline-none focus:border-orange-500 px-1 py-0.5"
                      />
                      <input
                        type="text"
                        data-testid={`input-unit-tag-${uIdx}`}
                        value={unit.tag || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setUnits((prev) => prev.map((u, i) => (i === uIdx ? { ...u, tag: val } : u)))
                        }}
                        placeholder="Tag (e.g. Module 1)"
                        className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 w-24"
                      />
                      <input
                        type="text"
                        data-testid={`input-unit-tag-hi-${uIdx}`}
                        value={unit.tagHi || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setUnits((prev) => prev.map((u, i) => (i === uIdx ? { ...u, tagHi: val } : u)))
                        }}
                        placeholder="Tag (हिन्दी)"
                        className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 w-24"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setUnits((prev) => prev.filter((_, i) => i !== uIdx))}
                      className="text-red-500 hover:text-red-700 p-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Themes inside unit */}
                  <div className="space-y-3 pl-3 border-l-2 border-orange-200">
                    {unit.themes.map((theme, thIdx) => (
                      <div key={theme.id || thIdx} className="p-3 rounded-lg border border-gray-100 bg-gray-50/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={theme.title}
                            onChange={(e) => {
                              const val = e.target.value
                              setUnits((prev) =>
                                prev.map((u, i) =>
                                  i === uIdx
                                    ? {
                                        ...u,
                                        themes: u.themes.map((th, j) => (j === thIdx ? { ...th, title: val } : th)),
                                      }
                                    : u
                                )
                              )
                            }}
                            data-testid={`input-theme-title-${uIdx}-${thIdx}`}
                            placeholder="Theme Title"
                            className="font-bold text-gray-800 bg-transparent border-b border-gray-200 text-xs px-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUnits((prev) =>
                                prev.map((u, i) =>
                                  i === uIdx
                                    ? { ...u, themes: u.themes.filter((_, j) => j !== thIdx) }
                                    : u
                                )
                              )
                            }}
                            className="text-red-400 hover:text-red-600 text-[11px]"
                          >
                            Remove Theme
                          </button>
                        </div>

                        {/* Subtopics chips input */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Subtopics (Chips)</label>
                          <input
                            type="text"
                            data-testid={`input-theme-subtopics-${uIdx}-${thIdx}`}
                            value={theme.subtopics.join(", ")}
                            onChange={(e) => {
                              const chips = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                              setUnits((prev) =>
                                prev.map((u, i) =>
                                  i === uIdx
                                    ? {
                                        ...u,
                                        themes: u.themes.map((th, j) => (j === thIdx ? { ...th, subtopics: chips } : th)),
                                      }
                                    : u
                                )
                              )
                            }}
                            placeholder="Subtopic 1, Subtopic 2, Subtopic 3..."
                            className="w-full px-2.5 py-1 text-xs rounded border border-gray-200 bg-white"
                          />
                        </div>

                        {/* Lectures inside theme */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-500 uppercase">
                              Lectures ({theme.lectures.length})
                            </span>
                            <button
                              type="button"
                              data-testid={`btn-add-lecture-${uIdx}-${thIdx}`}
                              onClick={() => {
                                const newLec: WizardLecture = {
                                  id: Math.random().toString(36).substring(2, 7),
                                  title: `Lecture ${theme.lectures.length + 1}`,
                                  durationMin: 60,
                                  status: "upcoming",
                                  videoSourceType: "add_later",
                                  isTrial: theme.lectures.length === 0 && uIdx === 0,
                                }
                                setUnits((prev) =>
                                  prev.map((u, i) =>
                                    i === uIdx
                                      ? {
                                          ...u,
                                          themes: u.themes.map((th, j) =>
                                            j === thIdx ? { ...th, lectures: [...th.lectures, newLec] } : th
                                          ),
                                        }
                                      : u
                                  )
                                )
                              }}
                              className="text-orange-600 font-bold text-[11px] hover:underline cursor-pointer"
                            >
                              + Add Lecture
                            </button>
                          </div>

                          {theme.lectures.map((lec, lIdx) => (
                            <div
                              key={lec.id || lIdx}
                              className="p-2 rounded border border-gray-200 bg-white flex flex-wrap items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <span className="text-[10px] font-mono text-gray-400">#{lIdx + 1}</span>
                                <input
                                  type="text"
                                  data-testid={`input-lecture-title-${uIdx}-${thIdx}-${lIdx}`}
                                  value={lec.title}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setUnits((prev) =>
                                      prev.map((u, i) =>
                                        i === uIdx
                                          ? {
                                              ...u,
                                              themes: u.themes.map((th, j) =>
                                                j === thIdx
                                                  ? {
                                                      ...th,
                                                      lectures: th.lectures.map((l, k) =>
                                                        k === lIdx ? { ...l, title: val } : l
                                                      ),
                                                    }
                                                  : th
                                              ),
                                            }
                                          : u
                                      )
                                    )
                                  }}
                                  placeholder="Lecture Title"
                                  className="font-bold text-gray-800 text-xs border-b border-gray-100 flex-1 px-1"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-mono">{lec.durationMin}m</span>
                                <label className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold cursor-pointer">
                                  <input
                                    type="checkbox"
                                    data-testid={`checkbox-lecture-trial-${uIdx}-${thIdx}-${lIdx}`}
                                    checked={lec.isTrial}
                                    onChange={(e) => {
                                      const checked = e.target.checked
                                      setUnits((prev) =>
                                        prev.map((u, i) =>
                                          i === uIdx
                                            ? {
                                                ...u,
                                                themes: u.themes.map((th, j) =>
                                                  j === thIdx
                                                    ? {
                                                        ...th,
                                                        lectures: th.lectures.map((l, k) =>
                                                          k === lIdx ? { ...l, isTrial: checked } : l
                                                        ),
                                                      }
                                                    : th
                                                ),
                                              }
                                            : u
                                        )
                                      )
                                    }}
                                    className="rounded text-emerald-600"
                                  />
                                  <span>Free Preview</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUnits((prev) =>
                                      prev.map((u, i) =>
                                        i === uIdx
                                          ? {
                                              ...u,
                                              themes: u.themes.map((th, j) =>
                                                j === thIdx
                                                  ? { ...th, lectures: th.lectures.filter((_, k) => k !== lIdx) }
                                                  : th
                                              ),
                                            }
                                          : u
                                      )
                                    )
                                  }}
                                  className="text-red-400 hover:text-red-600 p-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setUnits((prev) =>
                          prev.map((u, i) =>
                            i === uIdx
                              ? {
                                  ...u,
                                  themes: [
                                    ...u.themes,
                                    {
                                      id: `th-${uIdx + 1}-${u.themes.length + 1}`,
                                      title: "",
                                      subtopics: [],
                                      lectures: [],
                                    },
                                  ],
                                }
                              : u
                          )
                        )
                      }}
                      className="text-orange-700 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Theme to Unit {unit.number || uIdx + 1}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(7)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Syllabus</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 7 (F): SYLLABUS (Optional) */}
      {/* ======================================================== */}
      {currentStep === 7 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section F • Syllabus</span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">Official Exam Papers &amp; PYQ Topic Mapping</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Optional: Link syllabus sections to real previous year questions to show sparklines and question trends.
              </p>
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                data-testid="checkbox-syllabus-enable"
                checked={syllabusEnabled}
                onChange={(e) => setSyllabusEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600"
              />
              <span>Enable Syllabus Section</span>
            </label>
          </div>

          {!syllabusEnabled ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Exam syllabus is currently toggled OFF for this course. (Ideal for crash courses, tech tutorials, or school subjects where full exam paper mapping is not required).
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  data-testid="btn-add-paper"
                  onClick={() => {
                    setSyllabusPapers((prev) => [
                      ...prev,
                      {
                        id: `p-${prev.length + 1}`,
                        key: `PAPER_${prev.length + 1}`,
                        title: `Paper ${prev.length + 1}`,
                        marks: 100,
                        durationMinutes: 120,
                        sections: [],
                      },
                    ])
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Exam Paper</span>
                </button>
              </div>

              {syllabusPapers.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                  No exam papers added. Click &quot;+ Add Exam Paper&quot; above.
                </div>
              ) : (
                syllabusPapers.map((paper, pIdx) => (
                  <div key={paper.id || pIdx} className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-gray-900">{paper.key}</span>
                        <input
                          type="text"
                          data-testid={`input-paper-title-${pIdx}`}
                          value={paper.title}
                          onChange={(e) => {
                            const val = e.target.value
                            setSyllabusPapers((prev) =>
                              prev.map((p, i) => (i === pIdx ? { ...p, title: val } : p))
                            )
                          }}
                          placeholder="Paper Title (e.g. Paper I — General Studies)"
                          className="font-bold text-gray-900 border-b border-gray-200 px-1 py-0.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSyllabusPapers((prev) => prev.filter((_, i) => i !== pIdx))}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sections inside paper */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-600">Sections inside this paper</span>
                        <button
                          type="button"
                          data-testid={`btn-add-section-${pIdx}`}
                          onClick={() => {
                            const newSec: WizardSyllabusSection = {
                              id: Math.random().toString(36).substring(2, 7),
                              title: "",
                              subtopics: [],
                            }
                            setSyllabusPapers((prev) =>
                              prev.map((p, i) => (i === pIdx ? { ...p, sections: [...p.sections, newSec] } : p))
                            )
                          }}
                          className="text-orange-600 font-bold text-[11px] hover:underline cursor-pointer"
                        >
                          + Add Section
                        </button>
                      </div>

                      {paper.sections.map((sec, sIdx) => (
                        <div key={sec.id || sIdx} className="p-3 rounded-lg border border-gray-100 bg-gray-50/70 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              data-testid={`input-section-title-${pIdx}-${sIdx}`}
                              value={sec.title}
                              onChange={(e) => {
                                const val = e.target.value
                                setSyllabusPapers((prev) =>
                                  prev.map((p, i) =>
                                    i === pIdx
                                      ? {
                                          ...p,
                                          sections: p.sections.map((s, j) => (j === sIdx ? { ...s, title: val } : s)),
                                        }
                                      : p
                                  )
                                )
                              }}
                              placeholder="Section Title"
                              className="font-bold text-gray-800 bg-transparent border-b border-gray-200 px-1 flex-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSyllabusPapers((prev) =>
                                  prev.map((p, i) =>
                                    i === pIdx
                                      ? { ...p, sections: p.sections.filter((_, j) => j !== sIdx) }
                                      : p
                                  )
                                )
                              }}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Link to Unit & Link to PYQ Picker */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <label className="block text-gray-500 font-semibold mb-0.5">Link to Course Unit</label>
                              <select
                                value={sec.unitIndex ?? ""}
                                onChange={(e) => {
                                  const idxVal = e.target.value !== "" ? Number(e.target.value) : undefined
                                  setSyllabusPapers((prev) =>
                                    prev.map((p, i) =>
                                      i === pIdx
                                        ? {
                                            ...p,
                                            sections: p.sections.map((s, j) =>
                                              j === sIdx ? { ...s, unitIndex: idxVal } : s
                                            ),
                                          }
                                        : p
                                    )
                                  )
                                }}
                                className="w-full px-2 py-1 rounded border border-gray-200 bg-white"
                              >
                                <option value="">No unit linked</option>
                                {units.map((u, uI) => (
                                  <option key={u.id} value={uI}>
                                    Unit {u.number || uI + 1}: {u.title}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-gray-500 font-semibold mb-0.5">PYQ Subject</label>
                              <input
                                type="text"
                                value={sec.pyqSubject || ""}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setSyllabusPapers((prev) =>
                                    prev.map((p, i) =>
                                      i === pIdx
                                        ? {
                                            ...p,
                                            sections: p.sections.map((s, j) =>
                                              j === sIdx ? { ...s, pyqSubject: val } : s
                                            ),
                                          }
                                        : p
                                    )
                                  )
                                }}
                                placeholder="e.g. Polity or History"
                                className="w-full px-2 py-1 rounded border border-gray-200 bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-gray-500 font-semibold mb-0.5">PYQ Topic</label>
                              <input
                                type="text"
                                value={sec.pyqTopic || ""}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setSyllabusPapers((prev) =>
                                    prev.map((p, i) =>
                                      i === pIdx
                                        ? {
                                            ...p,
                                            sections: p.sections.map((s, j) =>
                                              j === sIdx ? { ...s, pyqTopic: val } : s
                                            ),
                                          }
                                        : p
                                    )
                                  )
                                }}
                                placeholder="e.g. Constitution"
                                className="w-full px-2 py-1 rounded border border-gray-200 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(8)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Theme &amp; Tabs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 8 (G): TABS, THEME, FAQ */}
      {/* ======================================================== */}
      {currentStep === 8 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section G • Theme, Tabs &amp; FAQs</span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Palette, Font Typography &amp; Nav Order</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Customize colors, font stacks, tab order and visibility, and add common student FAQs.
            </p>
          </div>

          {/* Theme Color Pickers */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-orange-600" />
                Color Theme Tokens &amp; Contrast Check
              </span>
              <button
                type="button"
                onClick={() => setThemeTokens(DEFAULT_THEME_TOKENS)}
                className="text-[11px] font-bold text-orange-700 hover:underline"
              >
                Reset to Default Palette
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Navy (Hero BG)", key: "navy" },
                { label: "Gold (Accents)", key: "gold" },
                { label: "Cream (Page BG)", key: "cream" },
                { label: "Ink (Text)", key: "ink" },
              ].map((token) => (
                <div key={token.key} className="p-2 rounded-lg bg-white border border-gray-200 flex items-center gap-2">
                  <input
                    type="color"
                    value={(themeTokens as any)[token.key] || "#1B1F4A"}
                    onChange={(e) => setThemeTokens({ ...themeTokens, [token.key]: e.target.value })}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">{token.label}</span>
                    <span className="font-mono text-xs font-bold text-gray-800">
                      {(themeTokens as any)[token.key]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Contrast Ratio Warning Check */}
            {hasContrastWarning(themeTokens) && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Accessibility Contrast Warning: Contrast ratio between theme colors is below WCAG AA guidelines (contrast ratio: {computeContrastRatio(themeTokens.gold, themeTokens.navy)}:1). Consider adjusting for WCAG compliance.
                </span>
              </div>
            )}
          </div>

          {/* Nav Tabs Config */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
            <span className="font-bold text-gray-900 block">Navigation Tabs Order &amp; Visibility</span>
            <div className="space-y-2">
              {tabsConfig.map((tab, tIdx) => (
                <div key={tab.id} className="p-2 rounded-lg bg-white border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400">#{tIdx + 1}</span>
                    <input
                      type="text"
                      value={tab.label}
                      onChange={(e) => {
                        const val = e.target.value
                        setTabsConfig((prev) => prev.map((tb, i) => (i === tIdx ? { ...tb, label: val } : tb)))
                      }}
                      className="font-bold text-gray-800 text-xs px-1 border-b border-transparent focus:border-orange-500"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 font-bold text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tab.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setTabsConfig((prev) => prev.map((tb, i) => (i === tIdx ? { ...tb, enabled: checked } : tb)))
                      }}
                      className="rounded text-orange-600"
                    />
                    <span>{tab.enabled ? "Visible" : "Hidden"}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Frequently Asked Questions (FAQs)</span>
              <button
                type="button"
                onClick={() => setFaqs((prev) => [...prev, { question: "", answer: "" }])}
                className="text-orange-600 font-bold text-xs"
              >
                + Add FAQ
              </button>
            </div>
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500">FAQ #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setFaqs((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => {
                      const val = e.target.value
                      setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, question: val } : f)))
                    }}
                    placeholder="Question (English)"
                    className="px-2.5 py-1.5 rounded border border-gray-200 font-semibold text-xs"
                  />
                  <input
                    type="text"
                    value={faq.questionHi || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, questionHi: val } : f)))
                    }}
                    placeholder="Question (Hindi)"
                    className="px-2.5 py-1.5 rounded border border-gray-200 font-semibold text-xs"
                  />
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => {
                      const val = e.target.value
                      setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, answer: val } : f)))
                    }}
                    placeholder="Answer (English)"
                    className="px-2.5 py-1.5 rounded border border-gray-200 font-medium text-xs"
                  />
                  <textarea
                    rows={2}
                    value={faq.answerHi || ""}
                    onChange={(e) => {
                      const val = e.target.value
                      setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, answerHi: val } : f)))
                    }}
                    placeholder="Answer (Hindi)"
                    className="px-2.5 py-1.5 rounded border border-gray-200 font-medium text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(7)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(9)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <span>Continue to Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 9 (H): REVIEW & COMPLETENESS CHECKLIST */}
      {/* ======================================================== */}
      {currentStep === 9 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">Section H • Completeness &amp; Create</span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Course Completeness Checklist &amp; Final Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Verify which sections are filled. The public page hides empty optional sections gracefully without broken layouts.
            </p>
          </div>

          {/* Completeness Checklist Table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between font-bold text-gray-700">
              <span>Section Specification</span>
              <span>Status &amp; Public Page Behavior</span>
            </div>
            <div className="divide-y divide-gray-100">
              {completeness.items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    {item.ready ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : item.required ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <div>
                      <span className={`font-bold ${item.ready ? "text-gray-900" : item.required ? "text-red-700" : "text-gray-500"}`}>
                        {item.name}
                      </span>
                      {item.required && <span className="text-red-500 font-bold ml-1">*</span>}
                    </div>
                  </div>

                  <span className={`text-[11px] font-semibold ${item.ready ? "text-emerald-700" : "text-gray-500"}`}>
                    {item.ready ? "Ready ✓" : item.emptyEffect}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Zero lectures warning */}
          {completeness.hasZeroLectures && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Zero Lectures Warning</span>
              </div>
              <p className="text-[11px] text-amber-800">
                This course currently has 0 lectures. If published now, students will see an empty timeline. You can save as Draft and add lectures later via the Course Plan tab.
              </p>
            </div>
          )}

          {/* Course Summary Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Course Summary</span>
              <h3 className="text-base font-extrabold text-gray-900 mt-0.5">{title || "Untitled Course"}</h3>
              <p className="text-gray-500 text-[11px]">
                {category} • {languageMode} • {isFree ? "Free" : `₹${price.toLocaleString()} (${discountPercent}% OFF)`} • {teachers.length} teacher(s) • {completeness.totalLectures} lecture(s)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowLivePreviewModal(true)}
              className="px-3.5 py-2 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 font-bold flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-purple-600" />
              <span>Preview Student View</span>
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(8)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs cursor-pointer hover:bg-gray-50"
            >
              Back
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                data-testid="btn-save-draft"
                disabled={isSubmitting || !title.trim()}
                onClick={() => handleSubmitCourse(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs transition-all disabled:opacity-40 cursor-pointer shadow-xs"
              >
                {isSubmitting ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                data-testid="btn-publish-course"
                disabled={isSubmitting || !title.trim()}
                onClick={() => handleSubmitCourse(true)}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs transition-all disabled:opacity-40 cursor-pointer shadow-sm shadow-orange-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Publishing..." : "Publish Course Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LIVE PREVIEW MODAL */}
      {/* ======================================================== */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Live Studio Preview
                </span>
                <span className="text-xs font-bold text-gray-700 truncate max-w-xs">{title || "Course Preview"}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("desktop")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      previewViewport === "desktop" ? "bg-purple-600 text-white" : "text-gray-600"
                    }`}
                  >
                    Desktop (1280px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("mobile")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      previewViewport === "mobile" ? "bg-purple-600 text-white" : "text-gray-600"
                    }`}
                  >
                    Mobile (390px)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLivePreviewModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-200 text-gray-500"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Render CourseDetailV2 in interactive frame */}
            <div className="flex-1 overflow-y-auto bg-gray-100 flex justify-center p-2 sm:p-4">
              <div
                className={`bg-white transition-all shadow-lg overflow-y-auto ${
                  previewViewport === "mobile"
                    ? "w-[390px] min-h-[844px] rounded-3xl border-8 border-gray-900"
                    : "w-full rounded-xl"
                }`}
              >
                <PreviewErrorBoundary>
                  <CourseDetailV2 {...wizardPreviewModel} />
                </PreviewErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
