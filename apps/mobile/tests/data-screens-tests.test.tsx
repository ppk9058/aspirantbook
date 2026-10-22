import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TestsTabScreen from "../src/app/(tabs)/tests";
import ExamSeriesDetailScreen from "../src/app/tests/series/[id]";
import TestInstructionsScreen from "../src/app/tests/[id]/index";
import TestResultScreen from "../src/app/tests/[id]/result";
import SolutionsScreen from "../src/app/tests/[id]/solutions";
import MyTestsScreen from "../src/app/my-tests";
import TestLeaderboardScreen from "../src/app/tests/[id]/leaderboard";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";

const { __setMockParams, __mockPush, __mockReplace } = require("expo-router");

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

describe("T3: Mounted Tests - Tests Domain Screens", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    __setMockParams({});
    await Storage.clearAllAuthTokens();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ==========================================
  // 1. (tabs)/tests
  // ==========================================
  describe("1. (tabs)/tests", () => {
    it("[/(tabs)/tests] loading", async () => {
      global.fetch = jest.fn(() => new Promise(() => {}));
      render(<TestsTabScreen />, { wrapper: createWrapper() });
      expect(screen.queryByText("UPSC Prelims Full Mock 2026")).toBeNull();
    });

    it("[/(tabs)/tests] empty", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: [] }),
      } as any);

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("No Test Series Found")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/(tabs)/tests] error500", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ ok: false, error: { message: "Internal server error" } }),
      } as any);

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/(tabs)/tests] networkFailure", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network request failed"));

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Connection Unavailable")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/(tabs)/tests] success", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: [
            {
              id: "pkg-1",
              title: "UPSC Prelims Full Mock 2026",
              totalTests: 25,
              totalQuestions: 2500,
              isEnrolled: false,
              isPassIncluded: true,
              category: "Full Mock",
            },
          ],
        }),
      } as any);

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("UPSC Prelims Full Mock 2026")).toBeTruthy();
        expect(screen.getByText("25 Total Tests")).toBeTruthy();
      }, { timeout: 4000 });

      const bpscChip = screen.getByText("BPSC");
      fireEvent.press(bpscChip);
      expect(bpscChip).toBeTruthy();
    });

    it("[/(tabs)/tests] 401 refresh", async () => {
      await Storage.setAccessToken("expired-token");
      await Storage.setRefreshToken("valid-refresh-token");

      let fetchCallCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "new-access-token", refreshToken: "new-refresh-token" } },
            }),
          } as any;
        }

        fetchCallCount++;
        if (fetchCallCount === 1) {
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
                id: "pkg-retried",
                title: "Retried Test Series Data",
                totalTests: 10,
                isEnrolled: true,
                category: "All",
              },
            ],
          }),
        } as any;
      });

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Retried Test Series Data")).toBeTruthy();
      }, { timeout: 4000 });

      expect(await Storage.getAccessToken()).toBe("new-access-token");
    });
  });

  // ==========================================
  // 2. tests/series/[id]
  // ==========================================
  describe("2. tests/series/[id]", () => {
    it("[/tests/series/[id]] loading", async () => {
      __setMockParams({ id: "series-123" });
      global.fetch = jest.fn(() => new Promise(() => {}));
      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });
      expect(screen.queryByText("BPSC Prelims Crash Series")).toBeNull();
    });

    it("[/tests/series/[id]] empty", async () => {
      __setMockParams({ id: "series-123" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            series: { id: "series-123", title: "Empty Series", slug: "empty-series", category: "Other", totalTests: 0 },
            tests: [],
            isEnrolled: false,
          },
        }),
      } as any);

      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("Empty Series").length).toBeGreaterThan(0);
        expect(screen.getByText("No Tests In This Section")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/series/[id]] error500", async () => {
      __setMockParams({ id: "series-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Failed to load details" } }),
      } as any);

      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Failed to load details")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/series/[id]] networkFailure", async () => {
      __setMockParams({ id: "series-net" });
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection lost"));

      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Network connection lost")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/series/[id]] success", async () => {
      __setMockParams({ id: "series-123" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            series: {
              id: "series-123",
              title: "BPSC Prelims Crash Series",
              slug: "bpsc-prelims-crash",
              category: "State PSC",
              totalTests: 5,
            },
            tests: [
              {
                id: "test-1",
                title: "BPSC Mock 1 - Full Length",
                durationMinutes: 120,
                totalQuestions: 150,
                totalMarks: 150,
                isFree: true,
                status: "NOT_STARTED",
              },
            ],
            isEnrolled: false,
          },
        }),
      } as any);

      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("BPSC Prelims Crash Series").length).toBeGreaterThan(0);
        expect(screen.getByText("BPSC Mock 1 - Full Length")).toBeTruthy();
      }, { timeout: 4000 });

      const startBtn = screen.getAllByText("Start Test")[0];
      fireEvent.press(startBtn);
      expect(__mockPush).toHaveBeenCalledWith(expect.stringContaining("/tests/test-1"));
    });

    it("[/tests/series/[id]] 401 refresh", async () => {
      __setMockParams({ id: "series-401" });
      await Storage.setAccessToken("expired-series-token");
      await Storage.setRefreshToken("valid-series-refresh");

      let callCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "new-series-token", refreshToken: "new-series-ref" } },
            }),
          } as any;
        }

        callCount++;
        if (callCount === 1) {
          return { ok: false, status: 401, json: async () => ({ ok: false, error: { message: "Token expired" } }) } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              series: { id: "series-401", title: "Refreshed Series Title", totalTests: 1 },
              tests: [{ id: "t-ref", title: "Refreshed Test Item", durationMinutes: 30, totalQuestions: 25, totalMarks: 50, isFree: true, status: "NOT_STARTED" }],
              isEnrolled: false,
            },
          }),
        } as any;
      });

      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("Refreshed Series Title").length).toBeGreaterThan(0);
      }, { timeout: 4000 });

      expect(await Storage.getAccessToken()).toBe("new-series-token");
    });
  });

  // ==========================================
  // 3. tests/[id] (Instructions Screen)
  // ==========================================
  describe("3. tests/[id]", () => {
    it("[/tests/[id]] loading", async () => {
      __setMockParams({ id: "test-inst" });
      global.fetch = jest.fn(() => new Promise(() => {}));
      render(<TestInstructionsScreen />, { wrapper: createWrapper() });
      expect(screen.queryByText("SSC CGL Tier 1 Mock")).toBeNull();
    });

    it("[/tests/[id]] empty", async () => {
      __setMockParams({ id: "test-inst" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            id: "test-inst",
            title: "Empty Test Instructions",
            durationMinutes: 0,
            totalMarks: 0,
            totalQuestions: 0,
            instructions: "",
          },
        }),
      } as any);

      render(<TestInstructionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("Empty Test Instructions").length).toBeGreaterThan(0);
      }, { timeout: 4000 });
    });

    it("[/tests/[id]] error500", async () => {
      __setMockParams({ id: "test-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Server error fetching instructions" } }),
      } as any);

      render(<TestInstructionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Server error fetching instructions")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]] networkFailure", async () => {
      __setMockParams({ id: "test-net" });
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failure"));

      render(<TestInstructionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Network connection failure")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]] success", async () => {
      __setMockParams({ id: "test-instructions-1" });
      await Storage.setAccessToken("valid-test-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" } }),
          } as any;
        }

        if (urlStr.includes("/attempts")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: {
                attemptId: "new-att-789",
                testId: "test-instructions-1",
                startedAt: new Date().toISOString(),
                serverNow: new Date().toISOString(),
                durationMinutes: 60,
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
              id: "test-instructions-1",
              title: "SSC CGL Tier 1 Mock",
              durationMinutes: 60,
              totalMarks: 200,
              totalQuestions: 100,
              instructions: "Please read instructions carefully.",
            },
          }),
        } as any;
      });

      render(<TestInstructionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("SSC CGL Tier 1 Mock").length).toBeGreaterThan(0);
        expect(screen.getByText("100")).toBeTruthy();
        expect(screen.getByText("Questions")).toBeTruthy();
      }, { timeout: 4000 });

      const startExamBtn = screen.getByText("Start Mock Exam");
      fireEvent.press(startExamBtn);

      await waitFor(() => {
        expect(__mockReplace).toHaveBeenCalledWith(
          expect.objectContaining({
            pathname: "/tests/[id]/runner",
            params: { id: "test-instructions-1", attemptId: "new-att-789" },
          })
        );
      }, { timeout: 4000 });
    });

    it("[/tests/[id]] unauthenticated prompts guest with Sign In Required alert", async () => {
      __setMockParams({ id: "test-instructions-guest" });
      await Storage.clearAllAuthTokens();

      const alertSpy = jest.spyOn(require("react-native").Alert, "alert");

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            id: "test-instructions-guest",
            title: "Guest Mock Exam",
            durationMinutes: 60,
            totalMarks: 200,
            totalQuestions: 100,
            instructions: "Please read instructions carefully.",
          },
        }),
      } as any);

      render(<TestInstructionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("Guest Mock Exam").length).toBeGreaterThan(0);
      }, { timeout: 4000 });

      const startExamBtn = screen.getByText("Start Mock Exam");
      fireEvent.press(startExamBtn);

      expect(alertSpy).toHaveBeenCalledWith(
        "Sign In Required",
        expect.stringContaining("Please sign in to attempt this mock exam"),
        expect.any(Array)
      );

      alertSpy.mockRestore();
    });

    it("[/tests/[id]] 401 refresh", async () => {
      __setMockParams({ id: "test-inst-401" });
      await Storage.setAccessToken("expired-inst-token");
      await Storage.setRefreshToken("valid-inst-refresh");

      let callCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "new-inst-token", refreshToken: "new-inst-ref" } },
            }),
          } as any;
        }

        callCount++;
        if (callCount === 1) {
          return { ok: false, status: 401, json: async () => ({ ok: false, error: { message: "Token expired" } }) } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              id: "test-inst-401",
              title: "Refreshed Instruction Mock",
              durationMinutes: 60,
              totalMarks: 100,
              totalQuestions: 50,
            },
          }),
        } as any;
      });

      render(<TestInstructionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("Refreshed Instruction Mock").length).toBeGreaterThan(0);
      }, { timeout: 4000 });

      expect(await Storage.getAccessToken()).toBe("new-inst-token");
    });
  });

  // ==========================================
  // 4. tests/[id]/result
  // ==========================================
  describe("4. tests/[id]/result", () => {
    it("[/tests/[id]/result] loading", async () => {
      __setMockParams({ id: "test-res", attemptId: "att-res" });
      global.fetch = jest.fn(() => new Promise(() => {}));
      render(<TestResultScreen />, { wrapper: createWrapper() });
      expect(screen.queryByText("142.5")).toBeNull();
    });

    it("[/tests/[id]/result] empty", async () => {
      __setMockParams({ id: "test-res", attemptId: "att-empty" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            attemptId: "att-empty",
            testId: "test-res",
            testTitle: "Zero Score Exam",
            score: 0,
            totalMarks: 100,
            allIndiaRank: 0,
            totalCandidates: 0,
            accuracyPercentage: 0,
            timeTakenSecs: 0,
            correctCount: 0,
            wrongCount: 0,
            skippedCount: 50,
            markedCount: 0,
            percentile: 0,
            submittedAt: new Date().toISOString(),
          },
        }),
      } as any);

      render(<TestResultScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText("Zero Score Exam").length).toBeGreaterThan(0);
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/result] error500", async () => {
      __setMockParams({ id: "test-err", attemptId: "att-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Could not retrieve examination report" } }),
      } as any);

      render(<TestResultScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Could not retrieve examination report")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/result] networkFailure", async () => {
      __setMockParams({ id: "test-net", attemptId: "att-net" });
      global.fetch = jest.fn().mockRejectedValue(new Error("Network report unreachable"));

      render(<TestResultScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Network report unreachable")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/result] success", async () => {
      __setMockParams({ id: "test-result-1", attemptId: "att-result-1" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            attemptId: "att-result-1",
            testId: "test-result-1",
            testTitle: "UPSC CSAT Mock 1",
            score: 142.5,
            totalMarks: 200,
            allIndiaRank: 4,
            totalCandidates: 1200,
            accuracyPercentage: 82.5,
            timeTakenSecs: 3450,
            correctCount: 75,
            wrongCount: 15,
            skippedCount: 10,
            markedCount: 5,
            percentile: 98.2,
            submittedAt: new Date().toISOString(),
          },
        }),
      } as any);

      render(<TestResultScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("142.5")).toBeTruthy();
        expect(screen.getByText("#4")).toBeTruthy();
        expect(screen.getByText("82.5%")).toBeTruthy();
      }, { timeout: 4000 });

      const solutionsBtn = screen.getByText("View Detailed Solutions & Explanations");
      fireEvent.press(solutionsBtn);
      expect(__mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/tests/[id]/solutions",
          params: { id: "test-result-1", attemptId: "att-result-1" },
        })
      );
    });
  });

  // ==========================================
  // 5. tests/[id]/solutions
  // ==========================================
  describe("5. tests/[id]/solutions", () => {
    it("[/tests/[id]/solutions] loading", async () => {
      __setMockParams({ id: "test-sol", attemptId: "att-sol" });
      global.fetch = jest.fn(() => new Promise(() => {}));
      render(<SolutionsScreen />, { wrapper: createWrapper() });
      expect(screen.queryByText("What is 15% of 200?")).toBeNull();
    });

    it("[/tests/[id]/solutions] empty", async () => {
      __setMockParams({ id: "test-sol", attemptId: "att-sol" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: { attemptId: "att-sol", testTitle: "Empty Solutions", questions: [] },
        }),
      } as any);

      render(<SolutionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("No Questions Match Filter")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/solutions] error500", async () => {
      __setMockParams({ id: "test-sol-err", attemptId: "att-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Solutions fetch error 500" } }),
      } as any);

      render(<SolutionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Solutions fetch error 500")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/solutions] networkFailure", async () => {
      __setMockParams({ id: "test-sol-net", attemptId: "att-net" });
      global.fetch = jest.fn().mockRejectedValue(new Error("Solutions network failure"));

      render(<SolutionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Solutions network failure")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/solutions] success", async () => {
      __setMockParams({ id: "test-sol-1", attemptId: "att-sol-1" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            attemptId: "att-sol-1",
            testTitle: "CSAT Solutions",
            questions: [
              {
                id: "q-sol-1",
                questionNumber: 1,
                textEn: "What is 15% of 200?",
                optionsEn: ["25", "30", "35", "40"],
                correctOption: "B",
                selectedOption: "B",
                status: "CORRECT",
                explanationEn: "15% of 200 = 0.15 * 200 = 30.",
              },
            ],
          },
        }),
      } as any);

      render(<SolutionsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("What is 15% of 200?")).toBeTruthy();
        expect(screen.getByText("15% of 200 = 0.15 * 200 = 30.")).toBeTruthy();
      }, { timeout: 4000 });

      const incorrectChip = screen.getByText("Incorrect");
      fireEvent.press(incorrectChip);
      expect(incorrectChip).toBeTruthy();
    });
  });

  // ==========================================
  // 6. my-tests
  // ==========================================
  describe("6. my-tests", () => {
    it("[/my-tests] unauth renders sign in required state", async () => {
      await Storage.clearAllAuthTokens();
      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Sign In to Access Tests")).toBeTruthy();
      });
    });

    it("[/my-tests] loading", async () => {
      await Storage.setAccessToken("valid-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });
      global.fetch = jest.fn(() => new Promise(() => {}));
      render(<MyTestsScreen />, { wrapper: createWrapper() });
      expect(screen.queryByText("In-Progress Mock Test")).toBeNull();
    });

    it("[/my-tests] empty", async () => {
      await Storage.setAccessToken("valid-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" } }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, data: { inProgress: [], recentAttempts: [], enrolledSeries: [] } }),
        } as any;
      });

      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("No In-Progress Exams")).toBeTruthy();
      }, { timeout: 8000 });
    }, 15000);

    it("[/my-tests] error500", async () => {
      await Storage.setAccessToken("valid-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return { ok: true, status: 200, json: async () => ({ ok: true, data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" } }) } as any;
        }
        return { ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal error loading my tests" } }) } as any;
      });

      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Internal error loading my tests")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/my-tests] networkFailure", async () => {
      await Storage.setAccessToken("valid-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return { ok: true, status: 200, json: async () => ({ ok: true, data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" } }) } as any;
        }
        throw new Error("Network unreachable for my-tests");
      });

      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Network unreachable for my-tests")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/my-tests] success", async () => {
      await Storage.setAccessToken("valid-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return { ok: true, status: 200, json: async () => ({ ok: true, data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" } }) } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              inProgress: [{ id: "inprog-1", testId: "inprog-1", testTitle: "In-Progress Mock Test", seriesTitle: "UPSC Prelims 2026", attemptId: "att-prog-1", timeRemainingSecs: 1200 }],
              recentAttempts: [],
              enrolledSeries: [],
            },
          }),
        } as any;
      });

      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("In-Progress Mock Test")).toBeTruthy();
        expect(screen.getByText("Resume Test")).toBeTruthy();
      }, { timeout: 4000 });

      fireEvent.press(screen.getByText("Resume Test"));
      expect(__mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/tests/[id]/runner",
          params: { id: "inprog-1", attemptId: "att-prog-1" },
        })
      );
    });

    it("[/my-tests] 401 refresh", async () => {
      await Storage.setAccessToken("expired-mytests-token");
      await Storage.setRefreshToken("valid-mytests-refresh");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      let myTestsCallCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "refreshed-mytests-token", refreshToken: "new-ref" } },
            }),
          } as any;
        }

        if (urlStr.includes("/api/v1/me")) {
          return { ok: true, status: 200, json: async () => ({ ok: true, data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" } }) } as any;
        }

        if (urlStr.includes("/api/v1/my-tests")) {
          myTestsCallCount++;
          if (myTestsCallCount === 1) {
            return { ok: false, status: 401, json: async () => ({ ok: false, error: { message: "Token expired" } }) } as any;
          }

          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: {
                inProgress: [{ id: "inprog-ref", testId: "inprog-ref", testTitle: "Refreshed In-Progress Test", seriesTitle: "UPSC 2026", attemptId: "att-ref", timeRemainingSecs: 900 }],
                recentAttempts: [],
                enrolledSeries: [],
              },
            }),
          } as any;
        }

        return { ok: true, status: 200, json: async () => ({ ok: true, data: {} }) } as any;
      });

      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Refreshed In-Progress Test")).toBeTruthy();
      }, { timeout: 4000 });

      expect(await Storage.getAccessToken()).toBe("refreshed-mytests-token");
    });
  });

  // ==========================================
  // 7. tests/[id]/leaderboard
  // ==========================================
  describe("7. tests/[id]/leaderboard", () => {
    it("[/tests/[id]/leaderboard] loading", async () => {
      __setMockParams({ id: "test-lb" });
      global.fetch = jest.fn(() => new Promise(() => {}));
      render(<TestLeaderboardScreen />, { wrapper: createWrapper() });
      expect(screen.queryByText("Aditi Rao")).toBeNull();
    });

    it("[/tests/[id]/leaderboard] empty", async () => {
      __setMockParams({ id: "test-lb" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: { testId: "test-lb", testTitle: "Empty Leaderboard", totalMarks: 100, totalParticipants: 0, currentUserRank: null, rankings: [] },
        }),
      } as any);

      render(<TestLeaderboardScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("No Candidates Found")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/leaderboard] error500", async () => {
      __setMockParams({ id: "test-lb-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Leaderboard error 500" } }),
      } as any);

      render(<TestLeaderboardScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Leaderboard error 500")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/leaderboard] networkFailure", async () => {
      __setMockParams({ id: "test-lb-net" });
      global.fetch = jest.fn().mockRejectedValue(new Error("Leaderboard network error"));

      render(<TestLeaderboardScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Leaderboard network error")).toBeTruthy();
      }, { timeout: 4000 });
    });

    it("[/tests/[id]/leaderboard] success", async () => {
      __setMockParams({ id: "test-lb-1" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            testId: "test-lb-1",
            testTitle: "UPSC All India Ranklist",
            totalMarks: 200,
            totalParticipants: 5400,
            currentUserRank: null,
            rankings: [
              { rank: 1, name: "Aditi Rao", score: 188, totalMarks: 200, accuracy: 94 },
              { rank: 2, name: "Rahul Verma", score: 182, totalMarks: 200, accuracy: 91 },
            ],
          },
        }),
      } as any);

      render(<TestLeaderboardScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("UPSC All India Ranklist")).toBeTruthy();
        expect(screen.getByText("Aditi Rao")).toBeTruthy();
        expect(screen.getByText("Rahul Verma")).toBeTruthy();
      }, { timeout: 4000 });
    });
  });
});
