import { z } from "zod";

// PYQ
export interface PyqExamDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  totalPapers: number;
}

export interface PyqPaperDto {
  id: string;
  title: string;
  year: number;
  shift?: string | null;
  examId: string;
  examName: string;
  hasFile: boolean;
  totalQuestions?: number | null;
  isLockedForGuest: boolean;
  previewCount: number;
  totalItemsCount: number;
  fileUrl?: string | null;
}

// Current Affairs
export interface CurrentAffairsItemDto {
  id: string;
  title: string;
  slug: string;
  month: number;
  year: number;
  category: string;
  hasPdf: boolean;
  quizCount: number;
  publishedAt: string;
}

// Tutorials & Lessons
export interface TutorialSummaryDto {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  category: string;
  chaptersCount: number;
  lessonsCount: number;
  isGated: boolean;
}

export interface LessonDetailDto {
  id: string;
  title: string;
  slug: string;
  tutorialSlug: string;
  chapterTitle?: string;
  isLockedForGuest: boolean;
  totalItemsCount: number;
  previewCount: number;
  blocks: any[]; // Rosera JSON blocks
  gateMetadata?: {
    isGated: boolean;
    gateTitle?: string | null;
    gateSubtitle?: string | null;
    effectivePercentage: number;
  };
  navigation: {
    prevLessonId?: string | null;
    nextLessonId?: string | null;
  };
  isCompleted: boolean;
}

export const UpdateLessonProgressRequestSchema = z.object({
  completed: z.boolean(),
  lastBlockIndex: z.number().int().min(0).optional(),
});

export type UpdateLessonProgressRequest = z.infer<typeof UpdateLessonProgressRequestSchema>;

// Library
export interface LibraryItemDto {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  author?: string | null;
  fileSize: number;
  fileUrl: string;
  acquiredAt: string;
}

// Notifications
export interface NotificationItemDto {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  linkUrl?: string | null;
}

export const MarkNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1),
});

export type MarkNotificationsReadRequest = z.infer<typeof MarkNotificationsReadSchema>;

// Push Devices
export const RegisterPushTokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["android", "ios", "web"]),
  deviceModel: z.string().max(100).optional(),
  appVersion: z.string().max(50).optional(),
});

export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenSchema>;

// Config
export interface AppConfigDto {
  minSupportedVersion: string;
  latestVersion: string;
  isMaintenance: boolean;
  maintenanceMessage?: string | null;
  allowPurchases: boolean; // Reader App default: false
  googleAuthEnabled: boolean;
  otpAuthEnabled: boolean;
  supportEmail: string;
  websiteUrl: string;
}

// Home Dashboard
export interface DashboardSummaryDto {
  streakDays: number;
  dailyGoalProgress: number;
  continueLearning?: {
    lessonId: string;
    lessonTitle: string;
    tutorialTitle: string;
    tutorialSlug: string;
  } | null;
  upcomingOrRecentTests: Array<{
    id: string;
    title: string;
    seriesTitle: string;
    durationMinutes: number;
    score?: number | null;
    status: string;
  }>;
  todayQuiz?: {
    id: string;
    title: string;
    questionCount: number;
  } | null;
}

// Courses & Video Player
export interface CourseSummaryDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  difficulty: string;
  duration: number;
  rating: number;
  enrollmentCount: number;
  isFree: boolean;
  price: number;
  chaptersCount: number;
  lessonsCount: number;
  isEnrolled: boolean;
  // ── Additive (v2) fields — all optional so older mobile builds keep working ──
  titleHi?: string | null;
  subtitle?: string | null;
  subtitleHi?: string | null;
  descriptionHi?: string | null;
}

export interface CourseLessonItemDto {
  id: string;
  title: string;
  durationText?: string | null;
  duration?: number | null;
  isTrial: boolean;
  order: number;
  isLocked: boolean;
  isCompleted: boolean;
  // ── Additive (v2) ──
  titleHi?: string | null;
  scheduledAt?: string | null;
}

export interface CourseChapterDto {
  id: string;
  title: string;
  order: number;
  lessons: CourseLessonItemDto[];
  // ── Additive (v2) ──
  titleHi?: string | null;
  unitId?: string | null;
  subtopics?: string[];
  subtopicsHi?: string[];
}

export interface CourseUnitDto {
  id: string;
  title: string;
  titleHi?: string | null;
  tags: string[];
  order: number;
}

export interface CourseHeroMetricDto {
  value: string;
  valueHi?: string | null;
  label: string;
  labelHi?: string | null;
}

export interface CourseTeacherDto {
  name: string;
  nameHi?: string | null;
  role?: string | null;
  roleHi?: string | null;
  subject?: string | null;
  experience?: string | null;
  qualification?: string | null;
  qualificationHi?: string | null;
  avatar?: string | null;
  bio?: string | null;
  bioHi?: string | null;
}

export interface CourseFaqDto {
  question: string;
  questionHi?: string | null;
  answer: string;
  answerHi?: string | null;
}

export interface CourseRatingSummaryDto {
  total: number;
  average: number;
  buckets: Array<{ stars: number; count: number; percent: number }>;
  visible: boolean;
}

export interface CourseSyllabusSectionSummaryDto {
  id: string;
  title: string;
  titleHi?: string | null;
  subtopics: string[];
  subtopicsHi: string[];
  unitId?: string | null;
  unitTitle?: string | null;
  totalQuestions: number;
  byYear: Array<{ year: number; count: number }>;
}

export interface CourseSyllabusSummaryDto {
  hasSyllabus: boolean;
  papers: Array<{
    id: string;
    key: string;
    title: string;
    titleHi?: string | null;
    marks?: number | null;
    durationMinutes?: number | null;
    introText?: string | null;
    introTextHi?: string | null;
    sections: CourseSyllabusSectionSummaryDto[];
  }>;
}

export interface CourseSectionFlagsDto {
  about: boolean;
  plan: boolean;
  syllabus: boolean;
  teachers: boolean;
  questions: boolean;
  lectures: boolean;
  callback: boolean;
}

export interface CourseDetailDto {
  course: CourseSummaryDto;
  chapters: CourseChapterDto[];
  isEnrolled: boolean;
  // ── Additive (v2). Consumers must treat every field as optional. ──
  units?: CourseUnitDto[];
  hero?: {
    metrics: CourseHeroMetricDto[];
    pillTags: string[];
    pillTagsHi: string[];
    firstClassDate?: string | null;
    lateJoinerText?: string | null;
    lateJoinerTextHi?: string | null;
    instructor?: CourseTeacherDto | null;
  };
  teachers?: CourseTeacherDto[];
  faqs?: CourseFaqDto[];
  aboutHighlights?: string[];
  aboutHighlightsHi?: string[];
  ratingSummary?: CourseRatingSummaryDto;
  syllabus?: CourseSyllabusSummaryDto;
  sections?: CourseSectionFlagsDto;
  theme?: Record<string, string> | null;
  goalLabel?: string | null;
  goalLabelHi?: string | null;
  enrollCtaLabel?: string | null;
  enrollCtaLabelHi?: string | null;
  enrollHelperText?: string | null;
  enrollHelperTextHi?: string | null;
  badges?: Array<{ label: string; labelHi?: string | null; variant?: "outlined" | "filled" }>;
  whatYouGet?: Array<{ en: string; hi?: string | null }>;
  howItWorks?: Array<{ en: string; hi?: string | null }>;
  tabsConfig?: Array<{ id: string; label: string; labelHi?: string; enabled: boolean; icon?: string }>;
}

export interface CourseLessonDetailDto {
  id: string;
  title: string;
  courseTitle: string;
  courseSlug: string;
  chapterTitle?: string | null;
  videoUrl?: string | null;
  content?: string | null;
  durationText?: string | null;
  isCompleted: boolean;
  isLocked: boolean;
  navigation: {
    prevLessonId?: string | null;
    nextLessonId?: string | null;
  };
}

// My Learning
export interface MyLearningItemDto {
  courseId: string;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  enrolledAt: string;
  lastLessonId?: string | null;
}

export interface MyLearningDto {
  enrolledCourses: MyLearningItemDto[];
}

// Career Tracks
export interface CareerTrackCourseDto {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  difficulty: string;
  duration: number;
  isEnrolled: boolean;
}

export interface CareerTrackDto {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  thumbnail?: string | null;
  totalCourses: number;
}

export interface CareerTrackDetailDto {
  track: CareerTrackDto;
  courses: CareerTrackCourseDto[];
}

// Global Search
export interface SearchResultItemDto {
  id: string;
  type: "TEST" | "COURSE" | "SERIES" | "PYQ";
  title: string;
  subtitle: string;
  route: string;
  badge?: string;
}

export interface SearchResultsDto {
  query: string;
  total: number;
  results: SearchResultItemDto[];
}
