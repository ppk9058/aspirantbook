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
