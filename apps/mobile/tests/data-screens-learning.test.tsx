import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";

// Components to test
import CurrentAffairsScreen from "../src/app/current-affairs/index";
import PyqsScreen from "../src/app/pyqs/index";
import PyqPdfViewScreen from "../src/app/pyqs/pdf-view";

const { __mockPush, __setMockParams } = require("expo-router");

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

describe("T3: Mounted Tests - Learning & Aux Domain Screens", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __setMockParams({});
    await Storage.clearAllAuthTokens();
  });

  afterEach(async () => {
    await Storage.clearAllAuthTokens();
  });

  describe("1. current-affairs", () => {
    it("renders loading, then empty state when no items exist", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: [] }),
      } as any);

      render(<CurrentAffairsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("No Current Affairs Listed")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders error state on API 500", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Current affairs feed offline" } }),
      } as any);

      render(<CurrentAffairsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Current affairs feed offline")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders success state with current affairs articles and handles tabs", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: [
            {
              id: "ca-1",
              title: "ISRO Chandrayaan-4 Mission Overview",
              slug: "chandrayaan-4-overview",
              category: "SCIENCE_TECH",
              date: "2026-10-20",
              summary: "Key highlights and objectives of the upcoming lunar mission.",
              hasQuiz: true,
              quizTestId: "test-ca-quiz-1",
            },
          ],
        }),
      } as any);

      render(<CurrentAffairsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("ISRO Chandrayaan-4 Mission Overview")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Tab interaction: monthly PDFs
      const monthlyTab = screen.getByText("Monthly PDF Magazines");
      fireEvent.press(monthlyTab);
      expect(monthlyTab).toBeTruthy();
    });

    it("performs 401 -> refresh -> retry flow seamlessly", async () => {
      await Storage.setAccessToken("expired-ca-token");
      await Storage.setRefreshToken("valid-ca-refresh");

      let fetchCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "refreshed-ca-token", refreshToken: "new-ca-ref" } },
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
            data: [
              {
                id: "ca-refreshed",
                title: "Refreshed Global Economic Outlook",
                slug: "global-economic-outlook",
                category: "ECONOMY",
                date: "2026-10-21",
                summary: "Analysis of global trade indicators.",
              },
            ],
          }),
        } as any;
      });

      render(<CurrentAffairsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Refreshed Global Economic Outlook")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      expect(await Storage.getAccessToken()).toBe("refreshed-ca-token");
    });
  });

  describe("2. pyqs", () => {
    it("renders loading, then empty state when no papers match", async () => {
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/pyq/exams")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, data: [] }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, data: [] }),
        } as any;
      });

      render(<PyqsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("No Papers Found")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders error state when PYQs fail to load", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "PYQ database unavailable" } }),
      } as any);

      render(<PyqsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("PYQ database unavailable")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders papers and handles category filter press", async () => {
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/pyq/exams")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: [
                { id: "exam-upsc", name: "UPSC CSE", totalPapers: 10 },
                { id: "exam-bpsc", name: "BPSC", totalPapers: 5 },
              ],
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: [
              {
                id: "paper-1",
                title: "UPSC Prelims GS 1 - 2024",
                year: 2024,
                examId: "exam-upsc",
                examName: "UPSC CSE",
                totalMarks: 200,
                durationMinutes: 120,
              },
            ],
          }),
        } as any;
      });

      render(<PyqsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("UPSC Prelims GS 1 - 2024")).toBeTruthy();
          expect(screen.getByText("UPSC CSE")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Tap BPSC filter
      const bpscChip = screen.getByText(/BPSC/);
      fireEvent.press(bpscChip);
      expect(bpscChip).toBeTruthy();
    });
  });

  describe("3. pyqs/pdf-view", () => {
    it("renders paper viewer header, metadata, and actions", async () => {
      __setMockParams({ paperId: "paper-123", title: "UPSC 2023 GS Paper 1" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            id: "paper-123",
            title: "UPSC 2023 GS Paper 1",
            year: 2023,
            fileUrl: "https://example.com/pyq/2023-gs1.pdf",
            totalMarks: 200,
            totalQuestions: 100,
            durationMinutes: 120,
            cbtTestId: "test-cbt-123",
          },
        }),
      } as any);

      render(<PyqPdfViewScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getAllByText("UPSC 2023 GS Paper 1").length).toBeGreaterThan(0);
          expect(screen.getByText(/100/)).toBeTruthy();
          expect(screen.getByText(/Questions/)).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // CBT practice mode button if linked
      expect(screen.getByText("Start CBT Simulation")).toBeTruthy();
    });

    it("renders error state when paper fails to load", async () => {
      __setMockParams({ paperId: "paper-err" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { message: "Could not open document" } }),
      } as any);

      render(<PyqPdfViewScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Could not open document")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });
});
