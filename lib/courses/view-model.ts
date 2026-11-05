import { BRAND_NAME } from "@/lib/brand"
import { DEFAULT_SECTION_FLAGS, type SectionFlags, type CourseMetadataV2 } from "@/lib/courses/metadata-schema"
import { isValidThumbnailUrl, sanitizeThumbnailUrl, generateCourseCoverSvg } from "@/lib/courses/cover-fallback"
import { resolveCourseTeachers } from "@/lib/teachers/library"
import type { CourseDetailV2Props } from "@/components/course/detail/CourseDetailV2"
export type { CourseDetailV2Props }
import type { DetailCourse, DetailTeacher, DetailFaq, HeroStat, BadgeChip, LateJoinNote, SyllabusPaperSummary } from "@/components/course/detail/types"

const DEFAULT_THEME_TOKENS = {
  primary: "#1B1F4A",
  secondary: "#F5C842",
  background: "#F0EAD9",
}

const DEFAULT_TABS = [
  { id: "about", label: "About", labelHi: "परिचय", enabled: true },
  { id: "plan", label: "Course plan", labelHi: "कोर्स प्लान", enabled: true },
  { id: "lectures", label: "Lectures", labelHi: "लेक्चर्स", enabled: true },
  { id: "syllabus", label: "Syllabus", labelHi: "सिलेबस", enabled: true },
  { id: "teachers", label: "Teachers", labelHi: "शिक्षक", enabled: true },
  { id: "questions", label: "Questions", labelHi: "सवाल", enabled: true },
]

export interface CourseDraftInput {
  id?: string | null
  title?: string | null
  titleHi?: string | null
  subtitle?: string | null
  subtitleHi?: string | null
  slug?: string | null
  description?: string | null
  descriptionHi?: string | null
  technology?: string | null
  category?: string | null
  price?: number | string | null
  originalPrice?: number | string | null
  mrp?: number | string | null
  isFree?: boolean | null
  isPremium?: boolean | null
  thumbnailUrl?: string | null
  brand?: string | null
  language?: string | null
  enrollCtaLabel?: string | null
  enrollCtaLabelHi?: string | null
  enrollHelperText?: string | null
  enrollHelperTextHi?: string | null
  goalLabel?: string | null
  goalLabelHi?: string | null
  disclaimer?: string | null
  units?: any[]
  chapters?: any[]
  teachers?: any[]
  faqs?: any[]
  stats?: any[]
  heroMetrics?: any[]
  badges?: any[]
  pillTags?: string[]
  pillTagsHi?: string[]
  whatYouGet?: any[]
  howItWorks?: any[]
  syllabus?: { hasSyllabus?: boolean; papers?: any[] }
  syllabusEnabled?: boolean
  syllabusPapers?: any[]
  tabsConfig?: any[]
  theme?: any
  themeTokens?: any
  sections?: Partial<SectionFlags> | null
  ratingSummary?: any
  isEnrolled?: boolean
  hasAccess?: boolean
  allowPurchases?: boolean
  shareUrl?: string
  nowIso?: string
}

function normalizeCredentials(creds: any): Array<{ label: string; labelHi?: string }> {
  if (!creds) return []
  if (typeof creds === "string") {
    return creds
      .split(",")
      .map((c) => ({ label: c.trim() }))
      .filter((c) => c.label.length > 0)
  }
  if (Array.isArray(creds)) {
    return creds
      .map((c) => {
        if (typeof c === "string") return { label: c.trim() }
        if (c && typeof c === "object") {
          return {
            label: String(c.label || "").trim(),
            labelHi: c.labelHi ? String(c.labelHi).trim() : undefined,
          }
        }
        return { label: "" }
      })
      .filter((c) => c.label.length > 0)
  }
  return []
}

/**
 * Single canonical view-model builder used across:
 * 1. Public page (app/(dashboard)/courses/[slug]/page.tsx)
 * 2. Studio Edit Live Preview (VideoCourseEditorClient.tsx)
 * 3. Course Creation Wizard Live Preview (CourseCreationWizard.tsx)
 *
 * Guarantees 100% safe defaults for every nested array and object, preventing crashes.
 */
export function buildCourseDetailViewModel(input: CourseDraftInput): CourseDetailV2Props {
  const isFree = Boolean(input.isFree)
  const rawPrice =
    input.price === undefined || input.price === null || input.price === ""
      ? 0
      : Number(input.price)
  const price = isFree ? 0 : Math.max(0, isNaN(rawPrice) ? 0 : rawPrice)
  const rawOriginal = Number(input.originalPrice ?? input.mrp)
  const originalPrice = isFree
    ? 0
    : Math.max(price, isNaN(rawOriginal) ? 0 : rawOriginal)

  // Normalize thumbnail
  const rawThumb = input.thumbnailUrl
  const finalThumbnail = isValidThumbnailUrl(rawThumb)
    ? sanitizeThumbnailUrl(rawThumb)
    : generateCourseCoverSvg({
        title: input.title || "Course Cover",
        category: input.technology || input.category || "COURSE",
        brand: input.brand || BRAND_NAME,
      })

  // Normalize units & chapters
  const rawUnits: any[] = Array.isArray(input.units) ? input.units : []
  const rawChapters: any[] = Array.isArray(input.chapters) ? input.chapters : []

  // If units have nested themes (wizard format), synthesize chapters
  let normalizedChapters: any[] = []
  if (rawChapters.length > 0) {
    normalizedChapters = rawChapters.map((ch, idx) => ({
      id: ch.id || `chapter-${idx}`,
      title: ch.title || `Chapter ${idx + 1}`,
      titleHi: ch.titleHi || null,
      unitId: ch.unitId || null,
      subtopics: Array.isArray(ch.subtopics) ? ch.subtopics : [],
      subtopicsHi: Array.isArray(ch.subtopicsHi) ? ch.subtopicsHi : [],
      lessons: (Array.isArray(ch.lessons) ? ch.lessons : []).map((l: any, lIdx: number) => ({
        id: l.id || `lesson-${idx}-${lIdx}`,
        title: l.title || `Lesson ${lIdx + 1}`,
        titleHi: l.titleHi || null,
        type: l.type || "VIDEO",
        duration: typeof l.duration === "number" ? l.duration : typeof l.durationMin === "number" ? l.durationMin : 60,
        isTrial: Boolean(l.isTrial),
        scheduledAt: l.scheduledAt || null,
      })),
    }))
  } else if (rawUnits.length > 0 && rawUnits.some((u) => Array.isArray(u.themes))) {
    normalizedChapters = rawUnits.flatMap((u) =>
      (Array.isArray(u.themes) ? u.themes : []).map((th: any, thIdx: number) => ({
        id: th.id || `th-${u.id}-${thIdx}`,
        title: th.title || `Theme ${thIdx + 1}`,
        titleHi: th.titleHi || null,
        unitId: u.id,
        subtopics: Array.isArray(th.subtopics) ? th.subtopics : [],
        subtopicsHi: Array.isArray(th.subtopicsHi) ? th.subtopicsHi : [],
        lessons: (Array.isArray(th.lectures) ? th.lectures : []).map((l: any, lIdx: number) => ({
          id: l.id || `l-${th.id}-${lIdx}`,
          title: l.title || `Lecture ${lIdx + 1}`,
          titleHi: l.titleHi || null,
          type: "VIDEO",
          duration: l.durationMin || l.duration || 60,
          isTrial: Boolean(l.isTrial),
          scheduledAt: l.scheduledAt || null,
        })),
      }))
    )
  }

  // Filter out empty units (units with 0 themes / chapters) on public course page
  const nonEmptyUnits = rawUnits.filter((u) => {
    if (Array.isArray(u.themes)) return u.themes.length > 0
    if (normalizedChapters.length > 0) {
      return normalizedChapters.some((ch) => ch.unitId === u.id)
    }
    return false
  })

  const normalizedUnits = nonEmptyUnits.map((u, idx) => ({
    id: u.id || `unit-${idx + 1}`,
    title: u.title || `Unit ${idx + 1}`,
    titleHi: u.titleHi || null,
    tags: Array.isArray(u.tags) ? u.tags : u.tag ? [u.tag] : [],
    tagHi: u.tagHi || (Array.isArray(u.tagsHi) ? u.tagsHi[0] : null),
    order: typeof u.order === "number" ? u.order : u.number || idx + 1,
  }))

  const course: DetailCourse = {
    id: input.id || "preview-id",
    title: input.title || "Untitled Course",
    titleHi: input.titleHi || null,
    subtitle: input.subtitle || null,
    subtitleHi: input.subtitleHi || null,
    slug: input.slug || "preview-course",
    description: input.description || "",
    descriptionHi: input.descriptionHi || null,
    technology: input.technology || input.category || null,
    price,
    originalPrice,
    isPremium: !isFree,
    thumbnailUrl: finalThumbnail,
    enrollCtaLabel: input.enrollCtaLabel || undefined,
    enrollCtaLabelHi: input.enrollCtaLabelHi || null,
    enrollHelperText: input.enrollHelperText || undefined,
    enrollHelperTextHi: input.enrollHelperTextHi || null,
    chapters: normalizedChapters,
    units: normalizedUnits,
  }

  // Teachers (resolved through central Reusable Teacher Library)
  const rawTeachers = Array.isArray(input.teachers) ? input.teachers : []
  const resolvedTeachers = resolveCourseTeachers(rawTeachers).map((t, idx) => ({
    id: String(t.id || idx),
    name: t.name,
    nameHi: t.nameHi || null,
    role: t.role || null,
    roleHi: t.roleHi || null,
    avatar: t.avatar || t.photo || null,
    credentials: normalizeCredentials(t.credentials),
    credentialsHi: normalizeCredentials(t.credentialsHi),
    bio: t.bio || null,
    bioHi: t.bioHi || null,
    isPrimary: Boolean(t.isPrimary || idx === 0),
  }))

  // FAQs
  const rawFaqs = Array.isArray(input.faqs) ? input.faqs : []
  const faqs: DetailFaq[] = rawFaqs.map((f, idx) => ({
    id: String(f.id || idx),
    question: f.question || "",
    questionHi: f.questionHi || null,
    answer: f.answer || "",
    answerHi: f.answerHi || null,
  }))

  // Stats / Hero Metrics
  const rawStats = Array.isArray(input.stats) ? input.stats : Array.isArray(input.heroMetrics) ? input.heroMetrics : []
  const stats: HeroStat[] = rawStats.map((s) => ({
    value: s.value || "",
    valueHi: s.valueHi || s.value || "",
    caption: s.caption || s.label || "",
    captionHi: s.captionHi || s.labelHi || s.caption || s.label || "",
    icon: s.icon,
  }))

  // Badges
  const rawBadges = Array.isArray(input.badges) ? input.badges : []
  const badges: BadgeChip[] = rawBadges.map((b, idx) => ({
    label: typeof b === "string" ? b : b.label || "",
    labelHi: typeof b === "string" ? undefined : b.labelHi,
    variant: typeof b === "object" && b.variant ? b.variant : idx === 0 ? "outlined" : "filled",
  }))

  // Syllabus Papers
  const rawPapers = Array.isArray(input.syllabus?.papers)
    ? input.syllabus!.papers
    : Array.isArray(input.syllabusPapers)
    ? input.syllabusPapers
    : []

  const papers: SyllabusPaperSummary[] = rawPapers.map((p, idx) => ({
    id: p.id || `paper-${idx}`,
    key: p.key || `paper-${idx}`,
    title: p.title || `Paper ${idx + 1}`,
    titleHi: p.titleHi || null,
    marks: p.marks ?? null,
    durationMinutes: p.durationMinutes ?? null,
    totalQuestions: typeof p.totalQuestions === "number" ? p.totalQuestions : 0,
    sections: (Array.isArray(p.sections) ? p.sections : [])
      .filter((s: any) => s.title && s.title.trim() && s.title.trim().toLowerCase() !== "new syllabus section")
      .map((s: any, sIdx: number) => ({
        id: s.id || `sec-${sIdx}`,
        title: s.title.trim(),
        titleHi: s.titleHi || null,
        subtopics: Array.isArray(s.subtopics) ? s.subtopics : [],
        totalQuestions: typeof s.totalQuestions === "number" ? s.totalQuestions : 0,
        byYear: Array.isArray(s.byYear) ? s.byYear : [],
      })),
  }))

  const hasSyllabus = Boolean(input.syllabus?.hasSyllabus || input.syllabusEnabled) && papers.length > 0

  const metadata: CourseMetadataV2 = {
    schemaVersion: 2,
    brand: input.brand || BRAND_NAME,
    language: (input.language as any) || "en",
    theme: input.themeTokens || input.theme || DEFAULT_THEME_TOKENS,
    tabsConfig: Array.isArray(input.tabsConfig) && input.tabsConfig.length > 0 ? input.tabsConfig : DEFAULT_TABS,
    heroMetrics: stats.map((s) => ({
      value: s.value,
      valueHi: s.valueHi || undefined,
      label: s.caption,
      labelHi: s.captionHi || undefined,
    })),
    badges,
    whatYouGet: Array.isArray(input.whatYouGet) ? input.whatYouGet : [],
    howItWorks: Array.isArray(input.howItWorks) ? input.howItWorks : [],
    teachers: resolvedTeachers as any,
    faqs: faqs.map((f) => ({
      question: f.question,
      questionHi: f.questionHi || undefined,
      answer: f.answer,
      answerHi: f.answerHi || undefined,
    })),
    thumbnailBadge: input.technology || input.category || "Course",
    enrollDisclaimer: input.disclaimer || undefined,
  }

  const sections: Partial<SectionFlags> = {
    ...DEFAULT_SECTION_FLAGS,
    ...(input.sections || {}),
  }

  return {
    course,
    metadata,
    sections,
    syllabus: { hasSyllabus, papers },
    ratingSummary: input.ratingSummary || null,
    teachers: resolvedTeachers as any,
    faqs,
    stats,
    badges,
    goalLabel: input.goalLabel || input.technology || undefined,
    goalLabelHi: input.goalLabelHi || null,
    pillTags: input.pillTags || [],
    pillTagsHi: input.pillTagsHi || [],
    whatYouGet: metadata.whatYouGet,
    howItWorks: metadata.howItWorks,
    isEnrolled: Boolean(input.isEnrolled),
    hasAccess: Boolean(input.hasAccess),
    allowPurchases: input.allowPurchases ?? true,
    shareUrl: input.shareUrl || "",
    nowIso: input.nowIso || new Date().toISOString(),
  }
}
