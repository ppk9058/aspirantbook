import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { AppShell } from "../src/components/shell/AppShell";
import { MobileAppHeader } from "../src/components/shell/MobileAppHeader";
import { MobileDrawer } from "../src/components/shell/MobileDrawer";
import { MobileProfileSheet } from "../src/components/shell/MobileProfileSheet";
import { MobileBottomBar, isBottomBarHidden } from "../src/components/shell/MobileBottomBar";
import { GoalModal } from "../src/components/shell/GoalModal";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { GoalProvider, useGoal } from "../src/context/GoalContext";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { Storage } from "../src/lib/storage";
import { api } from "../src/lib/api";

const { __setMockPathname, __mockPush } = require("expo-router");

describe("T2: Critical Screens - Shell & Navigation Mounted Tests", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await Storage.clearAllAuthTokens();
    __setMockPathname("/");
    jest.spyOn(api, "getMe").mockImplementation(async () => {
      const u = await Storage.getUser();
      if (u) {
        return { ok: true, data: { ...u, role: (u as any).role || "STUDENT" } } as any;
      }
      return { ok: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } } as any;
    });
  });

  describe("1. Header (Guest vs Logged-In)", () => {
    it("renders Login CTA button in guest state", async () => {
      render(
        <ThemeProvider>
          <AuthProvider>
            <MobileAppHeader onOpenDrawer={jest.fn()} onOpenProfile={jest.fn()} />
          </AuthProvider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("mobile-header-login-btn")).toBeTruthy();
        expect(screen.getByText("Login")).toBeTruthy();
      });
    });

    it("renders user avatar with initials in logged-in state", async () => {
      await Storage.setAccessToken("test-token");
      const testUser = {
        id: "user-1",
        name: "Praveen Kumar",
        email: "praveen@aspirantbook.com",
      };
      await Storage.setUser(testUser);
      jest.spyOn(api, "getMe").mockResolvedValue({
        ok: true,
        data: { ...testUser, role: "STUDENT" },
      } as any);

      render(
        <ThemeProvider>
          <AuthProvider>
            <MobileAppHeader onOpenDrawer={jest.fn()} onOpenProfile={jest.fn()} />
          </AuthProvider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("mobile-header-avatar")).toBeTruthy();
        expect(screen.getByText("P")).toBeTruthy();
      });
    });
  });

  describe("2. Drawer (Opens, Closes, 10 Nav Items Push Routes)", () => {
    const expectedDrawerRoutes = [
      { testId: "mobile-drawer-dashboard", route: "/" },
      { testId: "mobile-drawer-learning", route: "/my-learning" },
      { testId: "mobile-drawer-books", route: "/library" },
      { testId: "mobile-drawer-test-series", route: "/tests" },
      { testId: "mobile-drawer-my-tests", route: "/my-tests" },
      { testId: "mobile-drawer-courses", route: "/courses" },
      { testId: "mobile-drawer-pyqs", route: "/pyqs" },
      { testId: "mobile-drawer-current-affairs", route: "/current-affairs" },
      { testId: "mobile-drawer-tutorials", route: "/tutorials" },
      { testId: "mobile-drawer-practice", route: "/practice" },
    ];

    it("does not render when closed", () => {
      render(
        <ThemeProvider>
          <GoalProvider>
            <MobileDrawer isOpen={false} onClose={jest.fn()} />
          </GoalProvider>
        </ThemeProvider>
      );
      expect(screen.queryByTestId("mobile-drawer")).toBeNull();
    });

    it("renders and pushes route for each of the 10 drawer items", async () => {
      for (const item of expectedDrawerRoutes) {
        jest.clearAllMocks();
        const onCloseMock = jest.fn();

        const { unmount } = render(
          <ThemeProvider>
            <GoalProvider>
              <MobileDrawer isOpen={true} onClose={onCloseMock} />
            </GoalProvider>
          </ThemeProvider>
        );

        const navBtn = screen.getByTestId(item.testId);
        expect(navBtn).toBeTruthy();
        fireEvent.press(navBtn);

        expect(onCloseMock).toHaveBeenCalled();
        expect(__mockPush).toHaveBeenCalledWith(item.route);

        unmount();
      }
    });

    it("closes drawer when backdrop or close button is pressed", () => {
      const onCloseMock = jest.fn();
      render(
        <ThemeProvider>
          <GoalProvider>
            <MobileDrawer isOpen={true} onClose={onCloseMock} />
          </GoalProvider>
        </ThemeProvider>
      );

      const closeBtn = screen.getByTestId("drawer-close");
      fireEvent.press(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);

      const backdrop = screen.getByTestId("drawer-backdrop");
      fireEvent.press(backdrop);
      expect(onCloseMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("3. Goal Modal", () => {
    it("opens, displays popular goals, and allows selecting a goal", async () => {
      let openFn: any;
      function TestHost() {
        const goal = useGoal();
        openFn = goal.openGoalModal;
        return (
          <>
            <GoalModal />
          </>
        );
      }

      render(
        <ThemeProvider>
          <GoalProvider>
            <TestHost />
          </GoalProvider>
        </ThemeProvider>
      );

      // Initially closed
      expect(screen.queryByTestId("goal-modal")).toBeNull();

      // Open modal
      openFn();

      await waitFor(() => {
        expect(screen.getByTestId("goal-modal")).toBeTruthy();
        expect(screen.getByText("UPSC")).toBeTruthy();
        expect(screen.getByText("BPSC")).toBeTruthy();
        expect(screen.getByText("SSC CGL")).toBeTruthy();
      });

      // Select BPSC goal
      fireEvent.press(screen.getByText("BPSC"));

      // Modal closes after selection
      await waitFor(() => {
        expect(screen.queryByTestId("goal-modal")).toBeNull();
      });
    });
  });

  describe("4. Profile Sheet (Guest vs Logged-In, Links, Logout)", () => {
    it("renders guest state with login prompt when not authenticated", () => {
      render(
        <ThemeProvider>
          <AuthProvider>
            <MobileProfileSheet isOpen={true} onClose={jest.fn()} />
          </AuthProvider>
        </ThemeProvider>
      );

      expect(screen.getByText("You are exploring as a guest learner")).toBeTruthy();
      expect(screen.getByTestId("profile-sheet-login-btn")).toBeTruthy();
    });

    it("renders user information, pass status, and each link navigates correctly", async () => {
      await Storage.setAccessToken("test-token");
      await Storage.setUser({
        id: "user-42",
        name: "Test Aspirant",
        email: "test@aspirantbook.com",
        hasActivePass: true,
      });

      const links = [
        { testId: "profile-sheet-link-profile", route: "/profile" },
        { testId: "profile-sheet-link-subscription", route: "/subscription" },
        { testId: "profile-sheet-link-settings", route: "/settings" },
      ];

      for (const link of links) {
        jest.clearAllMocks();
        const onCloseMock = jest.fn();

        const { unmount } = render(
          <ThemeProvider>
            <AuthProvider>
              <MobileProfileSheet isOpen={true} onClose={onCloseMock} />
            </AuthProvider>
          </ThemeProvider>
        );

        await waitFor(() => {
          expect(screen.getByText("Test Aspirant")).toBeTruthy();
          expect(screen.getByText("test@aspirantbook.com")).toBeTruthy();
          expect(screen.getByText("Pass Active (Pro Access)")).toBeTruthy();
        });

        const linkBtn = screen.getByTestId(link.testId);
        fireEvent.press(linkBtn);

        expect(onCloseMock).toHaveBeenCalled();
        expect(__mockPush).toHaveBeenCalledWith(link.route);

        unmount();
      }
    });

    it("logout calls API client and clears tokens from storage", async () => {
      await Storage.setAccessToken("token-to-clear");
      await Storage.setRefreshToken("refresh-token-to-clear");
      await Storage.setUser({
        id: "user-42",
        name: "Logout User",
        email: "logout@aspirantbook.com",
      });

      const logoutApiSpy = jest.spyOn(api, "logout").mockResolvedValue({ ok: true } as any);
      const onCloseMock = jest.fn();

      render(
        <ThemeProvider>
          <AuthProvider>
            <MobileProfileSheet isOpen={true} onClose={onCloseMock} />
          </AuthProvider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("profile-sheet-logout")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("profile-sheet-logout"));

      await waitFor(async () => {
        expect(logoutApiSpy).toHaveBeenCalled();
        const token = await Storage.getAccessToken();
        expect(token).toBeNull();
      });

      logoutApiSpy.mockRestore();
    });
  });

  describe("5. Bottom Bar (4 Tabs, Active States, Route Invariants)", () => {
    it("renders 4 tabs: Home, Tests, Courses, Pass", () => {
      __setMockPathname("/(tabs)/home");

      render(
        <ThemeProvider>
          <AuthProvider>
            <MobileBottomBar />
          </AuthProvider>
        </ThemeProvider>
      );

      expect(screen.getByTestId("mobile-bottom-tab-home")).toBeTruthy();
      expect(screen.getByTestId("mobile-bottom-tab-tests")).toBeTruthy();
      expect(screen.getByTestId("mobile-bottom-tab-courses")).toBeTruthy();
      expect(screen.getByTestId("mobile-bottom-tab-pass")).toBeTruthy();
    });

    it("highlights correct active tab based on route pathname", () => {
      // Home tab
      __setMockPathname("/(tabs)/home");
      const { rerender } = render(
        <ThemeProvider>
          <AuthProvider>
            <MobileBottomBar />
          </AuthProvider>
        </ThemeProvider>
      );
      expect(
        screen.getByTestId("mobile-bottom-tab-home").props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId("mobile-bottom-tab-tests").props.accessibilityState.selected
      ).toBe(false);

      // Tests tab
      __setMockPathname("/tests/series/upsc-2026");
      rerender(
        <ThemeProvider>
          <AuthProvider>
            <MobileBottomBar />
          </AuthProvider>
        </ThemeProvider>
      );
      expect(
        screen.getByTestId("mobile-bottom-tab-tests").props.accessibilityState.selected
      ).toBe(true);

      // Courses tab
      __setMockPathname("/courses/gs-foundation");
      rerender(
        <ThemeProvider>
          <AuthProvider>
            <MobileBottomBar />
          </AuthProvider>
        </ThemeProvider>
      );
      expect(
        screen.getByTestId("mobile-bottom-tab-courses").props.accessibilityState.selected
      ).toBe(true);

      // Pass tab
      __setMockPathname("/subscription");
      rerender(
        <ThemeProvider>
          <AuthProvider>
            <MobileBottomBar />
          </AuthProvider>
        </ThemeProvider>
      );
      expect(
        screen.getByTestId("mobile-bottom-tab-pass").props.accessibilityState.selected
      ).toBe(true);
    });

    it("hides bottom bar on attempt and runner routes", () => {
      expect(isBottomBarHidden("/tests/123/runner")).toBe(true);
      expect(isBottomBarHidden("/tests/123/attempt/456")).toBe(true);
      expect(isBottomBarHidden("/test-execution/abc")).toBe(true);

      __setMockPathname("/tests/123/runner");
      const { toJSON } = render(
        <ThemeProvider>
          <AuthProvider>
            <MobileBottomBar />
          </AuthProvider>
        </ThemeProvider>
      );
      expect(toJSON()).toBeNull();
    });

    it("hides bottom bar on lesson and learn routes", () => {
      expect(isBottomBarHidden("/courses/123/lesson/456")).toBe(true);
      expect(isBottomBarHidden("/courses/123/learn/video")).toBe(true);
      expect(isBottomBarHidden("/courses/123/lesson")).toBe(true);

      __setMockPathname("/courses/123/lesson/456");
      const { toJSON } = render(
        <ThemeProvider>
          <AuthProvider>
            <MobileBottomBar />
          </AuthProvider>
        </ThemeProvider>
      );
      expect(toJSON()).toBeNull();
    });
  });
});
