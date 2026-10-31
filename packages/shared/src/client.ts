import {
  LoginRequest,
  LoginResponseDto,
  RegisterRequest,
  RefreshTokenRequest,
  DeviceSessionDto,
} from "./dto/auth.dto";
import {
  ViewerProfileDto,
  UpdateProfileRequest,
  DeleteAccountRequest,
  DeleteAccountResponseDto,
} from "./dto/user.dto";
import {
  TestListItemDto,
  TestDetailDto,
  StartAttemptResponseDto,
  AttemptDetailDto,
  SubmitAnswersRequest,
  SubmitAttemptRequest,
  AttemptResultDto,
  AttemptSolutionsDto,
  ExamSeriesPackageDto,
  ExamSeriesDetailDto,
  MyTestsDto,
  TestLeaderboardDto,
} from "./dto/tests.dto";
import {
  DashboardSummaryDto,
  PyqExamDto,
  PyqPaperDto,
  CurrentAffairsItemDto,
  TutorialSummaryDto,
  LessonDetailDto,
  UpdateLessonProgressRequest,
  LibraryItemDto,
  NotificationItemDto,
  AppConfigDto,
  RegisterPushTokenRequest,
  CourseSummaryDto,
  CourseDetailDto,
  CourseLessonDetailDto,
  MyLearningDto,
  CareerTrackDto,
  CareerTrackDetailDto,
  SearchResultsDto,
} from "./dto/content.dto";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  onUnauthorized?: () => void;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  maxGetRetries?: number;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, getAccessToken, onUnauthorized, fetchFn = fetch } = options;

  async function request<T>(
    endpoint: string,
    init: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;
    const headers = new Headers(init.headers || {});

    if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }

    if (getAccessToken) {
      const token = await getAccessToken();
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const isGet = !init.method || init.method.toUpperCase() === "GET";
    const maxAttempts = isGet ? 1 + (options.maxGetRetries ?? 1) : 1;
    const timeout = options.timeoutMs ?? 10000;

    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);

      try {
        const signal = init.signal || controller.signal;
        const res = await fetchFn(url, { ...init, headers, signal });
        clearTimeout(timer);

        if (res.status === 401 && onUnauthorized) {
          onUnauthorized();
        }

        const json: any = await res.json().catch(() => null);

        if (!res.ok) {
          return {
            ok: false,
            error: json?.error || {
              code: `HTTP_${res.status}`,
              message: res.statusText || "Request failed",
            },
          };
        }

        return json as ApiResponse<T>;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        const isTimeout =
          err?.name === "AbortError" ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("timed out"));

        if (attempt < maxAttempts) {
          continue;
        }

        return {
          ok: false,
          error: {
            code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
            message: isTimeout
              ? "Request timed out. Please check your connection and try again."
              : err?.message || "Network request failed",
          },
        };
      }
    }

    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: lastError?.message || "Network request failed",
      },
    };
  }

  return {
    // Generic request helpers for feature modules that target a specific endpoint.
    get: (endpoint: string) => request<unknown>(endpoint),
    post: (endpoint: string, data?: unknown) =>
      request<unknown>(endpoint, {
        method: "POST",
        body: JSON.stringify(data ?? {}),
      }),

    // Config
    getConfig: () => request<AppConfigDto>("/api/v1/config"),

    // Auth
    login: (body: LoginRequest) =>
      request<LoginResponseDto>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    register: (body: RegisterRequest) =>
      request<LoginResponseDto>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    refresh: (body: RefreshTokenRequest) =>
      request<LoginResponseDto>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    logout: (refreshToken: string) =>
      request<{ success: boolean }>("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    logoutAll: () =>
      request<{ success: boolean }>("/api/v1/auth/logout-all", {
        method: "POST",
      }),
    getSessions: () => request<DeviceSessionDto[]>("/api/v1/auth/sessions"),
    revokeSession: (id: string) =>
      request<{ success: boolean }>(`/api/v1/auth/sessions/${id}`, {
        method: "DELETE",
      }),
    forgotPassword: (email: string) =>
      request<{ success: boolean }>("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (body: { token: string; password: string }) =>
      request<{ success: boolean; message: string }>("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    requestOtp: (body: { phoneNumber: string }) =>
      request<{ message: string; phoneNumber: string; devBypass?: boolean }>("/api/v1/auth/otp/request", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    verifyOtp: (body: { phoneNumber: string; otp: string }) =>
      request<LoginResponseDto>("/api/v1/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    // User & Profile
    getMe: () => request<ViewerProfileDto>("/api/v1/me"),
    updateMe: (body: UpdateProfileRequest) =>
      request<ViewerProfileDto>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    updateProfile: (body: UpdateProfileRequest) =>
      request<ViewerProfileDto>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteMe: (body: DeleteAccountRequest) =>
      request<DeleteAccountResponseDto>("/api/v1/me", {
        method: "DELETE",
        body: JSON.stringify(body),
      }),
    getPurchases: () =>
      request<{
        hasActivePass: boolean;
        activeSubscription: {
          id: string;
          plan: string;
          status: string;
          startDate: string;
          endDate: string;
          daysRemaining: number;
        } | null;
        history: Array<{
          id: string;
          type: "subscription" | "payment";
          description: string;
          amount: number;
          currency: string;
          status: string;
          createdAt: string;
        }>;
      }>("/api/v1/subscriptions"),

    // Dashboard & Goals
    getHome: () => request<DashboardSummaryDto>("/api/v1/home"),
    getGoals: () =>
      request<Array<{ id: string; name: string; description?: string }>>("/api/v1/goals"),

    // Tests & Attempts
    getTests: (query?: { seriesId?: string; goal?: string; cursor?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (query?.seriesId) q.set("seriesId", query.seriesId);
      if (query?.goal) q.set("goal", query.goal);
      if (query?.cursor) q.set("cursor", query.cursor);
      if (query?.limit) q.set("limit", String(query.limit));
      return request<{ items: TestListItemDto[]; nextCursor?: string }>(
        `/api/v1/tests?${q.toString()}`
      );
    },
    getTestDetail: (testId: string) => request<TestDetailDto>(`/api/v1/tests/${testId}`),
    startAttempt: (testId: string) =>
      request<StartAttemptResponseDto>(`/api/v1/tests/${testId}/attempts`, {
        method: "POST",
      }),
    getAttempt: (attemptId: string) =>
      request<AttemptDetailDto>(`/api/v1/attempts/${attemptId}`),
    syncAnswers: (attemptId: string, body: SubmitAnswersRequest) =>
      request<{ syncedCount: number; lastSequenceNumber: number }>(
        `/api/v1/attempts/${attemptId}/answers`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        }
      ),
    submitAttempt: (attemptId: string, body?: SubmitAttemptRequest) =>
      request<AttemptResultDto>(`/api/v1/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify(body || {}),
      }),
    getAttemptResult: (attemptId: string) =>
      request<AttemptResultDto>(`/api/v1/attempts/${attemptId}/result`),
    getAttemptSolutions: (attemptId: string) =>
      request<AttemptSolutionsDto>(`/api/v1/attempts/${attemptId}/solutions`),
    getExamSeries: (query?: { goal?: string; category?: string; cursor?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (query?.goal) q.set("goal", query.goal);
      if (query?.category) q.set("category", query.category);
      if (query?.cursor) q.set("cursor", query.cursor);
      if (query?.limit) q.set("limit", String(query.limit));
      const qs = q.toString();
      return request<ExamSeriesPackageDto[]>(`/api/v1/exam-series${qs ? `?${qs}` : ""}`);
    },
    getExamSeriesDetail: (seriesIdOrSlug: string) =>
      request<ExamSeriesDetailDto>(`/api/v1/exam-series/${seriesIdOrSlug}`),
    getMyTests: () => request<MyTestsDto>("/api/v1/my-tests"),
    getTestLeaderboard: (testId: string, query?: { search?: string }) => {
      const q = new URLSearchParams();
      if (query?.search) q.set("search", query.search);
      const qs = q.toString();
      return request<TestLeaderboardDto>(`/api/v1/tests/${testId}/leaderboard${qs ? `?${qs}` : ""}`);
    },

    // Content: PYQ, Current Affairs, Tutorials, Library
    getPyqExams: () => request<PyqExamDto[]>("/api/v1/pyq/exams"),
    getPyqPapers: (query?: { examId?: string; year?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (query?.examId) q.set("examId", query.examId);
      if (query?.year) q.set("year", String(query.year));
      if (query?.search) q.set("search", query.search);
      const qs = q.toString();
      return request<PyqPaperDto[]>(`/api/v1/pyq/papers${qs ? `?${qs}` : ""}`);
    },
    getPyqPaper: (paperId: string) => request<PyqPaperDto>(`/api/v1/pyq/papers/${paperId}`),
    getCurrentAffairs: () => request<CurrentAffairsItemDto[]>("/api/v1/current-affairs"),
    getCurrentAffairsDetail: (slug: string) =>
      request<CurrentAffairsItemDto>(`/api/v1/current-affairs/${slug}`),
    getTutorials: () => request<TutorialSummaryDto[]>("/api/v1/tutorials"),
    getTutorialDetail: (slug: string) =>
      request<TutorialSummaryDto>(`/api/v1/tutorials/${slug}`),
    getTutorial: (slug: string) =>
      request<TutorialSummaryDto>(`/api/v1/tutorials/${slug}`),
    getLessonDetail: (tutorialSlug: string, lessonId: string) =>
      request<LessonDetailDto>(`/api/v1/tutorials/${tutorialSlug}/lessons/${lessonId}`),
    getTutorialLesson: (tutorialSlug: string, lessonId: string) =>
      request<LessonDetailDto>(`/api/v1/tutorials/${tutorialSlug}/lessons/${lessonId}`),
    updateLessonProgress: (
      tutorialSlug: string,
      lessonId: string,
      body: UpdateLessonProgressRequest
    ) =>
      request<{ success: boolean }>(
        `/api/v1/tutorials/${tutorialSlug}/lessons/${lessonId}/progress`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),
    getLibrary: () => request<LibraryItemDto[]>("/api/v1/library"),

    // Courses & Video Player
    getCourses: (query?: { category?: string; difficulty?: string; search?: string; cursor?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (query?.category) q.set("category", query.category);
      if (query?.difficulty) q.set("difficulty", query.difficulty);
      if (query?.search) q.set("search", query.search);
      if (query?.cursor) q.set("cursor", query.cursor);
      if (query?.limit) q.set("limit", String(query.limit));
      const qs = q.toString();
      return request<CourseSummaryDto[]>(`/api/v1/courses${qs ? `?${qs}` : ""}`);
    },
    getCourseDetail: (courseIdOrSlug: string) =>
      request<CourseDetailDto>(`/api/v1/courses/${courseIdOrSlug}`),
    enrollFreeCourse: (courseId: string) =>
      request<{ success: boolean; enrolledAt: string }>(`/api/v1/courses/${courseId}/enroll`, {
        method: "POST",
      }),
    getCourseLesson: (courseSlug: string, lessonId: string) =>
      request<CourseLessonDetailDto>(`/api/v1/courses/${courseSlug}/lessons/${lessonId}`),
    updateCourseLessonProgress: (
      courseSlug: string,
      lessonId: string,
      body: { completed: boolean; timeSpent?: number }
    ) =>
      request<{ success: boolean }>(`/api/v1/courses/${courseSlug}/lessons/${lessonId}/progress`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getMyLearning: () => request<MyLearningDto>("/api/v1/my-learning"),
    getCareerTracks: () => request<CareerTrackDto[]>("/api/v1/career-tracks"),
    getCareerTrackDetail: (trackIdOrSlug: string) =>
      request<CareerTrackDetailDto>(`/api/v1/career-tracks/${trackIdOrSlug}`),

    // Global Search
    search: (query: string) =>
      request<SearchResultsDto>(`/api/v1/search?q=${encodeURIComponent(query)}`),

    // Notifications
    getNotifications: () => request<NotificationItemDto[]>("/api/v1/notifications"),
    markNotificationsRead: (notificationIds: string[]) =>
      request<{ success: boolean }>("/api/v1/notifications/read", {
        method: "PATCH",
        body: JSON.stringify({ notificationIds }),
      }),

    // Devices & Push
    registerDevice: (body: RegisterPushTokenRequest) =>
      request<{ success: boolean }>("/api/v1/devices", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    unregisterDevice: (token: string) =>
      request<{ success: boolean }>(`/api/v1/devices?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      }),
  };
}
