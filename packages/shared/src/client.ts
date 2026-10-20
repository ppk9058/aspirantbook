import {
  LoginRequest,
  LoginResponseDto,
  RegisterRequest,
  RefreshTokenRequest,
  DeviceSessionDto,
} from "./dto/auth.dto";
import { ViewerProfileDto, UpdateProfileRequest } from "./dto/user.dto";
import {
  TestListItemDto,
  TestDetailDto,
  StartAttemptResponseDto,
  AttemptDetailDto,
  SubmitAnswersRequest,
  SubmitAttemptRequest,
  AttemptResultDto,
  AttemptSolutionsDto,
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

    try {
      const res = await fetchFn(url, { ...init, headers });

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
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: err?.message || "Network request failed",
        },
      };
    }
  }

  return {
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

    // User & Profile
    getMe: () => request<ViewerProfileDto>("/api/v1/me"),
    updateMe: (body: UpdateProfileRequest) =>
      request<ViewerProfileDto>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),

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

    // Content: PYQ, Current Affairs, Tutorials, Library
    getPyqExams: () => request<PyqExamDto[]>("/api/v1/pyq/exams"),
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
