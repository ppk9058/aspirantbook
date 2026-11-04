"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Video,
  Radio,
  Upload,
  Ticket,
  Clock,
  ExternalLink,
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  Play,
  Loader2,
  AlertCircle,
  FileUp,
  BookOpen,
  Image as ImageIcon,
  GraduationCap,
  HelpCircle,
  Share2,
  Calendar,
  PhoneCall,
  Eye,
  Copy,
  Download,
  ArrowUp,
  ArrowDown,
  Palette,
  Sliders,
  Smartphone,
  Monitor,
} from "lucide-react"
import { COURSE_TEMPLATES, type CourseTemplate } from "@/lib/courses/templates"
import { CourseCouponsManager } from "./CourseCouponsManager"
import { HeroDetailsTab } from "./studio/HeroDetailsTab"
import { CoursePlanTab } from "./studio/CoursePlanTab"
import { ExamSyllabusTab } from "./studio/ExamSyllabusTab"
import { CallbackLeadsTab } from "./studio/CallbackLeadsTab"
import { SectionsTab } from "./studio/SectionsTab"
import { ThemeTab } from "./studio/ThemeTab"
import { TabsTab, DEFAULT_TABS, type TabConfigItem } from "./studio/TabsTab"
import { DEFAULT_THEME_TOKENS, type CourseThemeTokens } from "@/components/course/detail/theme"
import { CourseDetailV2 } from "@/components/course/detail/CourseDetailV2"
import { useDirtyGuard } from "./studio/useDirtyGuard"
import { buildHeroDraft, heroDraftToMetadata, heroDraftToCourseColumns, type HeroDraft } from "./studio/draft"
import { readSectionFlags, type SectionFlags } from "@/lib/courses/metadata-schema"
import { hindiCompletenessForList, hindiBadgeLabel } from "@/lib/i18n/localized"
import { DEFAULT_COURSE_LANGUAGE, COURSE_LANGUAGES } from "@/lib/courses/languages"
import { EXAM_CATEGORIES, EXAM_CATEGORY_GROUPS, isKnownExamCategory } from "@/lib/courses/categories"

interface LessonItem {
  id: string
  title: string
  type: string
  durationText?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
  attachmentUrl?: string | null
  content?: string | null
  videoUrl?: string | null
  isTrial?: boolean
  order: number
}

interface ChapterItem {
  id: string
  title: string
  titleHi?: string | null
  unitId?: string | null
  order: number
  lessons: LessonItem[]
}

interface CourseEditProps {
  course: {
    id: string
    title: string
    slug: string
    description: string
    technology?: string | null
    thumbnailUrl?: string | null
    price?: number | null
    originalPrice?: number | null
    discountPercent?: number | null
    couponCode?: string | null
    couponDiscount?: number | null
    expiresAt?: string | null
    hasTrialLesson?: boolean
    isPremium?: boolean
    status: string
    metadataJson?: string | null
    theme?: any
    chapters: ChapterItem[]
  }
}

export function VideoCourseEditorClient({ course: initialCourse }: CourseEditProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"
  const coursesUrl = isTeacher ? "/teacher/courses" : "/admin/courses"
  const [course, setCourse] = useState(initialCourse)
  const [chapters, setChapters] = useState<ChapterItem[]>(initialCourse.chapters)

  // Course Details Form State
  const [title, setTitle] = useState(course.title)
  const [slug, setSlug] = useState(course.slug)
  const [technology, setTechnology] = useState(course.technology || "Skills & Tech")
  const [description, setDescription] = useState(course.description)
  const [price, setPrice] = useState(course.price || 3299)
  const [originalPrice, setOriginalPrice] = useState(course.originalPrice || 4499)
  const [discountPercent, setDiscountPercent] = useState(course.discountPercent || 27)
  const [couponCode, setCouponCode] = useState(course.couponCode || "OFF50")
  const [couponDiscount, setCouponDiscount] = useState(course.couponDiscount || 50)
  const [expiresAt, setExpiresAt] = useState(course.expiresAt || "Oct 30, 2026")
  const [hasTrialLesson, setHasTrialLesson] = useState(course.hasTrialLesson ?? true)
  const [isPremium, setIsPremium] = useState(course.isPremium ?? true)
  const [status, setStatus] = useState(course.status || "PUBLISHED")
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl || "/placeholder-course.svg")
  const [showThumbnailModal, setShowThumbnailModal] = useState(false)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  const [thumbnailInputUrl, setThumbnailInputUrl] = useState(course.thumbnailUrl || "/placeholder-course.svg")

  // Studio Workspace Tab: "hero" | "theme" | "tabs" | "syllabus" | "plan" | "examSyllabus" | "teachers" | ... | "leads" | "sections"
  const [activeTab, setActiveTab] = useState<
    "hero" | "theme" | "tabs" | "syllabus" | "plan" | "examSyllabus" | "teachers" | "schedule" | "highlights" | "faqs" | "coupons" | "leads" | "sections"
  >("hero")

  // Parsed Metadata State (Teachers, Schedule, About Highlights, FAQs)
  const initialMeta = (() => {
    try {
      if (initialCourse.metadataJson) {
        return JSON.parse(initialCourse.metadataJson)
      }
    } catch (e) {
      console.error("Failed to parse initial metadataJson:", e)
    }
    return {}
  })()

  // ── Course Studio v2 (P4) ───────────────────────────────────────────────
  // Hero/details draft + section toggles live here; units and the exam syllabus
  // are real DB rows saved by their own tabs.
  const [heroDraft, setHeroDraft] = useState<HeroDraft>(() => buildHeroDraft(initialMeta, initialCourse as any))
  const [sectionFlags, setSectionFlags] = useState<SectionFlags>(() => readSectionFlags(initialMeta))
  const [themeTokens, setThemeTokens] = useState<CourseThemeTokens>(() => {
    if (initialCourse.theme && typeof initialCourse.theme === "object") {
      return initialCourse.theme as CourseThemeTokens
    }
    if (initialMeta.theme && typeof initialMeta.theme === "object") {
      return initialMeta.theme as CourseThemeTokens
    }
    return DEFAULT_THEME_TOKENS
  })
  const [tabsConfig, setTabsConfig] = useState<TabConfigItem[]>(() => {
    if (Array.isArray(initialMeta.tabsConfig) && initialMeta.tabsConfig.length > 0) {
      return initialMeta.tabsConfig
    }
    return DEFAULT_TABS
  })
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop")
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null)
  const [studioDirty, setStudioDirty] = useState(false)
  useDirtyGuard(studioDirty)

  // Debounced draft autosave to localStorage
  useEffect(() => {
    if (!studioDirty) return
    const timer = setTimeout(() => {
      try {
        const draftKey = `studio_draft_${initialCourse.id}`
        const draftData = {
          heroDraft,
          themeTokens,
          tabsConfig,
          sectionFlags,
          title,
          description,
          price,
          savedAt: new Date().toLocaleTimeString(),
        }
        localStorage.setItem(draftKey, JSON.stringify(draftData))
        setLastAutosaved(draftData.savedAt)
      } catch {}
    }, 2000)
    return () => clearTimeout(timer)
  }, [studioDirty, heroDraft, themeTokens, tabsConfig, sectionFlags, title, description, price, initialCourse.id])

  const patchHeroDraft = useCallback((patch: Partial<HeroDraft>) => {
    setHeroDraft((prev) => ({ ...prev, ...patch }))
    setStudioDirty(true)
  }, [])

  const patchThemeTokens = useCallback((patch: Partial<CourseThemeTokens>) => {
    setThemeTokens((prev) => ({ ...prev, ...patch }))
    setStudioDirty(true)
  }, [])

  const resetThemeTokens = useCallback(() => {
    setThemeTokens(DEFAULT_THEME_TOKENS)
    setStudioDirty(true)
  }, [])

  const patchTabsConfig = useCallback((tabs: TabConfigItem[]) => {
    setTabsConfig(tabs)
    setStudioDirty(true)
  }, [])

  const resetTabsConfig = useCallback(() => {
    setTabsConfig(DEFAULT_TABS)
    setStudioDirty(true)
  }, [])

  const changeSectionFlags = useCallback((next: SectionFlags) => {
    setSectionFlags(next)
    setStudioDirty(true)
  }, [])

  // Hindi coverage badge in the header: counts only fields that have English text.
  const hindiMissing = (() => {
    const courseText = hindiCompletenessForList(
      [
        {
          subtitle: heroDraft.subtitle,
          subtitleHi: heroDraft.subtitleHi,
          description,
          descriptionHi: heroDraft.descriptionHi,
          scheduleText: heroDraft.scheduleText,
          scheduleTextHi: heroDraft.scheduleTextHi,
          validityText: heroDraft.validityText,
          validityTextHi: heroDraft.validityTextHi,
          validityNote: heroDraft.validityNote,
          validityNoteHi: heroDraft.validityNoteHi,
          enrollDisclaimer: heroDraft.enrollDisclaimer,
          enrollDisclaimerHi: heroDraft.enrollDisclaimerHi,
          lateJoinerTemplate: heroDraft.lateJoinerTemplate,
          lateJoinerTemplateHi: heroDraft.lateJoinerTemplateHi,
        },
      ],
      [
        "subtitle",
        "description",
        "scheduleText",
        "validityText",
        "validityNote",
        "enrollDisclaimer",
        "lateJoinerTemplate",
      ]
    )
    const teachers = hindiCompletenessForList(initialMeta.teachers || [], ["name", "role", "qualification", "bio"])
    const faqs = hindiCompletenessForList(initialMeta.faqs || [], ["question", "answer"])
    return courseText.missing + teachers.missing + faqs.missing
  })()

  const [language, setLanguage] = useState<string>(initialMeta.language || DEFAULT_COURSE_LANGUAGE)
  const [targetAudience, setTargetAudience] = useState<string>(
    initialMeta.targetText || `Targeted for students of ${initialCourse.technology || "Course"}`
  )
  const [teachers, setTeachers] = useState<any[]>(
    initialMeta.teachers && initialMeta.teachers.length > 0
      ? initialMeta.teachers
      : [
          {
            name: "Lead Academic Faculty",
            role: "Senior Instructor & Mentor",
            subject: initialCourse.technology || "Core Curriculum",
            experience: "10+ Years",
            qualification: "Senior Educator • Subject Lead",
            avatar: "/curious-avatar.svg",
            bio: "Dedicated faculty with comprehensive experience in mentoring top-ranking students.",
          },
        ]
  )
  const [schedule, setSchedule] = useState<any[]>(
    initialMeta.schedule && initialMeta.schedule.length > 0
      ? initialMeta.schedule
      : [
          { day: "Monday - Friday", subjects: "Core Video Modules", time: "Flexible 24/7 Access", type: "Video Lectures" },
          { day: "Saturday", subjects: "Weekly Revision & Notes", time: "Self-Review", type: "Revision & Notes" },
          { day: "Sunday", subjects: "Self-Assessment Practice", time: "Anytime", type: "Practice Assessment" },
        ]
  )
  const [aboutHighlights, setAboutHighlights] = useState<string[]>(
    initialMeta.aboutHighlights && initialMeta.aboutHighlights.length > 0
      ? initialMeta.aboutHighlights
      : [
          "Comprehensive video syllabus with step-by-step conceptual mastery",
          "High-yield downloadable PDF study notes & lecture slides",
          "24x7 Self-paced video access with playback speed control and free trial preview",
          "Regular updates aligning with latest exam patterns and industry standards",
        ]
  )
  const [faqs, setFaqs] = useState<any[]>(
    initialMeta.faqs && initialMeta.faqs.length > 0
      ? initialMeta.faqs
      : [
          {
            question: "How do I access video lectures and notes after enrolling?",
            answer:
              "Once enrolled, all locked chapters, high-resolution video streams, and downloadable PDF study notes become immediately accessible under 'Continue Learning'.",
          },
          {
            question: "Can I watch the video lessons on both mobile and desktop?",
            answer:
              "Yes, the video player is fully responsive and supports smooth playback across mobile browsers, tablets, and desktop computers.",
          },
          {
            question: "Are PDF notes and study materials included in this course?",
            answer:
              "Yes, classroom PDF notes and study attachments are provided for lessons and can be viewed online or downloaded.",
          },
          {
            question: "Can I try out lectures before enrolling?",
            answer:
              "Yes, you can preview unlocked trial lectures without making a payment.",
          },
        ]
  )

  // Live Demo Class & Slots Studio State
  const [demoEnabled, setDemoEnabled] = useState<boolean>(initialMeta.demoSettings?.enabled ?? true)
  const [demoTopic, setDemoTopic] = useState<string>(initialMeta.demoSettings?.topic || "Live Interactive Demo & Syllabus Breakdown")
  const [demoFaculty, setDemoFaculty] = useState<string>(initialMeta.demoSettings?.facultyName || (initialMeta.teachers?.[0]?.name || "Senior Faculty"))
  const [dbSlots, setDbSlots] = useState<any[]>([])
  const [audienceMinutesUsed, setAudienceMinutesUsed] = useState<number>(0)
  const [hostMinutesUsed, setHostMinutesUsed] = useState<number>(0)
  const [stageMinutesUsed, setStageMinutesUsed] = useState<number>(0)
  const [totalEstimatedMinutes, setTotalEstimatedMinutes] = useState<number>(0)
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null)
  const [newSlotDateTime, setNewSlotDateTime] = useState<string>("")
  const [newSlotMaxAudience, setNewSlotMaxAudience] = useState<number>(100)
  const [newSlotDuration, setNewSlotDuration] = useState<number>(60)
  const [isAddingDbSlot, setIsAddingDbSlot] = useState(false)
  const [showDemoReportModal, setShowDemoReportModal] = useState<boolean>(false)
  const [demoReportData, setDemoReportData] = useState<any>(null)
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false)

  const fetchDbSlots = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/courses/${initialCourse.id}/demo-slots`)
      const data = await res.json()
      if (data.success) {
        setDbSlots(data.slots || [])
        if (data.totalAudienceMinutesUsed !== undefined) {
          setAudienceMinutesUsed(data.totalAudienceMinutesUsed)
        }
        if (data.hostMinutesUsed !== undefined) {
          setHostMinutesUsed(data.hostMinutesUsed)
        }
        if (data.stageMinutesUsed !== undefined) {
          setStageMinutesUsed(data.stageMinutesUsed)
        }
        if (data.totalEstimatedMinutes !== undefined) {
          setTotalEstimatedMinutes(data.totalEstimatedMinutes)
        }
      }
    } catch (e) {
      console.error("Failed to fetch slots from DB:", e)
    }
  }, [initialCourse.id])

  useEffect(() => {
    fetchDbSlots()
  }, [fetchDbSlots])

  const handleAddDbSlot = async () => {
    if (!newSlotDateTime) {
      toast.error("Please select a date and time for the slot.")
      return
    }
    setIsAddingDbSlot(true)
    try {
      const parsed = new Date(newSlotDateTime)
      const res = await fetch(`/api/admin/courses/${initialCourse.id}/demo-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTimeUtc: parsed.toISOString(),
          durationMinutes: newSlotDuration,
          maxAudience: newSlotMaxAudience,
          topic: demoTopic,
          facultyName: demoFaculty,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create slot")
      }
      toast.success("Demo slot scheduled successfully!")
      setNewSlotDateTime("")
      fetchDbSlots()
    } catch (err: any) {
      toast.error(err.message || "Failed to add slot")
    } finally {
      setIsAddingDbSlot(false)
    }
  }

  const handleDeleteDbSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/admin/courses/${initialCourse.id}/demo-slots?slotId=${slotId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete slot")
      }
      toast.success("Slot deleted.")
      fetchDbSlots()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slot")
    }
  }

  // Modals & Active Edit State
  const [showAddChapterModal, setShowAddChapterModal] = useState(false)
  const [chapterTitle, setChapterTitle] = useState("")

  // Edit Chapter Modal
  const [editingChapter, setEditingChapter] = useState<{ id: string; title: string; order: number } | null>(null)

  // Add Lesson Modal
  const [showAddLessonModal, setShowAddLessonModal] = useState(false)
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null)

  // Edit Lesson Modal
  const [editingLesson, setEditingLesson] = useState<{
    id: string
    chapterId: string
    title: string
    type: string
    durationText: string
    videoUrl: string
    isTrial: boolean
    attachmentType: "PDF" | "ARTICLE" | "LIVE" | "VIDEO"
    attachmentName: string
    attachmentUrl: string
  } | null>(null)

  // Form Fields for Add/Edit Lesson
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonType, setLessonType] = useState<"VIDEO" | "READING">("VIDEO")
  const [lessonDurationText, setLessonDurationText] = useState("1h 45m 00s")
  const [lessonVideoUrl, setLessonVideoUrl] = useState("")
  const [isTrial, setIsTrial] = useState(false)
  const [attachmentType, setAttachmentType] = useState<"PDF" | "ARTICLE" | "LIVE" | "VIDEO">("PDF")
  const [attachmentName, setAttachmentName] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")

  // Upload Loaders
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<{ [key: string]: boolean }>({
    [chapters[0]?.id || ""]: true,
    [chapters[1]?.id || ""]: true,
    [chapters[2]?.id || ""]: true,
  })

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
  }

  // Calculate discount dynamically when prices change
  const handlePriceChange = (newPrice: number, newOriginal: number) => {
    setPrice(newPrice)
    setOriginalPrice(newOriginal)
    if (newOriginal > 0 && newOriginal > newPrice) {
      setDiscountPercent(Math.round(((newOriginal - newPrice) / newOriginal) * 100))
    }
  }

  // Teacher CRUD helpers
  const handleAddTeacher = () => {
    setTeachers((prev) => [
      ...prev,
      {
        name: "",
        role: "Faculty & Mentor",
        subject: technology || "General Subject",
        experience: "5+ Years",
        qualification: "Senior Educator",
        avatar: "/curious-avatar.svg",
        bio: "",
      },
    ])
  }

  const handleUpdateTeacher = (index: number, field: string, value: any) => {
    setTeachers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)))
  }

  const handleDeleteTeacher = (index: number) => {
    setTeachers((prev) => prev.filter((_, i) => i !== index))
    setStudioDirty(true)
  }

  const handleMoveTeacher = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= teachers.length) return
    const next = [...teachers]
    const temp = next[index]
    next[index] = next[target]
    next[target] = temp
    setTeachers(next)
    setStudioDirty(true)
  }

  const [uploadingTeacherIndex, setUploadingTeacherIndex] = useState<number | null>(null)

  const handleUploadTeacherPhoto = async (idx: number, file: File) => {
    setUploadingTeacherIndex(idx)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("courseId", initialCourse.id)
      formData.append("teacherIndex", idx.toString())

      const res = await fetch("/api/courses/teacher-photo-upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to upload photo")
      }
      handleUpdateTeacher(idx, "avatar", data.url)
      toast.success("Teacher photo uploaded!")
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo")
    } finally {
      setUploadingTeacherIndex(null)
    }
  }

  // Schedule CRUD helpers
  const handleAddScheduleItem = () => {
    setSchedule((prev) => [
      ...prev,
      {
        day: "Monday - Friday",
        subjects: "Core Video Modules & Concept Review",
        time: "Flexible 24/7 Access",
        type: "Video Lectures",
      },
    ])
  }

  const handleUpdateScheduleItem = (index: number, field: string, value: string) => {
    setSchedule((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const handleDeleteScheduleItem = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index))
  }

  // Highlights CRUD helpers
  const handleAddHighlight = () => {
    setAboutHighlights((prev) => [...prev, ""])
  }

  const handleUpdateHighlight = (index: number, value: string) => {
    setAboutHighlights((prev) => prev.map((h, i) => (i === index ? value : h)))
  }

  const handleDeleteHighlight = (index: number) => {
    setAboutHighlights((prev) => prev.filter((_, i) => i !== index))
  }

  // FAQs CRUD helpers
  const handleAddFaq = () => {
    setFaqs((prev) => [...prev, { question: "", answer: "" }])
  }

  const handleUpdateFaq = (index: number, field: "question" | "answer", value: string) => {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)))
  }

  const handleDeleteFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
    setStudioDirty(true)
  }

  const handleMoveFaq = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= faqs.length) return
    const next = [...faqs]
    const temp = next[index]
    next[index] = next[target]
    next[target] = temp
    setFaqs(next)
    setStudioDirty(true)
  }

  // Course Studio Template, Import/Export & Duplicate Actions
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCompletenessModal, setShowCompletenessModal] = useState(false)

  const handleApplyTemplate = (tpl: any) => {
    const data: any = tpl.template || tpl
    setTitle(data.title || "")
    setPrice(data.price || 0)
    setOriginalPrice(data.mrp || data.originalPrice || data.price || 0)
    setTechnology(data.technology || "")
    setDescription(data.description || "")
    if (data.slug) setSlug(data.slug)
    patchHeroDraft({
      titleHi: data.titleHi || "",
      subtitle: data.subtitle || "",
      subtitleHi: data.subtitleHi || "",
      descriptionHi: data.descriptionHi || "",
      lateJoinerTemplate: data.lateJoinNote?.text || "",
      lateJoinerTemplateHi: data.lateJoinNote?.textHi || "",
      pillTags: (data.badges || []).map((b: any) => b.label).join(", "),
      pillTagsHi: (data.badges || []).map((b: any) => b.labelHi || "").filter(Boolean).join(", "),
      heroMetrics: (data.stats || []).map((s: any) => ({
        value: s.value,
        valueHi: s.valueHi,
        label: s.caption,
        labelHi: s.captionHi,
      })),
      whatYouGet: (data.whatYouGet || []).map((w: any) => ({ en: w.text || w.en || "", hi: w.textHi || w.hi || "" })),
      howItWorks: (data.howItWorks || []).map((h: any) => ({ en: h.text || h.en || "", hi: h.textHi || h.hi || "" })),
    })
    if (Array.isArray(data.teachers)) setTeachers(data.teachers as any)
    if (Array.isArray(data.faqs)) {
      setFaqs(
        data.faqs.map((f: any) => ({
          question: f.q || f.question,
          questionHi: f.qHi || f.questionHi,
          answer: f.a || f.answer,
          answerHi: f.aHi || f.answerHi,
        }))
      )
    }
    if (data.theme) setThemeTokens(data.theme)
    if (data.tabsConfig) setTabsConfig(data.tabsConfig)
    if (data.language) setLanguage(data.language)
    setStudioDirty(true)
    toast.success(`Loaded template "${tpl.name || data.title}"! Click Save Course to apply changes.`)
    setShowTemplateModal(false)
  }

  const handleLoadDemolishTemplate = () => {
    const demolish = COURSE_TEMPLATES.find((t) => t.id === "bpsc-demolish") || COURSE_TEMPLATES[0]
    handleApplyTemplate(demolish)
  }

  const completeness = useMemo(() => {
    const totalLectures = chapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0)
    const checks = [
      { label: "Basic Title & Slug", ok: Boolean(title.trim() && slug.trim()), hint: "Set course title and URL slug" },
      { label: "Category / Technology", ok: Boolean(technology.trim()), hint: "Select an exam or category" },
      { label: "Pricing & Currency", ok: Boolean(price >= 0), hint: "Set price or mark as free" },
      { label: "Teachers Attached", ok: teachers.length > 0, hint: "At least one instructor profile" },
      { label: "Curriculum Units & Lectures", ok: chapters.length > 0 && totalLectures > 0, hint: `${totalLectures} lectures across ${chapters.length} units` },
      { label: "Thumbnail / Cover", ok: Boolean(thumbnailUrl && thumbnailUrl !== "/placeholder-course.svg"), hint: "Upload a 16:10 thumbnail or custom cover" },
      { label: "Hero Stats & Highlights", ok: Boolean(heroDraft.heroMetrics?.length || heroDraft.whatYouGet?.length), hint: "Add stats chips or key benefits" },
    ]
    const completedCount = checks.filter((c) => c.ok).length
    const percent = Math.round((completedCount / checks.length) * 100)
    const hasZeroLectures = totalLectures === 0
    return { checks, completedCount, total: checks.length, percent, hasZeroLectures, totalLectures }
  }, [title, slug, technology, price, teachers, chapters, thumbnailUrl, heroDraft])

  const handleExportJson = () => {
    const courseExport = {
      title,
      technology,
      price,
      description,
      heroDraft,
      sectionFlags,
      teachers,
      faqs,
      schedule,
      aboutHighlights,
    }
    const blob = new Blob([JSON.stringify(courseExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${slug || "course"}-export.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Course exported as JSON.")
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string)
        if (parsed.title) setTitle(parsed.title)
        if (parsed.technology) setTechnology(parsed.technology)
        if (parsed.price !== undefined) setPrice(parsed.price)
        if (parsed.description) setDescription(parsed.description)
        if (parsed.heroDraft) patchHeroDraft(parsed.heroDraft)
        if (parsed.sectionFlags) setSectionFlags(parsed.sectionFlags)
        if (parsed.teachers) setTeachers(parsed.teachers)
        if (parsed.faqs) setFaqs(parsed.faqs)
        if (parsed.schedule) setSchedule(parsed.schedule)
        if (parsed.aboutHighlights) setAboutHighlights(parsed.aboutHighlights)
        toast.success("Course JSON imported successfully! Click Save Course to persist.")
      } catch (err: any) {
        toast.error("Invalid JSON file: " + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleDuplicateCourse = async () => {
    if (!confirm("Duplicate this course and all its units, chapters and syllabus?")) return
    setIsDuplicating(true)
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/duplicate`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to duplicate course")
      const data = await res.json()
      toast.success("Course duplicated! Navigating to the copy...")
      router.push(`/admin/courses/${data.courseId}/edit`)
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate")
    } finally {
      setIsDuplicating(false)
    }
  }

  // Save Main Course Metadata & Unified Batch Details
  const handleSaveCourse = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!title.trim()) {
      setErrorMsg("Course title is required before saving.")
      return
    }

    const totalLectures = chapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0)
    if (status === "PUBLISHED" && totalLectures === 0) {
      const proceed = confirm(
        "Warning: This course has 0 lectures. Publishing will display an empty curriculum to students. Proceed anyway?"
      )
      if (!proceed) return
    }

    setIsSaving(true)

    try {
      const metadataPayload = {
        // Spread the existing object first so unknown/legacy keys survive a save.
        ...initialMeta,
        schemaVersion: 2,
        // Hero & Details tab (overrides the fields it owns).
        ...heroDraftToMetadata(heroDraft),
        sections: sectionFlags,
        theme: themeTokens,
        tabsConfig: tabsConfig,
        language,
        targetText: targetAudience,
        classTag: technology,
        teachers: teachers.filter((t) => t.name && t.name.trim().length > 0),
        schedule: schedule.filter((s) => s.subjects && s.subjects.trim().length > 0),
        aboutHighlights: aboutHighlights.filter((h) => h && h.trim().length > 0),
        faqs: faqs.filter((f) => f.question && f.question.trim().length > 0),
        demoSettings: {
          ...(initialMeta.demoSettings || {}),
          enabled: demoEnabled,
          topic: demoTopic,
          facultyName: demoFaculty,
          slots: dbSlots.map((s) => ({
            id: s.id,
            dateLabel: s.dateLabel,
            timeLabel: s.timeLabel,
            fullLabel: s.fullLabel,
            tag: s.topic,
          })),
        },
      }

      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          technology,
          description,
          price: Number(price),
          originalPrice: Number(originalPrice),
          discountPercent: Number(discountPercent),
          couponCode,
          couponDiscount: Number(couponDiscount),
          expiresAt,
          hasTrialLesson,
          isPremium,
          status,
          thumbnailUrl,
          theme: themeTokens,
          ...heroDraftToCourseColumns(heroDraft),
          metadataJson: JSON.stringify(metadataPayload),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update course")

      setCourse((prev) => ({
        ...prev,
        ...data,
      }))

      setSuccessMsg("Course specifications & pricing saved successfully!")
      setStudioDirty(false)
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save course")
    } finally {
      setIsSaving(false)
    }
  }

  // ==========================================
  // CHAPTER / SECTION CRUD
  // ==========================================

  // Add Chapter
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapterTitle.trim()) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: chapterTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add section")

      setChapters((prev) => [...prev, { ...data, lessons: [] }])
      setExpandedChapters((prev) => ({ ...prev, [data.id]: true }))
      setChapterTitle("")
      setShowAddChapterModal(false)
      setSuccessMsg(`Section "${data.title}" created successfully!`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add section")
    }
  }

  // Edit Chapter Modal Open
  const openEditChapter = (chapter: ChapterItem, index: number) => {
    setEditingChapter({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order ?? index + 1,
    })
  }

  // Save Edited Chapter
  const handleSaveEditChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingChapter || !editingChapter.title.trim()) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/chapters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: editingChapter.id,
          title: editingChapter.title.trim(),
          order: editingChapter.order,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update section")

      setChapters((prev) =>
        prev.map((ch) => (ch.id === editingChapter.id ? { ...ch, title: data.title, order: data.order } : ch))
      )
      setEditingChapter(null)
      setSuccessMsg(`Section title updated to "${data.title}"!`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update section")
    }
  }

  // Delete Chapter
  const handleDeleteChapter = async (chapterId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete section "${title}" and all its lessons? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/chapters?chapterId=${chapterId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete section")

      setChapters((prev) => prev.filter((c) => c.id !== chapterId))
      setSuccessMsg(`Section "${title}" deleted.`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete section")
    }
  }

  // ==========================================
  // ASSET UPLOADERS (PDF & VIDEO)
  // ==========================================

  // PDF / Document Uploader
  const handlePdfUpload = async (file: File) => {
    setIsUploadingPdf(true)
    setErrorMsg(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "course-docs")

      const res = await fetch("/api/admin/courses/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")

      setAttachmentUrl(data.url)
      setAttachmentType("PDF")
      if (!attachmentName) {
        setAttachmentName(file.name)
      }
      setSuccessMsg(`PDF "${file.name}" uploaded successfully!`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload document")
    } finally {
      setIsUploadingPdf(false)
    }
  }

  // Video File Uploader
  const handleVideoUpload = async (file: File) => {
    setIsUploadingVideo(true)
    setErrorMsg(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "course-videos")

      const res = await fetch("/api/admin/courses/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")

      setLessonVideoUrl(data.url)
      setLessonType("VIDEO")
      setSuccessMsg(`Video file "${file.name}" uploaded successfully!`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload video")
    } finally {
      setIsUploadingVideo(false)
    }
  }

  // Thumbnail File Uploader (for first video & course player poster)
  const handleThumbnailUpload = async (file: File) => {
    setIsUploadingThumbnail(true)
    setErrorMsg(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "thumbnails")

      const res = await fetch("/api/admin/courses/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")

      setThumbnailUrl(data.url)
      setThumbnailInputUrl(data.url)
      setSuccessMsg(`Thumbnail image "${file.name}" uploaded successfully! Remember to click Save Course.`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload thumbnail")
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  // Save Thumbnail Directly to Course
  const handleSaveThumbnail = async (newUrl: string) => {
    setThumbnailUrl(newUrl)
    setShowThumbnailModal(false)
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailUrl: newUrl }),
      })
      if (!res.ok) throw new Error("Failed to save thumbnail to course")
      setSuccessMsg("First video / course thumbnail saved!")
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save thumbnail")
    } finally {
      setIsSaving(false)
    }
  }

  // ==========================================
  // LESSON CRUD
  // ==========================================

  // Open Add Lesson Modal
  const openAddLesson = (chapterId: string) => {
    setTargetChapterId(chapterId)
    setLessonTitle("")
    setLessonType("VIDEO")
    setLessonDurationText("1h 30m 00s")
    setLessonVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    setIsTrial(false)
    setAttachmentType("PDF")
    setAttachmentName("")
    setAttachmentUrl("")
    setShowAddLessonModal(true)
  }

  // Open Edit Lesson Modal
  const openEditLesson = (lesson: LessonItem, chapterId: string) => {
    setEditingLesson({
      id: lesson.id,
      chapterId: chapterId,
      title: lesson.title,
      type: lesson.type,
      durationText: lesson.durationText || "",
      videoUrl: lesson.videoUrl || "",
      isTrial: Boolean(lesson.isTrial),
      attachmentType: (lesson.attachmentType as any) || "PDF",
      attachmentName: lesson.attachmentName || "",
      attachmentUrl: lesson.attachmentUrl || "",
    })

    // Populate active form state
    setLessonTitle(lesson.title)
    setLessonType((lesson.type as any) || "VIDEO")
    setLessonDurationText(lesson.durationText || "")
    setLessonVideoUrl(lesson.videoUrl || "")
    setIsTrial(Boolean(lesson.isTrial))
    setAttachmentType((lesson.attachmentType as any) || "PDF")
    setAttachmentName(lesson.attachmentName || "")
    setAttachmentUrl(lesson.attachmentUrl || "")
  }

  // Save New Lesson
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonTitle.trim() || !targetChapterId) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: targetChapterId,
          title: lessonTitle,
          type: lessonType,
          durationText: lessonDurationText,
          videoUrl: lessonVideoUrl || null,
          isTrial,
          attachmentType: attachmentUrl || attachmentName ? attachmentType : null,
          attachmentName: attachmentName || null,
          attachmentUrl: attachmentUrl || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add lesson")

      setChapters((prev) =>
        prev.map((ch) => {
          if (ch.id !== targetChapterId) return ch
          return {
            ...ch,
            lessons: [...ch.lessons, data],
          }
        })
      )

      setShowAddLessonModal(false)
      setSuccessMsg(`Lesson "${lessonTitle}" created!`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add lesson")
    }
  }

  // Save Edited Lesson
  const handleSaveEditLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLesson || !lessonTitle.trim()) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/lessons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: editingLesson.id,
          title: lessonTitle,
          type: lessonType,
          durationText: lessonDurationText,
          videoUrl: lessonVideoUrl || null,
          isTrial,
          attachmentType: attachmentUrl || attachmentName ? attachmentType : null,
          attachmentName: attachmentName || null,
          attachmentUrl: attachmentUrl || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update lesson")

      setChapters((prev) =>
        prev.map((ch) => {
          if (ch.id !== editingLesson.chapterId) return ch
          return {
            ...ch,
            lessons: ch.lessons.map((l) => (l.id === editingLesson.id ? { ...l, ...data } : l)),
          }
        })
      )

      setEditingLesson(null)
      setSuccessMsg(`Lesson "${lessonTitle}" updated successfully!`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update lesson")
    }
  }

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: string, chapterId: string, title?: string) => {
    if (!confirm(`Delete lesson "${title || "this lesson"}"?`)) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/lessons?lessonId=${lessonId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete lesson")

      setChapters((prev) =>
        prev.map((ch) => {
          if (ch.id !== chapterId) return ch
          return {
            ...ch,
            lessons: ch.lessons.filter((l) => l.id !== lessonId),
          }
        })
      )
      setSuccessMsg("Lesson deleted.")
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete lesson")
    }
  }

  // Quick Remove Attachment from Lesson (Inline)
  const handleQuickRemoveAttachment = async (lesson: LessonItem, chapterId: string) => {
    if (!confirm(`Remove attachment "${lesson.attachmentName || "PDF"}" from this lesson?`)) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/lessons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          attachmentName: null,
          attachmentUrl: null,
          attachmentType: null,
        }),
      })
      if (!res.ok) throw new Error("Failed to remove attachment")

      setChapters((prev) =>
        prev.map((ch) => {
          if (ch.id !== chapterId) return ch
          return {
            ...ch,
            lessons: ch.lessons.map((l) =>
              l.id === lesson.id ? { ...l, attachmentName: null, attachmentUrl: null, attachmentType: null } : l
            ),
          }
        })
      )
      setSuccessMsg("Attachment removed from lesson.")
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove attachment")
    }
  }

  // Quick Remove Video from Lesson (Inline)
  const handleQuickRemoveVideo = async (lesson: LessonItem, chapterId: string) => {
    if (!confirm(`Remove video from "${lesson.title}"?`)) return

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/lessons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          videoUrl: null,
        }),
      })
      if (!res.ok) throw new Error("Failed to remove video")

      setChapters((prev) =>
        prev.map((ch) => {
          if (ch.id !== chapterId) return ch
          return {
            ...ch,
            lessons: ch.lessons.map((l) => (l.id === lesson.id ? { ...l, videoUrl: null } : l)),
          }
        })
      )
      setSuccessMsg("Video removed from lesson.")
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove video")
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 pb-24">
      {/* Top Header & Save Bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={coursesUrl}
              className="text-xs font-semibold text-gray-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Video Course Studio
            </Link>
            <div className="h-4 w-[1px] bg-gray-200" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Video Course Studio &bull; Teacher & Admin Editor
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                hindiMissing > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
              }`}
              title="Hindi coverage across course text, teachers and FAQs"
            >
              {hindiBadgeLabel(hindiMissing)}
            </span>

            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5"
              title="Browse and load course templates"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Templates</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCompletenessModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors flex items-center gap-1.5"
              title="Course Completeness Checklist"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${completeness.percent === 100 ? "text-emerald-600" : "text-amber-500"}`} />
              <span>Checklist ({completeness.percent}%)</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicateCourse}
              disabled={isDuplicating}
              className="hidden md:flex px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors items-center gap-1.5"
              title="Duplicate course"
            >
              <Copy className="w-3.5 h-3.5 text-gray-600" />
              <span>{isDuplicating ? "Copying..." : "Duplicate"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="hidden lg:flex px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors items-center gap-1.5"
              title="Export course configuration to JSON"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Export</span>
            </button>

            <label
              className="hidden lg:flex px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors items-center gap-1.5 cursor-pointer"
              title="Import course configuration from JSON"
            >
              <FileUp className="w-3.5 h-3.5 text-gray-600" />
              <span>Import</span>
              <input type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
            </label>

            <Link
              href={isTeacher ? `/teacher/tutorials/${course.id}/edit` : `/admin/tutorials/${course.id}/edit`}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#3A10E5]" />
              Rosera
            </Link>

            <Link
              href={`/courses/${slug || course.slug}`}
              target="_blank"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Student Page
            </Link>

            <button
              type="button"
              onClick={() => setShowLivePreview(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-purple-600" />
              <span>Live Preview</span>
            </button>

            {lastAutosaved && (
              <span className="hidden xl:inline-block text-[11px] text-gray-500 font-medium">
                Draft: {lastAutosaved}
              </span>
            )}

            <button
              onClick={handleSaveCourse}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm shadow-orange-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Saving..." : "Save Course"}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Course Header Input Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs mb-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Course Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-xl sm:text-2xl font-extrabold text-gray-900 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>URL Slug</span>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Permanent</span>
              </label>
              <input
                type="text"
                value={slug}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-gray-500 bg-gray-100 cursor-not-allowed select-all"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Category / Goal *</label>
              <select
                value={technology}
                onChange={(e) => setTechnology(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="Skills & Tech">Skills & Tech (Coding & Dev)</option>
                {EXAM_CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {EXAM_CATEGORIES.filter((cat) => cat.group === group).map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {technology && !isKnownExamCategory(technology) && (
                  <option value={technology}>{technology} (custom)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="PUBLISHED">Published (Live for Students)</option>
                <option value="DRAFT">Draft (Under Review)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Access Mode</label>
              <div className="flex items-center gap-4 mt-2 font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={isPremium}
                    onChange={() => setIsPremium(true)}
                    className="text-orange-600"
                  />
                  Paid Bundle
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isPremium}
                    onChange={() => setIsPremium(false)}
                    className="text-orange-600"
                  />
                  100% Free
                </label>
              </div>
            </div>
          </div>

          {/* First Video & Course Thumbnail Bar */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-24 h-14 rounded-xl overflow-hidden border-2 border-orange-200 bg-gray-100 shrink-0 shadow-2xs">
                <img
                  src={thumbnailUrl || "/placeholder-course.svg"}
                  alt="First Video Thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white drop-shadow" />
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                  First Video & Course Thumbnail
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Poster image shown on student course card and before playing first video
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 cursor-pointer transition-colors flex items-center gap-1.5">
                {isUploadingThumbnail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-orange-600" />
                    <span>Upload Thumbnail</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.webp"
                  disabled={isUploadingThumbnail}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleThumbnailUpload(e.target.files[0])
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setThumbnailInputUrl(thumbnailUrl)
                  setShowThumbnailModal(true)
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3 text-orange-600" />
                <span>Set / Edit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Studio Section Tabs: Syllabus, Teachers, Schedule, Highlights, FAQs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-xs mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("hero")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "hero"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Hero & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("theme")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "theme"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Theme & Colors</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tabs")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "tabs"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Nav Tabs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("plan")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "plan"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Course Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("examSyllabus")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "examSyllabus"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Exam Syllabus</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "leads"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Callback Leads</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "sections"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Sections</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("syllabus")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "syllabus"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Syllabus & Lectures</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === "syllabus" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {chapters.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("teachers")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "teachers"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Faculty & Teachers</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === "teachers" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {teachers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "schedule"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Weekly Schedule</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === "schedule" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {schedule.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("highlights")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "highlights"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>About Highlights</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === "highlights" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {aboutHighlights.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("faqs")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "faqs"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQs & Support</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === "faqs" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {faqs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coupons")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "coupons"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Coupons & Promotions</span>
          </button>
        </div>

        {/* 2-Column Split: Left Chapters Accordion & Right Pricing/Coupon Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Syllabus Section / Chapter CRUD */}
          <div className="lg:col-span-8 space-y-6">
            {activeTab === "hero" && (
              <HeroDetailsTab
                draft={heroDraft}
                onChange={(patch) => {
                  patchHeroDraft(patch)
                  if (patch.category !== undefined) setTechnology(patch.category)
                  if (patch.language !== undefined) setLanguage(patch.language)
                }}
                title={title}
                onTitleChange={(value) => {
                  setTitle(value)
                  setStudioDirty(true)
                }}
                description={description}
                onDescriptionChange={(value) => {
                  setDescription(value)
                  setStudioDirty(true)
                }}
              />
            )}

            {activeTab === "theme" && (
              <ThemeTab
                theme={themeTokens}
                onChange={patchThemeTokens}
                onReset={resetThemeTokens}
              />
            )}

            {activeTab === "tabs" && (
              <TabsTab
                tabs={tabsConfig}
                onChange={patchTabsConfig}
                onReset={resetTabsConfig}
              />
            )}

            {activeTab === "plan" && (
              <CoursePlanTab
                courseId={course.id}
                chapters={chapters.map((chapter) => ({
                  id: chapter.id,
                  title: chapter.title,
                  unitId: chapter.unitId ?? null,
                }))}
                onChaptersChanged={() => router.refresh()}
              />
            )}

            {activeTab === "examSyllabus" && (
              <ExamSyllabusTab
                courseId={course.id}
                chapters={chapters.map((chapter) => ({ id: chapter.id, title: chapter.title }))}
              />
            )}

            {activeTab === "leads" && <CallbackLeadsTab courseId={course.id} />}

            {activeTab === "sections" && (
              <SectionsTab
                flags={sectionFlags}
                onFlagsChange={changeSectionFlags}
                metadata={initialMeta}
                heroFields={heroDraft as unknown as Record<string, unknown>}
              />
            )}

            {activeTab === "syllabus" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Syllabus Structure</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {chapters.length} Sections &bull;{" "}
                    {chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)} total lessons
                  </p>
                </div>
                <button
                  onClick={() => setShowAddChapterModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Section / Chapter
                </button>
              </div>

              {/* Numbered Chapters Accordion (01, 02, 03... format) */}
              <div className="divide-y divide-gray-100">
                {chapters.map((chapter, idx) => {
                  const isExpanded = !!expandedChapters[chapter.id]
                  const formattedNum = String(idx + 1).padStart(2, "0")
                  const attachmentsCount = chapter.lessons.filter(
                    (l) => l.attachmentName || l.attachmentUrl
                  ).length

                  return (
                    <div key={chapter.id} className="transition-colors">
                      {/* Chapter Item Header */}
                      <div
                        className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${
                          isExpanded ? "bg-gray-50/70" : "hover:bg-gray-50/40"
                        }`}
                      >
                        <div
                          onClick={() => toggleChapter(chapter.id)}
                          className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="font-mono text-sm font-bold text-gray-400 shrink-0">
                            {formattedNum}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug flex items-center gap-2">
                              <span>{chapter.title}</span>
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              <span>{chapter.lessons.length} lessons</span>
                              {attachmentsCount > 0 && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-indigo-600 font-medium">{attachmentsCount} attachments (PDFs/Docs)</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chapter Actions: Edit Section, Add Lesson, Delete Section */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* EDIT SECTION TITLE BUTTON */}
                          <button
                            onClick={() => openEditChapter(chapter, idx)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-1"
                            title="Edit section title & order"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                            <span>Edit Section</span>
                          </button>

                          {/* ADD LESSON BUTTON */}
                          <button
                            onClick={() => openAddLesson(chapter.id)}
                            className="px-2.5 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Add video, PDF, or article to this section"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Lesson</span>
                          </button>

                          {/* DELETE SECTION BUTTON */}
                          <button
                            onClick={() => handleDeleteChapter(chapter.id, chapter.title)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Section"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* COLLAPSE/EXPAND TOGGLE */}
                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Lessons List within Chapter */}
                      {isExpanded && (
                        <div className="bg-gray-50/40 divide-y divide-gray-100/90 px-4 sm:px-6 py-2">
                          {chapter.lessons.length === 0 ? (
                            <div className="py-6 text-center text-xs text-gray-400">
                              No lessons in this section yet. Click &quot;+ Lesson&quot; to upload videos or PDFs.
                            </div>
                          ) : (
                            chapter.lessons.map((lesson, lIdx) => {
                              const isPdf = lesson.attachmentType === "PDF" || lesson.type === "READING"
                              const isLive = lesson.attachmentType === "LIVE"
                              const isVideo = lesson.type === "VIDEO" || lesson.attachmentType === "VIDEO"
                              const hasVideo = !!lesson.videoUrl
                              const hasPdf = !!(lesson.attachmentUrl || lesson.attachmentName)

                              return (
                                <div
                                  key={lesson.id}
                                  className="py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-200"
                                >
                                  {/* Left: Lesson Metadata */}
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-0.5 shrink-0 text-gray-400">
                                      {isLive ? (
                                        <Radio className="w-4 h-4 text-red-500" />
                                      ) : isVideo ? (
                                        <Video className="w-4 h-4 text-sky-500" />
                                      ) : (
                                        <FileText className="w-4 h-4 text-amber-500" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                          {lesson.title}
                                        </span>
                                        {lesson.isTrial && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                            1 Trial
                                          </span>
                                        )}
                                      </div>

                                      {/* Sub-labels: Duration, Video Status, PDF Attachment */}
                                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-500 mt-1">
                                        <span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">
                                          {isLive ? "Live Session" : isVideo ? "Video Lecture" : "Article"}
                                        </span>

                                        {lesson.durationText && <span>&bull; {lesson.durationText}</span>}

                                        {/* Video status indicator with quick delete */}
                                        {hasVideo && (
                                          <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-medium">
                                            <Video className="w-3 h-3 text-sky-600" />
                                            <span>Video Attached</span>
                                            <button
                                              onClick={() => handleQuickRemoveVideo(lesson, chapter.id)}
                                              title="Delete Video from lesson"
                                              className="ml-1 text-gray-400 hover:text-red-600"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </span>
                                        )}

                                        {/* PDF Attachment status with quick delete */}
                                        {hasPdf && (
                                          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                                            <FileText className="w-3 h-3 text-indigo-600" />
                                            <span className="truncate max-w-[200px]">
                                              {lesson.attachmentName || "Attached PDF"}
                                            </span>
                                            <button
                                              onClick={() => handleQuickRemoveAttachment(lesson, chapter.id)}
                                              title="Delete PDF from lesson"
                                              className="ml-1 text-gray-400 hover:text-red-600"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Lesson Action Buttons */}
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                    {/* SET / EDIT FIRST VIDEO THUMBNAIL */}
                                    {idx === 0 && lIdx === 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setThumbnailInputUrl(thumbnailUrl)
                                          setShowThumbnailModal(true)
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                        title="Set or Edit Video Player Poster Thumbnail"
                                      >
                                        <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Video Thumbnail</span>
                                      </button>
                                    )}

                                    {/* EDIT LESSON BUTTON */}
                                    <button
                                      onClick={() => openEditLesson(lesson, chapter.id)}
                                      className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                      title="Edit lesson details, video, and PDF"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                                      <span>Edit</span>
                                    </button>

                                    {/* DELETE LESSON BUTTON */}
                                    <button
                                      onClick={() => handleDeleteLesson(lesson.id, chapter.id, lesson.title)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Lesson"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            )}

            {/* TAB 2: Faculty & Teachers Manager */}
            {activeTab === "teachers" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <span>Faculty & Instructors</span>
                      <GraduationCap className="w-5 h-5 text-orange-600" />
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Manage educators, designations, qualifications & photos displayed on the student page
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTeacher}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Faculty
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {teachers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500">
                      No faculty added yet. Click &quot;Add Faculty&quot; above to introduce course instructors.
                    </div>
                  ) : (
                    teachers.map((teacher, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveTeacher(idx, "up")}
                                aria-label="Move instructor up"
                                className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === teachers.length - 1}
                                onClick={() => handleMoveTeacher(idx, "down")}
                                aria-label="Move instructor down"
                                className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Faculty #{idx + 1}
                            </span>
                            {teacher.isPrimary && (
                              <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-800 uppercase tracking-wider">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(teacher.isPrimary)}
                                onChange={(e) => handleUpdateTeacher(idx, "isPrimary", e.target.checked)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span>Primary Instructor</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeacher(idx)}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                            <input
                              type="text"
                              value={teacher.name || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "name", e.target.value)}
                              placeholder="e.g. Dr. Rajesh Sharma"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Full Name (Hindi)</label>
                            <input
                              type="text"
                              value={teacher.nameHi || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "nameHi", e.target.value)}
                              placeholder="e.g. डॉ. राजेश शर्मा"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Role / Designation (English) *</label>
                            <input
                              type="text"
                              value={teacher.role || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "role", e.target.value)}
                              placeholder="e.g. Senior Faculty & Mentor"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Role / Designation (Hindi)</label>
                            <input
                              type="text"
                              value={teacher.roleHi || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "roleHi", e.target.value)}
                              placeholder="e.g. वरिष्ठ शिक्षक एवं मेंटर"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block font-bold text-gray-700 mb-1">Credentials (comma separated, shown under teacher name)</label>
                            <input
                              type="text"
                              value={teacher.credentials || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "credentials", e.target.value)}
                              placeholder="e.g. Subject Specialist, 10+ Yrs Experience, Ph.D, Author"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Subject Specialty</label>
                            <input
                              type="text"
                              value={teacher.subject || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "subject", e.target.value)}
                              placeholder="e.g. Polity & Governance"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Avatar / Photo URL</label>
                            <div className="flex items-center gap-2">
                              {teacher.avatar && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 bg-purple-100 shrink-0 relative">
                                  <img
                                    src={teacher.avatar}
                                    alt={teacher.name || "Teacher"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <input
                                type="text"
                                value={teacher.avatar || ""}
                                onChange={(e) => handleUpdateTeacher(idx, "avatar", e.target.value)}
                                placeholder="/curious-avatar.svg"
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
                              />
                              <label className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer transition-colors shrink-0 shadow-xs text-xs">
                                {uploadingTeacherIndex === idx ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) handleUploadTeacherPhoto(idx, f)
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Bio / Statement (English)</label>
                            <textarea
                              rows={2}
                              value={teacher.bio || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "bio", e.target.value)}
                              placeholder="Short statement or mentoring highlights..."
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Bio / Statement (Hindi)</label>
                            <textarea
                              rows={2}
                              value={teacher.bioHi || ""}
                              onChange={(e) => handleUpdateTeacher(idx, "bioHi", e.target.value)}
                              placeholder="संक्षिप्त विवरण या मेंटरिंग की मुख्य बातें..."
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Weekly Schedule & Routine Manager */}
            {activeTab === "schedule" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <span>Weekly Class Routine & Schedule</span>
                      <Clock className="w-5 h-5 text-orange-600" />
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Define days, timings, and learning routines shown in the Schedule section
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddScheduleItem}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Routine Slot
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Medium / Language & Target Exam Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-100 text-xs">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Teaching Language / Medium *</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold text-gray-800"
                      >
                        {COURSE_LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Target Exam / Goal Audience</label>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. Targeted for UPSC CSE 2026 Aspirants"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Schedule items */}
                  {schedule.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500">
                      No routine slots added yet. Click &quot;Add Routine Slot&quot; to configure timetable.
                    </div>
                  ) : (
                    schedule.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Routine Slot #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteScheduleItem(idx)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Days / Frequency *</label>
                            <input
                              type="text"
                              value={item.day || ""}
                              onChange={(e) => handleUpdateScheduleItem(idx, "day", e.target.value)}
                              placeholder="e.g. Monday - Friday"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Subjects / Focus *</label>
                            <input
                              type="text"
                              value={item.subjects || ""}
                              onChange={(e) => handleUpdateScheduleItem(idx, "subjects", e.target.value)}
                              placeholder="e.g. Core Video Modules"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Timing *</label>
                            <input
                              type="text"
                              value={item.time || ""}
                              onChange={(e) => handleUpdateScheduleItem(idx, "time", e.target.value)}
                              placeholder="e.g. Flexible 24/7 Access"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Session Type *</label>
                            <select
                              value={item.type || "Video Lectures"}
                              onChange={(e) => handleUpdateScheduleItem(idx, "type", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold text-gray-800"
                            >
                              <option value="Video Lectures">Video Lectures</option>
                              <option value="Live Class">Live Class</option>
                              <option value="Revision & Notes">Revision & Notes</option>
                              <option value="Practice Assessment">Practice Assessment</option>
                              <option value="Doubt Clearing">Doubt Clearing</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: About Highlights Manager */}
            {activeTab === "highlights" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <span>Course Highlights & Inclusions</span>
                      <Sparkles className="w-5 h-5 text-orange-600" />
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Bullet points displayed with green checkmarks under &quot;Key Course Highlights&quot;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Highlight
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  {aboutHighlights.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500">
                      No highlights added yet. Click &quot;Add Highlight&quot; to highlight course USPs.
                    </div>
                  ) : (
                    aboutHighlights.map((hl, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={hl}
                          onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                          placeholder="e.g. Comprehensive video syllabus with structured step-by-step clarity"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-orange-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteHighlight(idx)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                          title="Delete Highlight"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: FAQs & Support Manager */}
            {activeTab === "faqs" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <span>Frequently Asked Questions (FAQs)</span>
                      <HelpCircle className="w-5 h-5 text-orange-600" />
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Custom Q&A items shown in the collapsible accordion on the course details page
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {faqs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500">
                      No FAQs added yet. Click &quot;Add Question&quot; to answer common student inquiries.
                    </div>
                  ) : (
                    faqs.map((faq, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveFaq(idx, "up")}
                                aria-label="Move FAQ up"
                                className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === faqs.length - 1}
                                onClick={() => handleMoveFaq(idx, "down")}
                                aria-label="Move FAQ down"
                                className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              FAQ #{idx + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteFaq(idx)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Question (English) *</label>
                              <input
                                type="text"
                                value={faq.question || ""}
                                onChange={(e) => handleUpdateFaq(idx, "question", e.target.value)}
                                placeholder="e.g. How do I access video lectures and notes after enrolling?"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Question (Hindi)</label>
                              <input
                                type="text"
                                value={faq.questionHi || ""}
                                onChange={(e) => handleUpdateFaq(idx, "questionHi" as any, e.target.value)}
                                placeholder="e.g. नामांकन के बाद वीडियो और नोट्स कैसे एक्सेस करें?"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Answer (English) *</label>
                              <textarea
                                rows={2}
                                value={faq.answer || ""}
                                onChange={(e) => handleUpdateFaq(idx, "answer", e.target.value)}
                                placeholder="Enter clear, helpful answer for prospective students..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Answer (Hindi)</label>
                              <textarea
                                rows={2}
                                value={faq.answerHi || ""}
                                onChange={(e) => handleUpdateFaq(idx, "answerHi" as any, e.target.value)}
                                placeholder="छात्रों के लिए स्पष्ट उत्तर दर्ज करें..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "coupons" && (
              <div className="space-y-6">
                <CourseCouponsManager
                  courseId={course.id}
                  courseSlug={course.slug}
                  courseTitle={course.title}
                  coursePrice={price}
                  thumbnailUrl={thumbnailUrl}
                />
              </div>
            )}
          </div>

          {/* Right Column (4 cols): Course Pricing, Coupon Code & Expiry Studio */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">
                Monetization & Offers Studio
              </h3>

              {/* Pricing Controls */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Selling Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => handlePriceChange(Number(e.target.value), originalPrice)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Original Price / MRP (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => handlePriceChange(price, Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>Calculated Discount:</span>
                  <span className="font-bold text-emerald-600">{discountPercent}% OFF</span>
                </div>
              </div>

              {/* Coupon Code Section */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <Ticket className="w-4 h-4 text-orange-600" />
                  <span>Offer Coupon Code</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Coupon Code
                    </label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="OFF50"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      value={couponDiscount}
                      onChange={(e) => setCouponDiscount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Expiry Date */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Access Expiry / Duration
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    placeholder="e.g. Oct 30, 2026"
                    className="w-full px-2.5 py-1.5 text-xs font-medium rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              {/* Trial Lesson Toggle */}
              <div className="pt-3 border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTrialLesson}
                    onChange={(e) => setHasTrialLesson(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Enable Free Trial Lesson</span>
                </label>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  onClick={handleSaveCourse}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-sm shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Apply & Save Specifications"}
                </button>
              </div>
            </div>

            {/* LIVE DEMO CLASS & SLOTS STUDIO */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-950">
                    Live Demo & Slot Scheduling
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Ad Funnel
                </span>
              </div>

              {/* Toggle switch for student course page */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                <label className="flex items-center justify-between text-xs font-bold text-gray-800 cursor-pointer">
                  <span>Enable "Schedule Demo" on Course</span>
                  <input
                    type="checkbox"
                    checked={demoEnabled}
                    onChange={(e) => setDemoEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <p className="text-[11px] text-gray-500 mt-1">
                  When enabled, students see the "Schedule Free Demo Class" button under Buy Now.
                </p>
              </div>

              {/* Demo Lecture Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Demo Lecture Topic / Title
                  </label>
                  <input
                    type="text"
                    value={demoTopic}
                    onChange={(e) => setDemoTopic(e.target.value)}
                    placeholder="e.g. Strategy & Trend Analysis for the upcoming attempt"
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Host Faculty Name
                  </label>
                  <input
                    type="text"
                    value={demoFaculty}
                    onChange={(e) => setDemoFaculty(e.target.value)}
                    placeholder="e.g. Prof. Rajesh Sharma"
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Agora Usage & Minutes Counter */}
              <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                  <span>Estimated Agora Usage This Month</span>
                  <span>{totalEstimatedMinutes.toLocaleString()} / 10,000 mins</span>
                </div>
                <div className="w-full bg-purple-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalEstimatedMinutes / 10000) * 100)}%` }}
                  />
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-purple-800 font-semibold pt-1">
                  <div className="flex items-center justify-between">
                    <span>Audience Watch: {audienceMinutesUsed}m</span>
                    <span>Host Sessions: {hostMinutesUsed}m</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-700">
                    <span>Student Stage Minutes: {stageMinutesUsed}m (Publisher stream)</span>
                    <span>{Math.max(0, 10000 - totalEstimatedMinutes).toLocaleString()} mins remaining</span>
                  </div>
                </div>
                <p className="text-[10px] text-purple-600/90 leading-tight pt-1 border-t border-purple-200/60">
                  * Note: Estimate of audience watch minutes + teacher host sessions + student on-stage streams. Screen-sharing streams, cloud recording, and transcoding are billed separately. Final verified billing is in the Agora Console.
                </p>
              </div>

              {/* View Full Demo Attendance & UTM Analytics Report */}
              <button
                type="button"
                onClick={async () => {
                  setIsLoadingReport(true)
                  setShowDemoReportModal(true)
                  try {
                    const res = await fetch(`/api/admin/courses/${initialCourse.id}/demo-report`)
                    const data = await res.json()
                    if (data.success) {
                      setDemoReportData(data)
                    }
                  } catch (e) {
                    toast.error("Failed to load demo attendance report")
                  } finally {
                    setIsLoadingReport(false)
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>📊 View Demo Attendance &amp; UTM Report</span>
              </button>

              {/* Slots List from PostgreSQL */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real Scheduled Slots ({dbSlots.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={fetchDbSlots}
                    className="text-[10px] text-emerald-700 font-bold hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {dbSlots.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No slots scheduled yet. Pick a date & time below to schedule one.
                    </div>
                  ) : (
                    dbSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-2.5 rounded-xl border border-gray-200 bg-white shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                            <span>{slot.dateLabel}</span>
                            <span className="text-emerald-700 font-extrabold">• {slot.timeLabel}</span>
                            {slot.status === "LIVE" && (
                              <span className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-black uppercase animate-pulse">
                                LIVE NOW
                              </span>
                            )}
                            {slot.isExpired && slot.status !== "LIVE" && (
                              <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[9px] font-bold">
                                EXPIRED
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 flex-wrap">
                            <span>{slot.topic}</span>
                            <span>•</span>
                            <span className="text-blue-600 font-bold">{slot.bookingCount || 0} registered</span>
                            <span>•</span>
                            <span>Max: {slot.maxAudience || 100}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDbSlot(slot.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Slot Real Form */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
                  <span className="text-[11px] font-bold text-gray-800 block">+ Schedule New Slot</span>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 mb-1 block">
                        Start Date & Time (Select in your local timezone)
                      </label>
                      <input
                        type="datetime-local"
                        value={newSlotDateTime}
                        onChange={(e) => setNewSlotDateTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 mb-0.5 block">Duration (Mins)</label>
                        <input
                          type="number"
                          min="15"
                          max="180"
                          value={newSlotDuration}
                          onChange={(e) => setNewSlotDuration(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-600 mb-0.5 block">Max Audience</label>
                        <input
                          type="number"
                          min="10"
                          max="1000"
                          value={newSlotMaxAudience}
                          onChange={(e) => setNewSlotMaxAudience(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isAddingDbSlot}
                    onClick={handleAddDbSlot}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isAddingDbSlot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isAddingDbSlot ? "Scheduling Slot..." : "Add Live Demo Slot"}</span>
                  </button>
                </div>
              </div>

              {/* Social Media & Ad Campaign Link with UTM Variants */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Social Media & Ad Campaign URLs</span>
                  </span>
                </div>
                <div className="space-y-1.5">
                  {/* Facebook Variant */}
                  <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-xl border border-blue-200/80 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-[10px] font-black text-blue-700 block uppercase tracking-wider">Facebook Ads</span>
                      <span className="text-[11px] font-mono text-gray-700 truncate block">
                        {typeof window !== "undefined" ? `${window.location.origin}/courses/${slug}?utm_source=facebook&utm_campaign=demo_ads` : `/courses/${slug}?utm_source=facebook`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(`${window.location.origin}/courses/${slug}?utm_source=facebook&utm_campaign=demo_ads`)
                          setCopiedVariant("fb")
                          setTimeout(() => setCopiedVariant(null), 2000)
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-blue-300 text-[11px] font-bold text-blue-800 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedVariant === "fb" ? "Copied ✓" : "Copy FB Link"}
                    </button>
                  </div>

                  {/* Instagram Variant */}
                  <div className="flex items-center justify-between bg-pink-50/70 p-2 rounded-xl border border-pink-200/80 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-[10px] font-black text-pink-700 block uppercase tracking-wider">Instagram Ads</span>
                      <span className="text-[11px] font-mono text-gray-700 truncate block">
                        {typeof window !== "undefined" ? `${window.location.origin}/courses/${slug}?utm_source=instagram&utm_campaign=demo_ads` : `/courses/${slug}?utm_source=instagram`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(`${window.location.origin}/courses/${slug}?utm_source=instagram&utm_campaign=demo_ads`)
                          setCopiedVariant("ig")
                          setTimeout(() => setCopiedVariant(null), 2000)
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-pink-50 border border-pink-300 text-[11px] font-bold text-pink-800 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedVariant === "ig" ? "Copied ✓" : "Copy IG Link"}
                    </button>
                  </div>

                  {/* Direct Base Link */}
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-200 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-[10px] font-black text-gray-600 block uppercase tracking-wider">Standard Direct Link</span>
                      <span className="text-[11px] font-mono text-gray-700 truncate block">
                        {typeof window !== "undefined" ? `${window.location.origin}/courses/${slug}` : `/courses/${slug}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(`${window.location.origin}/courses/${slug}`)
                          setCopiedVariant("base")
                          setTimeout(() => setCopiedVariant(null), 2000)
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-[11px] font-bold text-gray-800 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedVariant === "base" ? "Copied ✓" : "Copy Link"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Studio Launch - Test Mode */}
              <div className="pt-2">
                <Link
                  href={`/courses/${slug}/demo?testMode=true`}
                  target="_blank"
                  className="w-full py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Open Live Demo Room Preview (Test Mode) →</span>
                </Link>
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  Preview mode for testing only: no student bookings or WhatsApp messages are recorded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Add Section / Chapter */}
      {/* ======================================================== */}
      {showAddChapterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">Add New Syllabus Section</h3>
              <button onClick={() => setShowAddChapterModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Section Title (e.g. Budget 2026-27, Modern History, Yearly Lectures)
                </label>
                <input
                  type="text"
                  required
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g. Modern History, Budget & Economy, Weekly Revision"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Edit Section / Chapter Title & Order */}
      {/* ======================================================== */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">Edit Section / Chapter Title</h3>
              <button onClick={() => setEditingChapter(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Section Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingChapter.title}
                  onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                  placeholder="Section Title"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Section Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingChapter.order}
                  onChange={(e) => setEditingChapter({ ...editingChapter, order: Number(e.target.value) })}
                  className="w-24 px-3 py-1.5 text-xs rounded-xl border border-gray-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm"
                >
                  Save Section Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Add Lesson (Video / PDF / Attachments) */}
      {/* ======================================================== */}
      {showAddLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">Add New Lesson & Attachments</h3>
              <button onClick={() => setShowAddLessonModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Budget 2026-27 or Important Topics"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Lesson Type</label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  >
                    <option value="VIDEO">Video Lecture</option>
                    <option value="READING">Document / PDF Article</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Duration Text</label>
                  <input
                    type="text"
                    value={lessonDurationText}
                    onChange={(e) => setLessonDurationText(e.target.value)}
                    placeholder="1h 45m 00s"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              {/* VIDEO MANAGEMENT BOX: Upload or Embed URL */}
              <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-sky-600" /> Video Lecture Media
                  </span>
                  {lessonVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setLessonVideoUrl("")}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Video
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Option 1: Video File Upload (MP4 / WebM / MOV)
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-sky-50 hover:border-sky-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        <span>Uploading Video File...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-3.5 h-3.5 text-sky-600" />
                        <span>Upload Video File</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/*,.mp4,.webm,.mov,.mkv"
                      disabled={isUploadingVideo}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleVideoUpload(e.target.files[0])
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Option 2: Video Stream / YouTube / HLS URL
                  </label>
                  <input
                    type="text"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or /uploads/..."
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>
              </div>

              {/* ATTACHMENT BOX: PDF / Doc / Notes Upload & Delete */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" /> PDF Document & Notes Attachment
                  </span>
                  {attachmentUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl("")
                        setAttachmentName("")
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove PDF
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Attachment Display Name
                    </label>
                    <input
                      type="text"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      placeholder="e.g. Budget Summary Charts.pdf"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Type
                    </label>
                    <select
                      value={attachmentType}
                      onChange={(e) => setAttachmentType(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                    >
                      <option value="PDF">PDF Attachment</option>
                      <option value="ARTICLE">Article / Link</option>
                      <option value="LIVE">Live Session Link</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Upload PDF / Document File
                  </label>
                  {attachmentUrl ? (
                    <div className="p-2.5 bg-white border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-gray-900 truncate">
                          {attachmentName || "Attached PDF"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 hover:underline"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentUrl("")
                            setAttachmentName("")
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                      {isUploadingPdf ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>Uploading Document...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Choose PDF or Document</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        disabled={isUploadingPdf}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePdfUpload(e.target.files[0])
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Trial Lesson Toggle */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTrial}
                    onChange={(e) => setIsTrial(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Mark as Free Trial Lesson (Students can preview this without buying bundle)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddLessonModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Edit Lesson (Full Edit: Video, PDF, Title, Trial) */}
      {/* ======================================================== */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">Edit Lesson & Media Assets</h3>
              <button onClick={() => setEditingLesson(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Lesson Title"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Lesson Type</label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  >
                    <option value="VIDEO">Video Lecture</option>
                    <option value="READING">Document / PDF Article</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Duration Text</label>
                  <input
                    type="text"
                    value={lessonDurationText}
                    onChange={(e) => setLessonDurationText(e.target.value)}
                    placeholder="1h 45m 00s"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              {/* VIDEO MANAGEMENT BOX: Upload Video File OR Replace URL OR Delete Video */}
              <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-sky-600" /> Video Lecture Media
                  </span>
                  {lessonVideoUrl ? (
                    <button
                      type="button"
                      onClick={() => setLessonVideoUrl("")}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-red-200"
                    >
                      <Trash2 className="w-3 h-3" /> Delete / Remove Video
                    </button>
                  ) : null}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Upload New Video File (.mp4, .webm, .mov)
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-sky-50 hover:border-sky-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        <span>Uploading Video File...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-3.5 h-3.5 text-sky-600" />
                        <span>Upload Video</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/*,.mp4,.webm,.mov,.mkv"
                      disabled={isUploadingVideo}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleVideoUpload(e.target.files[0])
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Video Stream / YouTube / CloudFront URL
                  </label>
                  <input
                    type="text"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or /uploads/..."
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white"
                  />
                </div>

                {/* FIRST VIDEO THUMBNAIL POSTER BOX */}
                <div className="pt-2 border-t border-sky-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-12 h-7 rounded bg-gray-200 overflow-hidden border border-amber-300 shrink-0">
                      <img src={thumbnailUrl || "/placeholder-course.svg"} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-sky-950 block truncate">Video Player Poster Thumbnail</span>
                      <span className="text-[10px] text-gray-500 block">Poster shown on player before video starts</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailInputUrl(thumbnailUrl)
                      setShowThumbnailModal(true)
                    }}
                    className="px-2 py-1 text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-lg shadow-2xs shrink-0 transition-colors"
                  >
                    Set / Edit
                  </button>
                </div>
              </div>

              {/* ATTACHMENT BOX: PDF Upload & Delete */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" /> PDF Document & Notes Attachment
                  </span>
                  {attachmentUrl || attachmentName ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl("")
                        setAttachmentName("")
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-red-200"
                    >
                      <Trash2 className="w-3 h-3" /> Delete / Remove PDF
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Attachment Display Name
                    </label>
                    <input
                      type="text"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      placeholder="e.g. Budget Summary Charts.pdf"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Type
                    </label>
                    <select
                      value={attachmentType}
                      onChange={(e) => setAttachmentType(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                    >
                      <option value="PDF">PDF Attachment</option>
                      <option value="ARTICLE">Article / Link</option>
                      <option value="LIVE">Live Session Link</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Upload or Replace PDF Document
                  </label>
                  {attachmentUrl ? (
                    <div className="p-2.5 bg-white border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-gray-900 truncate">
                          {attachmentName || "Attached PDF"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 hover:underline"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentUrl("")
                            setAttachmentName("")
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                      {isUploadingPdf ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>Uploading Document...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload PDF Document</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        disabled={isUploadingPdf}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePdfUpload(e.target.files[0])
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Trial Lesson Toggle */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTrial}
                    onChange={(e) => setIsTrial(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Mark as Free Trial Lesson (Students can preview this without buying bundle)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: Set / Edit First Video & Course Thumbnail */}
      {/* ======================================================== */}
      {showThumbnailModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  First Video & Course Player Thumbnail
                </h3>
              </div>
              <button
                onClick={() => setShowThumbnailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              This poster image is displayed before the first video lecture starts playing and represents the course across student dashboards.
            </p>

            {/* Live Preview Card */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-orange-200 bg-gray-900 shadow-inner group">
              <img
                src={thumbnailInputUrl || thumbnailUrl || "/placeholder-course.svg"}
                alt="Video Thumbnail Preview"
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.currentTarget.src = "/placeholder-course.svg"
                }}
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-orange-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                First Video Poster Preview
              </div>
            </div>

            {/* Upload Option */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Upload Image File (.png, .jpg, .webp)
                </label>
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer transition-colors text-xs font-semibold text-gray-700">
                  {isUploadingThumbnail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                      <span>Uploading Image File...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-orange-600" />
                      <span>Click to Select & Upload Thumbnail Image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp"
                    disabled={isUploadingThumbnail}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleThumbnailUpload(e.target.files[0])
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* URL Input Option */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Or Paste Direct Image URL
                </label>
                <input
                  type="text"
                  value={thumbnailInputUrl}
                  onChange={(e) => setThumbnailInputUrl(e.target.value)}
                  placeholder="https://... or /uploads/..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setThumbnailInputUrl("/placeholder-course.svg")
                }}
                className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
              >
                Reset Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowThumbnailModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveThumbnail(thumbnailInputUrl)}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm"
                >
                  Apply & Save Thumbnail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: Demo Attendance & UTM Analytics Report */}
      {/* ======================================================== */}
      {showDemoReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                  <span>📊 Demo Class Attendance &amp; UTM Report</span>
                  <span className="text-xs font-normal text-gray-500">({initialCourse.title})</span>
                </h3>
              </div>
              <button
                onClick={() => setShowDemoReportModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingReport ? (
              <div className="py-20 text-center space-y-2">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-gray-500">Loading attendance and UTM analytics...</p>
              </div>
            ) : !demoReportData ? (
              <div className="py-12 text-center text-gray-400">Failed to load analytics.</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Bookings</span>
                    <span className="text-2xl font-black text-indigo-950">{demoReportData.summary.totalBookings}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Attended</span>
                    <span className="text-2xl font-black text-emerald-950">{demoReportData.summary.totalAttended}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">No-Shows</span>
                    <span className="text-2xl font-black text-rose-950">{demoReportData.summary.totalNoShows}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Attendance Rate</span>
                    <span className="text-2xl font-black text-amber-950">{demoReportData.summary.attendanceRate}%</span>
                  </div>
                </div>

                {/* UTM Source Breakdown */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">UTM Source Traffic</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {demoReportData.utmSourceBreakdown.map((src: any) => (
                      <div key={src.source} className="p-2.5 rounded-xl bg-white border border-gray-200 text-xs flex justify-between items-center">
                        <span className="font-bold text-gray-700 capitalize">{src.source}</span>
                        <span className="text-gray-900 font-extrabold">{src.count} ({src.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Bookings Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Student Bookings &amp; Watch Duration</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">Student</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Watch Time</th>
                          <th className="p-2.5">UTM Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {demoReportData.bookings.slice(0, 20).map((b: any) => (
                          <tr key={b.id} className="hover:bg-gray-50/80">
                            <td className="p-2.5">
                              <span className="font-bold text-gray-900 block">{b.studentName}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{b.studentPhone}</span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === "ATTENDED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "JOINED"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-gray-800">
                              {b.watchMinutes > 0 ? `${b.watchMinutes}m` : `${b.watchSeconds || 0}s`}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono">
                                {b.utmSource}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Preview Modal (renders public CourseDetailV2 in real-time from draft state) */}
      {showLivePreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold tracking-wide uppercase text-orange-400">
                Studio Live Preview
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-300">
                Unsaved Draft
              </span>
            </div>

            {/* Viewport switchers */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewViewport("desktop")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  previewViewport === "desktop"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Desktop (1280px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport("mobile")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  previewViewport === "mobile"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile (360px)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLivePreview(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-950 flex justify-center">
            <div
              className={`transition-all duration-300 overflow-hidden bg-[#F0EAD9] shadow-2xl ${
                previewViewport === "mobile"
                  ? "w-[390px] min-h-[750px] rounded-[36px] border-[6px] border-gray-800 my-auto"
                  : "w-full max-w-7xl rounded-2xl"
              }`}
            >
              <CourseDetailV2
                course={{
                  ...course,
                  title: title || course.title,
                  titleHi: heroDraft.titleHi || null,
                  subtitle: heroDraft.subtitle || null,
                  subtitleHi: heroDraft.subtitleHi || null,
                  description: description || course.description,
                  descriptionHi: heroDraft.descriptionHi || null,
                  price: Number(price),
                  originalPrice: Number(originalPrice),
                  thumbnailUrl: thumbnailUrl || null,
                  chapters: course.chapters,
                  technology: technology || course.technology,
                  enrollCtaLabel: heroDraft.enrollCtaLabel || null,
                  enrollCtaLabelHi: heroDraft.enrollCtaLabelHi || null,
                  enrollHelperText: heroDraft.enrollHelperText || null,
                  enrollHelperTextHi: heroDraft.enrollHelperTextHi || null,
                } as any}
                metadata={{
                  ...initialMeta,
                  theme: themeTokens,
                  tabsConfig: tabsConfig,
                  ...heroDraftToMetadata(heroDraft),
                } as any}
                sections={sectionFlags}
                syllabus={{ hasSyllabus: true, papers: [] }}
                teachers={teachers.map((t, idx) => ({
                  id: String(idx),
                  name: t.name,
                  nameHi: t.nameHi || null,
                  role: t.role || null,
                  roleHi: t.roleHi || null,
                  avatar: t.avatar || null,
                  credentials: t.credentials ? t.credentials.split(",").map((c: string) => ({ label: c.trim() })) : [],
                  bio: t.bio || null,
                  bioHi: t.bioHi || null,
                  isPrimary: Boolean(t.isPrimary || idx === 0),
                }))}
                faqs={faqs.map((f, i) => ({
                  id: String(i),
                  question: f.question,
                  questionHi: f.questionHi || null,
                  answer: f.answer,
                  answerHi: f.answerHi || null,
                }))}
                goalLabel={heroDraft.goalLabel || undefined}
                goalLabelHi={heroDraft.goalLabelHi || null}
                badges={heroDraft.badges}
                whatYouGet={heroDraft.whatYouGet}
                howItWorks={heroDraft.howItWorks}
              />
            </div>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  Select Course Template
                </h3>
                <p className="text-xs text-gray-500">
                  Pre-populate your course form with realistic examples or start completely blank.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {COURSE_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 cursor-pointer transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {tpl.name}
                      </span>
                      {tpl.id === "blank" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Recommended Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{tpl.description}</p>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-gray-500">
                      <span>Category: <strong>{tpl.template.technology}</strong></span>
                      <span>•</span>
                      <span>Price: <strong>{tpl.template.price === 0 ? "Free" : `₹${tpl.template.price.toLocaleString("en-IN")}`}</strong></span>
                      <span>•</span>
                      <span>Language: <strong>{tpl.template.language}</strong></span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completeness Checklist Modal */}
      {showCompletenessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Course Completeness Checklist
                </h3>
                <p className="text-xs text-gray-500">
                  {completeness.completedCount} of {completeness.total} specification checks completed ({completeness.percent}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletenessModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-orange-600 h-2.5 transition-all duration-300"
                  style={{ width: `${completeness.percent}%` }}
                />
              </div>
              <div className="space-y-2 pt-2">
                {completeness.checks.map((c: any, i: number) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      c.ok
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs">
                      <div className="font-bold">{c.label}</div>
                      <div className="text-[11px] opacity-80">{c.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
              {completeness.hasZeroLectures && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Warning: This course has 0 lectures. Add curriculum before publishing.</span>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCompletenessModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
