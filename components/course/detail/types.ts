/** Shared shapes for the Course Detail V2 components. */

export interface DetailLesson {
  id: string
  title: string
  titleHi?: string | null
  type: string
  duration?: number | null
  durationText?: string | null
  videoUrl?: string | null
  isTrial?: boolean
  order: number
  scheduledAt?: string | Date | null
  content?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
  status?: "live" | "upcoming" | "recording_ready" | string
}

export interface DetailChapter {
  id: string
  title: string
  titleHi?: string | null
  order: number
  unitId?: string | null
  subtopics?: string[]
  subtopicsHi?: string[]
  lessons: DetailLesson[]
}

export interface DetailUnit {
  id: string
  number?: number
  title: string
  titleHi?: string | null
  tags: string[]
  order: number
  dateRange?: string
  hours?: number
}

export interface BadgeChip {
  label: string
  labelHi?: string | null
  variant: "outlined" | "filled"
}

export interface LateJoinNote {
  enabled: boolean
  label?: string | null
  labelHi?: string | null
  text?: string | null
  textHi?: string | null
}

export interface HeroStat {
  value: string
  valueHi?: string | null
  caption: string
  captionHi?: string | null
  icon?: string | null
}

export interface TabConfigItem {
  id: string
  label: string
  labelHi?: string | null
  icon?: string | null
  enabled?: boolean
}

export interface DetailCourse {
  id: string
  title: string
  titleHi?: string | null
  subtitle?: string | null
  subtitleHi?: string | null
  slug: string
  description: string
  descriptionHi?: string | null
  thumbnailUrl?: string | null
  heroBackground?: string | null
  price?: number | null
  originalPrice?: number | null
  discountPercent?: number | null
  couponCode?: string | null
  couponDiscount?: number | null
  expiresAt?: string | null
  hasTrialLesson?: boolean
  isPremium?: boolean
  technology?: string | null
  metadataJson?: string | null
  chapters: DetailChapter[]
  units?: DetailUnit[]
  brand?: string
  goalLabel?: string
  goalLabelHi?: string | null
  enrollCtaLabel?: string
  enrollCtaLabelHi?: string | null
  enrollHelperText?: string
  enrollHelperTextHi?: string | null
  badges?: BadgeChip[]
  lateJoinNote?: LateJoinNote
}

export interface RatingSummary {
  total: number
  average: number
  buckets: Array<{ stars: number; count: number; percent: number }>
  visible: boolean
}

export interface SyllabusSectionSummary {
  id: string
  title: string
  titleHi?: string | null
  subtopics: string[]
  subtopicsHi: string[]
  unitId?: string | null
  unitTitle?: string | null
  totalQuestions: number
  byYear: Array<{ year: number; count: number }>
}

export interface SyllabusPaperSummary {
  id: string
  key: string
  title: string
  titleHi?: string | null
  marks?: number | null
  durationMinutes?: number | null
  introText?: string | null
  introTextHi?: string | null
  sections: SyllabusSectionSummary[]
}

export interface SectionFlags {
  about: boolean
  plan: boolean
  syllabus: boolean
  teachers: boolean
  questions: boolean
  lectures: boolean
  callback: boolean
}

export interface DetailTeacher {
  id?: string
  name: string
  nameHi?: string | null
  avatar?: string | null
  photo?: string | null
  credentials?: string[] | null
  credentialsHi?: string[] | null
  role?: string | null
  roleHi?: string | null
  subject?: string | null
  experience?: string | null
  qualification?: string | null
  qualificationHi?: string | null
  bio?: string | null
  bioHi?: string | null
  isPrimary?: boolean
}

export interface DetailFaq {
  question: string
  questionHi?: string | null
  answer: string
  answerHi?: string | null
}
