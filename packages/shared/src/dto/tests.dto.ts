import { z } from "zod";

export const TestListQuerySchema = z.object({
  seriesId: z.string().optional(),
  goal: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type TestListQuery = z.infer<typeof TestListQuerySchema>;

export interface TestListItemDto {
  id: string;
  title: string;
  titleHi?: string | null;
  slug: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  isFree: boolean;
  seriesId: string;
  seriesTitle?: string;
  myAttemptsCount: number;
  latestScore?: number | null;
  createdAt: string;
}

export interface TestDetailDto {
  id: string;
  title: string;
  titleHi?: string | null;
  slug: string;
  instructions?: string | null;
  instructionsHi?: string | null;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  positiveMarksPerQuestion: number;
  negativeMarksPerQuestion: number;
  isFree: boolean;
  series: {
    id: string;
    title: string;
    logoUrl?: string | null;
  };
  previousAttempts: Array<{
    id: string;
    score: number | null;
    totalMarks: number;
    percentile: number | null;
    rank: number | null;
    submittedAt: string | null;
  }>;
}

export interface StartAttemptResponseDto {
  attemptId: string;
  testId: string;
  startedAt: string;
  serverNow: string;
  durationMinutes: number;
  durationSeconds: number;
  resumed: boolean;
}

export interface AttemptQuestionDto {
  id: string;
  sectionId: string;
  sectionName?: string;
  questionNumber: number;
  textEn: string;
  textHi?: string | null;
  optionsEn: string[];
  optionsHi?: string[] | null;
  positiveMarks: number;
  negativeMarks: number;
  selectedOption?: string | null;
  isMarked?: boolean;
  timeSpentSecs?: number;
}

export interface AttemptSectionDto {
  id: string;
  name: string;
  order: number;
  totalQuestions: number;
}

export interface AttemptDetailDto {
  attemptId: string;
  testId: string;
  testTitle: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "ABANDONED";
  startedAt: string;
  submittedAt?: string | null;
  serverNow: string;
  durationMinutes: number;
  timeRemainingSecs: number;
  sections: AttemptSectionDto[];
  questions: AttemptQuestionDto[];
}

export const AnswerItemSyncSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.string().nullable().optional(),
  isMarked: z.boolean().optional(),
  timeSpentSecs: z.number().int().min(0).optional(),
  sequenceNumber: z.number().int().min(1),
});

export const SubmitAnswersRequestSchema = z.object({
  answers: z.array(AnswerItemSyncSchema).max(500),
  lastSequenceNumber: z.number().int().min(0),
});

export type SubmitAnswersRequest = z.infer<typeof SubmitAnswersRequestSchema>;

export const SubmitAttemptRequestSchema = z.object({
  finalAnswers: z.array(AnswerItemSyncSchema).max(500).optional(),
});

export type SubmitAttemptRequest = z.infer<typeof SubmitAttemptRequestSchema>;

export interface AttemptResultDto {
  attemptId: string;
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  markedCount: number;
  accuracyPercentage: number;
  timeTakenSecs: number;
  percentile: number | null;
  allIndiaRank: number | null;
  totalCandidates: number;
  submittedAt: string;
}

export interface QuestionSolutionDto extends AttemptQuestionDto {
  correctOption: string;
  explanationEn?: string | null;
  explanationHi?: string | null;
  isCorrect: boolean;
  marksAwarded: number;
}

export interface AttemptSolutionsDto {
  attemptId: string;
  testId: string;
  questions: QuestionSolutionDto[];
}

export interface ExamSeriesPackageDto {
  id: string;
  slug: string;
  title: string;
  category: string;
  examName?: string | null;
  logoType?: string | null;
  users: string;
  totalTests: number;
  freeTests: number;
  languages: string[];
  highlights: string[];
  description: string;
  bannerUrl?: string | null;
  syllabus?: string | null;
  keyFeatures: string[];
  whyThisSeries?: string | null;
  goalId: string;
  tags: string[];
  isFree: boolean;
  isPro: boolean;
  isEnrolled?: boolean;
}

export interface ExamSeriesTestItemDto {
  id: string;
  title: string;
  titleHi?: string | null;
  slug: string;
  testType: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  accessMode: string;
  isFree: boolean;
  order: number;
  userStatus?: {
    attemptId?: string | null;
    status?: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
    score?: number | null;
    totalMarks?: number | null;
  };
}

export interface ExamSeriesDetailDto {
  series: ExamSeriesPackageDto;
  tests: ExamSeriesTestItemDto[];
  isEnrolled: boolean;
}

export interface MyTestsDto {
  inProgress: Array<{
    attemptId: string;
    testId: string;
    testTitle: string;
    seriesId: string;
    seriesTitle: string;
    startedAt: string;
    durationMinutes: number;
    timeRemainingSecs: number;
  }>;
  enrolledSeries: Array<{
    seriesId: string;
    title: string;
    slug: string;
    category: string;
    totalTests: number;
    completedTests: number;
    enrolledAt: string;
  }>;
  recentAttempts: Array<{
    attemptId: string;
    testId: string;
    testTitle: string;
    seriesTitle?: string | null;
    score: number | null;
    totalMarks: number;
    accuracyPercentage: number;
    percentile: number | null;
    rank: number | null;
    submittedAt: string;
  }>;
}

export interface TestLeaderboardItemDto {
  rank: number;
  name: string;
  avatar?: string | null;
  score: number;
  totalMarks: number;
  accuracy: number;
  percentile: number;
  timeSecs: number;
  isCurrentUser: boolean;
}

export interface TestLeaderboardDto {
  testId: string;
  testTitle: string;
  totalMarks: number;
  totalParticipants: number;
  currentUserRank?: TestLeaderboardItemDto | null;
  rankings: TestLeaderboardItemDto[];
}

