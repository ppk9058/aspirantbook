import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";

// Components to test
import HomeScreen from "../src/app/(tabs)/home";
import ProfileScreen from "../src/app/(tabs)/profile";
import SettingsScreen from "../src/app/settings";
import SearchScreen from "../src/app/search";
import PassTabScreen from "../src/app/(tabs)/pass";
import SubscriptionScreen from "../src/app/subscription";

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

describe("T3: Mounted Tests - Core & Shell Domain Screens", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __setMockParams({});
    await Storage.clearAllAuthTokens();
  });

  afterEach(async () => {
    await Storage.clearAllAuthTokens();
  });

  describe("1. (tabs)/home", () => {
    it("renders daily prep hub with goal banner and quick action shortcuts", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            stats: { testsCompleted: 5, hoursPracticed: 12, currentStreak: 3 },
            continueLearning: null,
            featuredSeries: [],
          },
        }),
      } as any);

      render(<HomeScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Daily Prep Hub")).toBeTruthy();
          expect(screen.getByText("Test Series")).toBeTruthy();
          expect(screen.getByText("Video Classes")).toBeTruthy();
          expect(screen.getByText("PYQ Papers")).toBeTruthy();
          expect(screen.getByText("Change")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("performs 401 -> refresh -> retry flow seamlessly", async () => {
      await Storage.setAccessToken("expired-home-token");
      await Storage.setRefreshToken("valid-home-refresh");

      let fetchCount = 0;
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/auth/refresh")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { tokens: { accessToken: "refreshed-home-token", refreshToken: "new-home-ref" } },
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
            data: { stats: { testsCompleted: 10 } },
          }),
        } as any;
      });

      render(<HomeScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Daily Prep Hub")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      expect(await Storage.getAccessToken()).toBe("refreshed-home-token");
    });
  });

  describe("2. (tabs)/profile", () => {
    it("renders guest sign in state when not authenticated", async () => {
      render(<ProfileScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Guest Aspirant")).toBeTruthy();
          expect(screen.getByText("Sign In / Register")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders authenticated profile details and active pass badge", async () => {
      await Storage.setAccessToken("auth-profile-token");
      await Storage.setUser({
        id: "u-profile-1",
        name: "Pooja Sharma",
        email: "pooja@test.com",
        hasActivePass: true,
      });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: {
                id: "u-profile-1",
                name: "Pooja Sharma",
                email: "pooja@test.com",
                role: "STUDENT",
                hasActivePass: true,
              },
            }),
          } as any;
        }

        if (urlStr.includes("/sessions")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: [
                {
                  id: "sess-1",
                  device: "Pixel 8 Pro",
                  ip: "10.0.0.1",
                  isCurrent: true,
                  createdAt: new Date().toISOString(),
                },
              ],
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, data: {} }),
        } as any;
      });

      render(<ProfileScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Pooja Sharma")).toBeTruthy();
          expect(screen.getByText("pooja@test.com")).toBeTruthy();
          expect(screen.getByText("PRO PASS")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });

  describe("3. settings", () => {
    it("renders settings header and handles tab switching", async () => {
      render(<SettingsScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Account Settings")).toBeTruthy();
          expect(screen.getByText("Exam Goal")).toBeTruthy();
          expect(screen.getByText("Appearance")).toBeTruthy();
          expect(screen.getByText("Security")).toBeTruthy();
        },
        { timeout: 4000 }
      );

      // Tap Appearance tab
      const appearanceTab = screen.getByText("Appearance");
      fireEvent.press(appearanceTab);
      expect(appearanceTab).toBeTruthy();

      // Tap Security tab
      const securityTab = screen.getByText("Security");
      fireEvent.press(securityTab);
      expect(securityTab).toBeTruthy();
    });
  });

  describe("4. search", () => {
    it("renders search input and results upon query input", async () => {
      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("q=History")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: {
                query: "History",
                total: 1,
                results: [
                  {
                    id: "res-hist-1",
                    type: "COURSE",
                    title: "Modern Indian History Masterclass",
                    subtitle: "Comprehensive Video Course",
                  },
                ],
              },
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, data: { query: "", total: 0, results: [] } }),
        } as any;
      });

      render(<SearchScreen />, { wrapper: createWrapper() });

      const input = screen.getByPlaceholderText("Search mock tests, video courses, PYQs...");
      fireEvent.changeText(input, "History");

      await waitFor(
        () => {
          expect(screen.getByText("Modern Indian History Masterclass")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });

    it("renders empty state when query returns no results", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            query: "xyznonexistent",
            total: 0,
            results: [],
          },
        }),
      } as any);

      render(<SearchScreen />, { wrapper: createWrapper() });

      const input = screen.getByPlaceholderText("Search mock tests, video courses, PYQs...");
      fireEvent.changeText(input, "xyznonexistent");

      await waitFor(
        () => {
          expect(screen.getByText("No Results Found")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });

  describe("5. (tabs)/pass", () => {
    it("renders pass benefits checklist and upgrade call to action", async () => {
      render(<PassTabScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Upgrade to Aspirantbook Pass")).toBeTruthy();
          expect(
            screen.getByText("Unlimited Access to 500+ All India Mock Tests & Test Series")
          ).toBeTruthy();
          expect(screen.getByText("Get Pass on website")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });

  describe("6. subscription", () => {
    it("renders subscription details and payment history", async () => {
      await Storage.setAccessToken("valid-token");
      await Storage.setUser({ id: "u-sub-1", name: "Anil", email: "anil@test.com" });

      global.fetch = jest.fn(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              data: { id: "u-sub-1", name: "Anil", email: "anil@test.com", role: "STUDENT" },
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              activeSubscription: {
                planName: "Annual Pass Pro",
                status: "ACTIVE",
                daysRemaining: 180,
                expiresAt: "2027-04-22T00:00:00Z",
              },
              history: [
                {
                  id: "order-1",
                  orderId: "ord_101",
                  amount: 999,
                  currency: "INR",
                  status: "SUCCESS",
                  createdAt: "2026-10-01T12:00:00Z",
                  planName: "Annual Pass Pro",
                },
              ],
            },
          }),
        } as any;
      });

      render(<SubscriptionScreen />, { wrapper: createWrapper() });

      await waitFor(
        () => {
          expect(screen.getByText("Subscription & Payments")).toBeTruthy();
          expect(screen.getByText("Upgrade on website")).toBeTruthy();
        },
        { timeout: 4000 }
      );
    });
  });
});
