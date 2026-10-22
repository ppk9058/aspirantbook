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

  describe("1. (tabs)/tests", () => {
    it("renders loading, then empty state when no series match", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: [] }),
      } as any);

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("No Test Series Found")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders error state on API 500", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ ok: false, error: { message: "Internal server error" } }),
      } as any);

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Something went wrong")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders network failure state", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network request failed"));

      render(<TestsTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Something went wrong")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders success state with package cards and filter chips", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("UPSC Prelims Full Mock 2026")).toBeTruthy();
          expect(screen.getByText("25 Total Tests")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Filter chips interaction: "BPSC" category
      const bpscChip = screen.getByText("BPSC");
      fireEvent.press(bpscChip);
      expect(bpscChip).toBeTruthy();
    });

    it("performs 401 -> refresh -> retry flow seamlessly", async () => {
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
          // First call rejects with 401
          return {
            ok: false,
            status: 401,
            statusText: "Unauthorized",
            json: async () => ({ ok: false, error: { message: "Token expired" } }),
          } as any;
        }

        // Retried call with new token succeeds
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

      await waitFor(
        () => {
          expect(screen.getByText("Retried Test Series Data")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      expect(await Storage.getAccessToken()).toBe("new-access-token");
    });
  });

  describe("2. tests/series/[id]", () => {
    it("renders series detail with tests and resume/start interaction", async () => {
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
              {
                id: "test-2",
                title: "BPSC Mock 2 - General Science",
                durationMinutes: 60,
                totalQuestions: 75,
                totalMarks: 75,
                isFree: false,
                status: "COMPLETED",
                attemptId: "att-completed-2",
              },
            ],
            isEnrolled: false,
          },
        }),
      } as any);

      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getAllByText("BPSC Prelims Crash Series").length).toBeGreaterThan(0);
          expect(screen.getByText("BPSC Mock 1 - Full Length")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Tap start test
      const startBtn = screen.getAllByText("Start Test")[0];
      fireEvent.press(startBtn);
      expect(__mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/tests/test-1")
      );
    });

    it("renders API 500 error on series detail", async () => {
      __setMockParams({ id: "series-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Failed to load details" } }),
      } as any);

      render(<ExamSeriesDetailScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Failed to load details")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });

  describe("3. tests/[id]/index (Instructions Screen)", () => {
    it("renders instructions and starts test attempt", async () => {
      __setMockParams({ id: "test-instructions-1" });
      await Storage.setAccessToken("valid-test-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" },
            }),
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

      await waitFor(
        () => {
          expect(screen.getAllByText("SSC CGL Tier 1 Mock").length).toBeGreaterThan(0);
          expect(screen.getByText("100")).toBeTruthy();
          expect(screen.getByText("Questions")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Start Attempt
      const startExamBtn = screen.getByText("Start Mock Exam");
      fireEvent.press(startExamBtn);

      await waitFor(
        () => {
          expect(__mockReplace).toHaveBeenCalledWith(
            expect.objectContaining({
              pathname: "/tests/[id]/runner",
              params: { id: "test-instructions-1", attemptId: "new-att-789" },
            })
          );
        },
        { timeout: 4000 }
      );
    });
  });

  describe("4. result (Test Result Screen)", () => {
    it("renders score, accuracy, and actions (Solutions / Leaderboard)", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("142.5")).toBeTruthy();
          expect(screen.getByText("#4")).toBeTruthy();
          expect(screen.getByText("82.5%")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Tap View Solutions
      const solutionsBtn = screen.getByText("View Detailed Solutions & Explanations");
      fireEvent.press(solutionsBtn);
      expect(__mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/tests/[id]/solutions",
          params: { id: "test-result-1", attemptId: "att-result-1" },
        })
      );
    });

    it("renders error state when result fails to load", async () => {
      __setMockParams({ id: "test-err", attemptId: "att-err" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Could not retrieve examination report" } }),
      } as any);

      render(<TestResultScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Could not retrieve examination report")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });

  describe("5. solutions (Solutions Screen)", () => {
    it("renders question solutions and filter tabs", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("What is 15% of 200?")).toBeTruthy();
          expect(screen.getByText("15% of 200 = 0.15 * 200 = 30.")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Filter tabs interaction
      const incorrectChip = screen.getByText("Incorrect");
      fireEvent.press(incorrectChip);
      expect(incorrectChip).toBeTruthy();
    });
  });

  describe("6. my-tests (My Tests Screen)", () => {
    it("renders enrolled and completed tests, and performs 401 refresh flow", async () => {
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
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" },
            }),
          } as any;
        }

        if (urlStr.includes("/api/v1/my-tests")) {
          myTestsCallCount++;
          if (myTestsCallCount === 1) {
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
                inProgress: [
                  {
                    id: "inprog-1",
                    testId: "inprog-1",
                    testTitle: "In-Progress Mock Test",
                    seriesTitle: "UPSC Prelims 2026",
                    attemptId: "att-prog-1",
                    timeRemainingSecs: 1200,
                  },
                ],
                recentAttempts: [],
                enrolledSeries: [],
              },
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, data: {} }),
        } as any;
      });

      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("In-Progress Mock Test")).toBeTruthy();
          expect(screen.getByText("Resume Test")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Tap resume
      fireEvent.press(screen.getByText("Resume Test"));
      expect(__mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/tests/[id]/runner",
          params: { id: "inprog-1", attemptId: "att-prog-1" },
        })
      );
    });

    it("renders empty state when user has no tests in tab", async () => {
      await Storage.setAccessToken("valid-token");
      await Storage.setUser({ id: "u-1", name: "Learner", email: "learner@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { id: "u-1", name: "Learner", email: "learner@test.com", role: "STUDENT" },
            }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: { inProgress: [], recentAttempts: [], enrolledSeries: [] },
          }),
        } as any;
      });

      render(<MyTestsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("No In-Progress Exams")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });

  describe("7. leaderboard (Test Leaderboard Screen)", () => {
    it("renders leaderboard rankings and user position", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("UPSC All India Ranklist")).toBeTruthy();
          expect(screen.getByText("Aditi Rao")).toBeTruthy();
          expect(screen.getByText("Rahul Verma")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });
});
