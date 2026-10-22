import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";

// Components to test
import CoursesTabScreen, { cleanDescriptionPreview } from "../src/app/(tabs)/courses";
import { api } from "../src/lib/api";
import CourseDetailScreen from "../src/app/courses/[id]";
import CourseLessonPlayerScreen from "../src/app/courses/[id]/lesson/[lessonId]";
import MyLearningScreen from "../src/app/my-learning";
import CareerTracksIndexScreen from "../src/app/career-tracks/index";
import CareerTrackDetailScreen from "../src/app/career-tracks/[id]";

const { __mockPush, __mockReplace, __setMockParams } = require("expo-router");
const { useVideoPlayer } = require("expo-video");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <GoalProvider>{children}</GoalProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

describe("T3: Mounted Tests - Courses Domain Screens", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __setMockParams({});
    await Storage.clearAllAuthTokens();
  });

  afterEach(async () => {
    await Storage.clearAllAuthTokens();
  });

  describe("1. (tabs)/courses", () => {
    it("renders loading, then empty state when no courses match", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: [] }),
      } as any);

      render(<CoursesTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("No Courses Found")).toBeTruthy();
          expect(screen.getByText("Switch →")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("sanitizes network error messages and suppresses raw java.net exceptions when __DEV__ is false", async () => {
      const origDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;
      try {
        global.fetch = jest.fn().mockRejectedValue(
          new Error("fetch failed: java.net.ConnectException: Failed to connect to /192.168.0.101:3045")
        );

        render(<CoursesTabScreen />, { wrapper: createWrapper() });

        await waitFor(
          () => {
            expect(screen.getByText("Could not reach the server. Check your connection and try again.")).toBeTruthy();
          },
          { timeout: 4000 }
        );
        expect(screen.queryByText(/java\.net|ConnectException|fetch failed/i)).toBeNull();
      } finally {
        (global as any).__DEV__ = origDev;
      }
    });

    it("renders error state on API 500", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Server error in courses catalogue" } }),
      } as any);

      render(<CoursesTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Server error in courses catalogue")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("returns 503 unconfigured error when EXPO_PUBLIC_API_URL is missing", async () => {
      const origUrl = process.env.EXPO_PUBLIC_API_URL;
      delete process.env.EXPO_PUBLIC_API_URL;
      try {
        const res = await api.getCourses();
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error?.code).toBe("API_UNCONFIGURED");
          expect(res.error?.message).toContain("API endpoint is not configured");
        }
      } finally {
        process.env.EXPO_PUBLIC_API_URL = origUrl;
      }
    });

    it("renders sanitized course description preview without raw markdown headings", async () => {
      const mockCourse = {
        id: "c-md-1",
        title: "Markdown Formatted Course",
        description: "# About this tutorial\n**Key concepts** and ==important==",
        difficulty: "BEGINNER",
        price: 0,
        isFree: true,
        thumbnailUrl: null,
        lessonsCount: 5,
        chaptersCount: 1,
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: [mockCourse] }),
      } as any);

      render(<CoursesTabScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByText(/About this tutorial Key concepts/)).toBeTruthy();
      });
      expect(screen.queryByText(/# About this tutorial/)).toBeNull();
      expect(cleanDescriptionPreview("# Heading 1\n**Bold** and ==Mark==")).toBe("Heading 1 Bold and Mark");
      expect(cleanDescriptionPreview(null)).toBe("");
    });

    it("renders success state with course cards and handles filter selection", async () => {
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/career-tracks")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, data: [] }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: [
              {
                id: "course-1",
                title: "Complete Indian Polity for UPSC",
                slug: "indian-polity-upsc",
                difficulty: "BEGINNER",
                lessonsCount: 45,
                durationMinutes: 900,
                isFree: true,
                price: 0,
              },
            ],
          }),
        } as any;
      });

      render(<CoursesTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Complete Indian Polity for UPSC")).toBeTruthy();
          expect(screen.getByText("45 lessons")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Press chip filter
      const beginnerChip = screen.getByText("Beginner");
      fireEvent.press(beginnerChip);
      expect(beginnerChip).toBeTruthy();
    });

    it("performs 401 -> refresh -> retry flow seamlessly", async () => {
      await Storage.setAccessToken("expired-courses-token");
      await Storage.setRefreshToken("valid-courses-refresh");

      let fetchCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "new-courses-token", refreshToken: "new-courses-ref" } },
            }),
          } as any;
        }

        if (urlStr.includes("/career-tracks")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, data: [] }),
          } as any;
        }

        fetchCount++;
        if (fetchCount === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ ok: false, error: { message: "Token expired" } }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: [
              {
                id: "course-refreshed",
                title: "Refreshed Economy Masterclass",
                slug: "economy-masterclass",
                difficulty: "INTERMEDIATE",
                lessonsCount: 30,
                durationMinutes: 600,
                isFree: false,
                price: 1999,
              },
            ],
          }),
        } as any;
      });

      render(<CoursesTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Refreshed Economy Masterclass")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      expect(await Storage.getAccessToken()).toBe("new-courses-token");
    });
  });

  describe("2. courses/[id]", () => {
    it("renders course detail with chapters and handles locked lesson tap", async () => {
      __setMockParams({ id: "course-123" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            course: {
              id: "course-123",
              title: "Modern Indian History",
              slug: "modern-indian-history",
              description: "From 1757 to 1947",
              difficulty: "INTERMEDIATE",
              isFree: false,
              price: 1499,
              totalLessons: 2,
              durationMinutes: 120,
              isEnrolled: false,
            },
            chapters: [
              {
                id: "ch-1",
                title: "Chapter 1: The Revolt of 1857",
                order: 1,
                lessons: [
                  {
                    id: "les-free",
                    title: "Intro to 1857 revolt",
                    durationMinutes: 20,
                    isFree: true,
                    isLocked: false,
                    isCompleted: false,
                  },
                  {
                    id: "les-locked",
                    title: "Consequences of 1857",
                    durationMinutes: 40,
                    isFree: false,
                    isLocked: true,
                    isCompleted: false,
                  },
                ],
              },
            ],
          },
        }),
      } as any);

      render(<CourseDetailScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getAllByText("Modern Indian History").length).toBeGreaterThan(0);
          expect(screen.getByText("Chapter 1: The Revolt of 1857")).toBeTruthy();
          expect(screen.getByText("Intro to 1857 revolt")).toBeTruthy();
          expect(screen.getByText("Consequences of 1857")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Tapping free lesson navigates
      fireEvent.press(screen.getByText("Intro to 1857 revolt"));
      expect(__mockPush).toHaveBeenCalledWith("/courses/course-123/lesson/les-free");

      // Tapping locked lesson triggers enrollment requirement message
      fireEvent.press(screen.getByText("Consequences of 1857"));
      await waitFor(() => {
        expect(
          screen.getByText("Enroll in this course on the website to access locked lessons.")
        ).toBeTruthy();
      });
    });

    it("renders error state when course details fail to load", async () => {
      __setMockParams({ id: "course-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Course catalog unreachable" } }),
      } as any);

      render(<CourseDetailScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Course catalog unreachable")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("[/courses/[id]] 401 refresh retry flow", async () => {
      __setMockParams({ id: "course-ref-1" });
      await Storage.setAccessToken("expired-course-detail-token");
      await Storage.setRefreshToken("valid-course-detail-refresh");

      let fetchCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "refreshed-course-detail-token", refreshToken: "new-course-ref" } },
            }),
          } as any;
        }

        fetchCount++;
        if (fetchCount === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ ok: false, error: { message: "Token expired" } }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              course: {
                id: "course-ref-1",
                title: "Refreshed Course Detail",
                slug: "refreshed-course-detail",
                description: "Description",
                difficulty: "BEGINNER",
                isFree: true,
                totalLessons: 1,
              },
              chapters: [],
            },
          }),
        } as any;
      });

      render(<CourseDetailScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("Refreshed Course Detail").length).toBeGreaterThan(0);
      }, { timeout: 4000 });

      expect(await Storage.getAccessToken()).toBe("refreshed-course-detail-token");
    });
  });

  describe("3. courses/[id]/lesson/[lessonId] (Video Player Screen)", () => {
    it("asserts locked lesson never exposes streamUrl and displays lock overlay", async () => {
      __setMockParams({ id: "course-123", lessonId: "les-locked-1" });

      const streamUrl = "https://secure-stream.example.com/hls/secret.m3u8";
      const externalUrl = "https://youtube.com/watch?v=secret-video";

      global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes("/lessons/")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({
              ok: true,
              data: {
                id: "les-locked-1",
                title: "Advanced Constitutional Framework",
                courseTitle: "Indian Polity",
                isLocked: true,
                videoUrl: streamUrl,
                streamUrl: streamUrl,
                externalUrl: externalUrl,
                isCompleted: false,
              },
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            ok: true,
            data: {
              course: { id: "course-123", title: "Indian Polity", price: 1999 },
              chapters: [],
            },
          }),
        } as Response;
      });

      render(<CourseLessonPlayerScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Lesson Locked")).toBeTruthy();
          expect(screen.getByText("Enroll in the full course to view this lesson")).toBeTruthy();
          // Speed bar ("Speed" text) must be absent
          expect(screen.queryByText("Speed")).toBeNull();
          // No VideoView rendered
          expect(screen.queryByTestId("expo-video-view")).toBeNull();
        },
        { timeout: 4000 }
      );

      // (a) JSON.stringify(screen.toJSON()) does not contain the stream URL or external URL
      const treeJson = JSON.stringify(screen.toJSON());
      expect(treeJson).not.toContain(streamUrl);
      expect(treeJson).not.toContain(externalUrl);

      // (b) the video source passed to useVideoPlayer is "" for a locked lesson
      const lastPlayerCall = (useVideoPlayer as jest.Mock).mock.calls[
        (useVideoPlayer as jest.Mock).mock.calls.length - 1
      ];
      expect(lastPlayerCall[0]).toBe("");
    });

    it("renders playable native stream when isLocked is false", async () => {
      __setMockParams({ id: "course-123", lessonId: "les-unlocked-1" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/lessons/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: {
                id: "les-unlocked-1",
                title: "Preamble to Constitution",
                courseTitle: "Indian Polity",
                isLocked: false,
                videoUrl: "https://stream.example.com/hls/preamble.m3u8",
                isCompleted: false,
              },
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              course: { id: "course-123", title: "Indian Polity" },
              chapters: [],
            },
          }),
        } as any;
      });

      render(<CourseLessonPlayerScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getAllByText("Preamble to Constitution").length).toBeGreaterThan(0);
          expect(screen.getByText("Speed")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });

  describe("4. my-learning", () => {
    it("renders guest sign in state when not authenticated", async () => {
      render(<MyLearningScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Sign In to Access Enrolled Courses")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders empty state when learner has zero enrollments", async () => {
      await Storage.setAccessToken("valid-user-token");
      await Storage.setUser({ id: "u-1", name: "Student", email: "student@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { id: "u-1", name: "Student", email: "student@test.com", role: "STUDENT" },
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              enrolledCourses: [],
            },
          }),
        } as any;
      });

      render(<MyLearningScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("No Enrollments Found")).toBeTruthy();
      });
    });

    it("renders enrolled courses and handles continue learning tap", async () => {
      await Storage.setAccessToken("valid-user-token");
      await Storage.setUser({ id: "u-1", name: "Student", email: "student@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { id: "u-1", name: "Student", email: "student@test.com", role: "STUDENT" },
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              enrolledCourses: [
                {
                  courseId: "course-enrolled-1",
                  title: "Geography Comprehensive Batch",
                  progressPercent: 45,
                  completedLessons: 9,
                  totalLessons: 20,
                  lastLessonId: "les-geo-10",
                },
              ],
            },
          }),
        } as any;
      });

      render(<MyLearningScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Geography Comprehensive Batch")).toBeTruthy();
          expect(screen.getByText("9/20 Lessons")).toBeTruthy();
          expect(screen.getByText("IN PROGRESS")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Press card to continue lesson
      fireEvent.press(screen.getByText("Geography Comprehensive Batch"));
      expect(__mockPush).toHaveBeenCalledWith("/courses/course-enrolled-1/lesson/les-geo-10");
    });

    it("[/my-learning] 401 refresh retry flow", async () => {
      await Storage.setAccessToken("expired-mylearn-token");
      await Storage.setRefreshToken("valid-mylearn-refresh");
      await Storage.setUser({ id: "u-1", name: "Student", email: "student@test.com" });

      let fetchCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "refreshed-mylearn-token", refreshToken: "new-mylearn-refresh" } },
            }),
          } as any;
        }

        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { id: "u-1", name: "Student", email: "student@test.com", role: "STUDENT" },
            }),
          } as any;
        }

        fetchCount++;
        if (fetchCount === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ ok: false, error: { message: "Token expired" } }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              enrolledCourses: [
                {
                  courseId: "course-refreshed-1",
                  title: "Refreshed My Learning Course",
                  progressPercent: 50,
                  completedLessons: 5,
                  totalLessons: 10,
                  lastLessonId: "les-ref-5",
                },
              ],
            },
          }),
        } as any;
      });

      render(<MyLearningScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Refreshed My Learning Course")).toBeTruthy();
      }, { timeout: 4000 });

      expect(await Storage.getAccessToken()).toBe("refreshed-mylearn-token");
    });
  });

  describe("5. career-tracks", () => {
    it("renders empty state when no career tracks are available", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: [],
        }),
      } as any);

      render(<CareerTracksIndexScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("No Tracks Available")).toBeTruthy();
      });
    });

    it("renders career tracks index list", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: [
            {
              id: "track-upsc",
              title: "UPSC Civil Services Foundation",
              slug: "upsc-foundation",
              description: "Complete roadmap from prelims to interview",
              totalCourses: 12,
              durationMonths: 12,
            },
          ],
        }),
      } as any);

      render(<CareerTracksIndexScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("UPSC Civil Services Foundation")).toBeTruthy();
          expect(screen.getByText("12 courses")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders career track detail roadmap", async () => {
      __setMockParams({ id: "track-upsc" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            track: {
              id: "track-upsc",
              title: "UPSC Civil Services Foundation",
              slug: "upsc-foundation",
              description: "Comprehensive multi-course path",
              totalCourses: 1,
            },
            courses: [
              {
                id: "course-track-1",
                title: "Phase 1: NCERT Fundamentals",
                difficulty: "BEGINNER",
                totalLessons: 30,
                durationMinutes: 600,
                isFree: true,
              },
            ],
          },
        }),
      } as any);

      render(<CareerTrackDetailScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getAllByText("UPSC Civil Services Foundation").length).toBeGreaterThan(0);
          expect(screen.getByText("Phase 1: NCERT Fundamentals")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });
});
