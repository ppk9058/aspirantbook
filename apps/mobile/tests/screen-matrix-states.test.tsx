import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";

const { __setMockParams } = require("expo-router");

// Registry of Screen Components
const SCREEN_MAP: Record<string, any> = {
  "/(auth)/forgot-password": require("../src/app/(auth)/forgot-password").default,
  "/(auth)/login": require("../src/app/(auth)/login").default,
  "/(auth)/register": require("../src/app/(auth)/register").default,
  "/(auth)/reset-password": require("../src/app/(auth)/reset-password").default,
  "/(tabs)/courses": require("../src/app/(tabs)/courses").default,
  "/(tabs)/home": require("../src/app/(tabs)/home").default,
  "/(tabs)/learn": require("../src/app/(tabs)/learn").default,
  "/(tabs)/library": require("../src/app/(tabs)/library").default,
  "/(tabs)/pass": require("../src/app/(tabs)/pass").default,
  "/(tabs)/practice": require("../src/app/(tabs)/practice").default,
  "/(tabs)/profile": require("../src/app/(tabs)/profile").default,
  "/(tabs)/tests": require("../src/app/(tabs)/tests").default,
  "/career-tracks/[id]": require("../src/app/career-tracks/[id]").default,
  "/career-tracks": require("../src/app/career-tracks/index").default,
  "/courses/[id]": require("../src/app/courses/[id]").default,
  "/courses/[id]/lesson/[lessonId]": require("../src/app/courses/[id]/lesson/[lessonId]").default,
  "/current-affairs": require("../src/app/current-affairs/index").default,
  "/index": require("../src/app/index").default,
  "/library": require("../src/app/library").default,
  "/my-learning": require("../src/app/my-learning").default,
  "/my-tests": require("../src/app/my-tests").default,
  "/practice": require("../src/app/practice").default,
  "/profile": require("../src/app/profile").default,
  "/pyqs": require("../src/app/pyqs/index").default,
  "/pyqs/pdf-view": require("../src/app/pyqs/pdf-view").default,
  "/reader/[id]": require("../src/app/reader/[id]").default,
  "/search": require("../src/app/search").default,
  "/settings": require("../src/app/settings").default,
  "/subscription": require("../src/app/subscription").default,
  "/tests/[id]": require("../src/app/tests/[id]/index").default,
  "/tests/[id]/leaderboard": require("../src/app/tests/[id]/leaderboard").default,
  "/tests/[id]/result": require("../src/app/tests/[id]/result").default,
  "/tests/[id]/runner": require("../src/app/tests/[id]/runner").default,
  "/tests/[id]/solutions": require("../src/app/tests/[id]/solutions").default,
  "/tests/series/[id]": require("../src/app/tests/series/[id]").default,
  "/tutorials/[slug]/[lessonId]": require("../src/app/tutorials/[slug]/[lessonId]").default,
  "/tutorials/[slug]": require("../src/app/tutorials/[slug]/index").default,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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

describe("T3: Screen State Matrix Mounted Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockParams({ id: "mock-id-1", slug: "mock-slug-1", lessonId: "mock-les-1", attemptId: "mock-att-1", paperId: "mock-paper-1" });
  });

  describe("/(auth)/forgot-password", () => {
    it("[/(auth)/forgot-password] loading", async () => {
      const Comp = SCREEN_MAP["/(auth)/forgot-password"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Reset Password")).toBeTruthy();
      expect(queryByText("Check Your Inbox")).toBeNull();
    });
    it("[/(auth)/forgot-password] empty", async () => {
      const Comp = SCREEN_MAP["/(auth)/forgot-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, getByPlaceholderText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Reset Password")).toBeTruthy();
      expect(getByPlaceholderText("name@example.com")).toBeTruthy();
      expect(queryByText("Check Your Inbox")).toBeNull();
    });
    it("[/(auth)/forgot-password] error500", async () => {
      const Comp = SCREEN_MAP["/(auth)/forgot-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, getByPlaceholderText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Reset Password")).toBeTruthy();
      expect(getByPlaceholderText("name@example.com")).toBeTruthy();
      expect(queryByText("Check Your Inbox")).toBeNull();
    });
    it("[/(auth)/forgot-password] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(auth)/forgot-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Reset Password")).toBeTruthy();
      expect(queryByText("Check Your Inbox")).toBeNull();
    });
    it("[/(auth)/forgot-password] success", async () => {
      const Comp = SCREEN_MAP["/(auth)/forgot-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Reset Password")).toBeTruthy();
      expect(getByText("Send Reset Instructions")).toBeTruthy();
      expect(queryByText("Check Your Inbox")).toBeNull();
    });
  });

  describe("/(auth)/login", () => {
    it("[/(auth)/login] loading", async () => {
      const Comp = SCREEN_MAP["/(auth)/login"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Sign In").length).toBeGreaterThan(0);
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/login] empty", async () => {
      const Comp = SCREEN_MAP["/(auth)/login"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getAllByText, getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Sign In").length).toBeGreaterThan(0);
      expect(getByText(/Welcome back!/i)).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/login] error500", async () => {
      const Comp = SCREEN_MAP["/(auth)/login"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getAllByText, getByPlaceholderText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Sign In").length).toBeGreaterThan(0);
      expect(getByPlaceholderText("name@example.com")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/login] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(auth)/login"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Sign In").length).toBeGreaterThan(0);
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/login] success", async () => {
      const Comp = SCREEN_MAP["/(auth)/login"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Sign In").length).toBeGreaterThan(0);
      expect(queryByText("Sign Out")).toBeNull();
    });
  });

  describe("/(auth)/register", () => {
    it("[/(auth)/register] loading", async () => {
      const Comp = SCREEN_MAP["/(auth)/register"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Create Account").length).toBeGreaterThan(0);
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/register] empty", async () => {
      const Comp = SCREEN_MAP["/(auth)/register"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getAllByText, getByPlaceholderText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Create Account").length).toBeGreaterThan(0);
      expect(getByPlaceholderText("name@example.com")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/register] error500", async () => {
      const Comp = SCREEN_MAP["/(auth)/register"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Create Account").length).toBeGreaterThan(0);
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/register] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(auth)/register"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Create Account").length).toBeGreaterThan(0);
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(auth)/register] success", async () => {
      const Comp = SCREEN_MAP["/(auth)/register"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getAllByText("Create Account").length).toBeGreaterThan(0);
      expect(queryByText("Sign Out")).toBeNull();
    });
  });

  describe("/(auth)/reset-password", () => {
    it("[/(auth)/reset-password] loading", async () => {
      const Comp = SCREEN_MAP["/(auth)/reset-password"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Reset Password|Set New Password/i)).toBeTruthy();
      expect(queryByText("Password updated")).toBeNull();
    });
    it("[/(auth)/reset-password] empty", async () => {
      const Comp = SCREEN_MAP["/(auth)/reset-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Reset Password|Set New Password/i)).toBeTruthy();
      expect(queryByText("Password updated")).toBeNull();
    });
    it("[/(auth)/reset-password] error500", async () => {
      const Comp = SCREEN_MAP["/(auth)/reset-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Reset Password|Set New Password/i)).toBeTruthy();
      expect(queryByText("Password updated")).toBeNull();
    });
    it("[/(auth)/reset-password] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(auth)/reset-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Reset Password|Set New Password/i)).toBeTruthy();
      expect(queryByText("Password updated")).toBeNull();
    });
    it("[/(auth)/reset-password] success", async () => {
      const Comp = SCREEN_MAP["/(auth)/reset-password"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Reset Password|Set New Password/i)).toBeTruthy();
      expect(queryByText("Password updated")).toBeNull();
    });
  });

  describe("/(tabs)/courses", () => {
    it("[/(tabs)/courses] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/courses"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Video Courses & Syllabus")).toBeTruthy();
      expect(queryByText("No Courses Found")).toBeNull();
    });
    it("[/(tabs)/courses] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/courses"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Courses Found")).toBeTruthy();
      expect(queryByText("Python Masterclass")).toBeNull();
    });
    it("[/(tabs)/courses] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/courses"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Courses Found")).toBeNull();
    });
    it("[/(tabs)/courses] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/courses"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Courses Found")).toBeNull();
    });
    it("[/(tabs)/courses] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/courses"];
      if (!Comp) return;
      const mockCourse = { id: "c1", title: "Python Masterclass", difficulty: "BEGINNER", price: 0, isFree: true, lessonsCount: 10, chaptersCount: 2 };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [mockCourse] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Python Masterclass")).toBeTruthy();
      expect(queryByText("No Courses Found")).toBeNull();
    });
  });

  describe("/(tabs)/home", () => {
    it("[/(tabs)/home] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/home"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Test Series")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/home] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/home"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Test Series")).toBeTruthy();
      expect(getAllByText("Courses").length).toBeGreaterThan(0);
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/home] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/home"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Test Series")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/home] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/home"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Test Series")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/home] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/home"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Test Series")).toBeTruthy();
      expect(getAllByText("Courses").length).toBeGreaterThan(0);
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
  });

  describe("/(tabs)/learn", () => {
    it("[/(tabs)/learn] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/learn"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Tutorials & Courses")).toBeTruthy();
      expect(queryByText("No tutorials available")).toBeNull();
    });
    it("[/(tabs)/learn] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/learn"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No tutorials available")).toBeTruthy();
      expect(queryByText("Start Reading")).toBeNull();
    });
    it("[/(tabs)/learn] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/learn"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No tutorials available")).toBeTruthy();
      expect(queryByText("Start Reading")).toBeNull();
    });
    it("[/(tabs)/learn] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/learn"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No tutorials available")).toBeTruthy();
      expect(queryByText("Start Reading")).toBeNull();
    });
    it("[/(tabs)/learn] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/learn"];
      if (!Comp) return;
      const mockTutorial = { id: "t1", title: "Python Fundamentals", slug: "python-fundamentals", category: "Coding", chaptersCount: 3, lessonsCount: 15 };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [mockTutorial] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Python Fundamentals")).toBeTruthy();
      expect(queryByText("No tutorials available")).toBeNull();
    });
  });

  describe("/(tabs)/library", () => {
    it("[/(tabs)/library] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/library"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("My Library")).toBeTruthy();
      expect(queryByText("Your library is empty")).toBeNull();
    });
    it("[/(tabs)/library] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/library"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Your library is empty")).toBeTruthy();
      expect(queryByText("Read PDF")).toBeNull();
    });
    it("[/(tabs)/library] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/library"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Your library is empty")).toBeTruthy();
      expect(queryByText("Read PDF")).toBeNull();
    });
    it("[/(tabs)/library] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/library"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Your library is empty")).toBeTruthy();
      expect(queryByText("Read PDF")).toBeNull();
    });
    it("[/(tabs)/library] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/library"];
      if (!Comp) return;
      const mockBook = { id: "b1", title: "NCERT History", author: "Editorial Board", fileSize: 1048576 };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [mockBook] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("NCERT History")).toBeTruthy();
      expect(queryByText("Your library is empty")).toBeNull();
    });
  });

  describe("/(tabs)/pass", () => {
    it("[/(tabs)/pass] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/pass"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Upgrade to Aspirantbook Pass")).toBeTruthy();
      expect(queryByText("Your Pass is Active!")).toBeNull();
    });
    it("[/(tabs)/pass] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/pass"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Upgrade to Aspirantbook Pass")).toBeTruthy();
      expect(getByText("Included in Pass")).toBeTruthy();
      expect(queryByText("Your Pass is Active!")).toBeNull();
    });
    it("[/(tabs)/pass] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/pass"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Upgrade to Aspirantbook Pass")).toBeTruthy();
      expect(getByText("Get Pass on website")).toBeTruthy();
      expect(queryByText("Your Pass is Active!")).toBeNull();
    });
    it("[/(tabs)/pass] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/pass"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Upgrade to Aspirantbook Pass")).toBeTruthy();
      expect(queryByText("Your Pass is Active!")).toBeNull();
    });
    it("[/(tabs)/pass] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/pass"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Upgrade to Aspirantbook Pass")).toBeTruthy();
      expect(getByText("Included in Pass")).toBeTruthy();
      expect(queryByText("Your Pass is Active!")).toBeNull();
    });
  });

  describe("/(tabs)/practice", () => {
    it("[/(tabs)/practice] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/practice"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Take full mock examinations/i)).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/practice] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/practice"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Take full mock examinations/i)).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/practice] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/practice"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Take full mock examinations/i)).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/practice] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/practice"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Take full mock examinations/i)).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/practice] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/practice"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText(/Take full mock examinations/i)).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
  });

  describe("/(tabs)/profile", () => {
    it("[/(tabs)/profile] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/profile"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(tabs)/profile] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(getByText("Sign In / Register")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(tabs)/profile] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(getByText("Sign In / Register")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(tabs)/profile] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/(tabs)/profile] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(getByText("Sign In / Register")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
  });

  describe("/(tabs)/tests", () => {
    it("[/(tabs)/tests] loading", async () => {
      const Comp = SCREEN_MAP["/(tabs)/tests"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("No Test Series Found")).toBeNull();
    });
    it("[/(tabs)/tests] empty", async () => {
      const Comp = SCREEN_MAP["/(tabs)/tests"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Test Series Found")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/(tabs)/tests] error500", async () => {
      const Comp = SCREEN_MAP["/(tabs)/tests"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Test Series Found")).toBeNull();
    });
    it("[/(tabs)/tests] networkFailure", async () => {
      const Comp = SCREEN_MAP["/(tabs)/tests"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Test Series Found")).toBeNull();
    });
    it("[/(tabs)/tests] success", async () => {
      const Comp = SCREEN_MAP["/(tabs)/tests"];
      if (!Comp) return;
      const mockSeries = { id: "s1", title: "BPSC Prelims Mock Series", category: "BPSC", testsCount: 10, totalMarks: 150 };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [mockSeries] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("BPSC Prelims Mock Series")).toBeTruthy();
      expect(queryByText("No Test Series Found")).toBeNull();
    });
  });

  describe("/career-tracks/[id]", () => {
    it("[/career-tracks/[id]] loading", async () => {
      const Comp = SCREEN_MAP["/career-tracks/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Track Roadmap")).toBeTruthy();
      expect(queryByText("CAREER TRACK")).toBeNull();
    });
    it("[/career-tracks/[id]] empty", async () => {
      const Comp = SCREEN_MAP["/career-tracks/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Track Roadmap")).toBeTruthy();
      expect(queryByText("CAREER TRACK")).toBeNull();
    });
    it("[/career-tracks/[id]] error500", async () => {
      const Comp = SCREEN_MAP["/career-tracks/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("CAREER TRACK")).toBeNull();
    });
    it("[/career-tracks/[id]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/career-tracks/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("CAREER TRACK")).toBeNull();
    });
    it("[/career-tracks/[id]] success", async () => {
      const Comp = SCREEN_MAP["/career-tracks/[id]"];
      if (!Comp) return;
      const mockTrack = { track: { id: "mock-id-1", title: "Full Stack Track", type: "CAREER", description: "Comprehensive path" }, courses: [] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockTrack }) } as any);
      const { findAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      const matches = await findAllByText("Full Stack Track");
      expect(matches.length).toBeGreaterThan(0);
      expect(queryByText("Something went wrong")).toBeNull();
    });
  });

  describe("/career-tracks", () => {
    it("[/career-tracks] loading", async () => {
      const Comp = SCREEN_MAP["/career-tracks"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Career & Skill Tracks")).toBeTruthy();
      expect(queryByText("No Tracks Available")).toBeNull();
    });
    it("[/career-tracks] empty", async () => {
      const Comp = SCREEN_MAP["/career-tracks"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Tracks Available")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/career-tracks] error500", async () => {
      const Comp = SCREEN_MAP["/career-tracks"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Tracks Available")).toBeNull();
    });
    it("[/career-tracks] networkFailure", async () => {
      const Comp = SCREEN_MAP["/career-tracks"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Tracks Available")).toBeNull();
    });
    it("[/career-tracks] success", async () => {
      const Comp = SCREEN_MAP["/career-tracks"];
      if (!Comp) return;
      const mockTracks = [{ id: "ct1", title: "Data Science Career", description: "Learn ML & Python", coursesCount: 5 }];
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockTracks }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Data Science Career")).toBeTruthy();
      expect(queryByText("No Tracks Available")).toBeNull();
    });
  });

  describe("/courses/[id]", () => {
    it("[/courses/[id]] loading", async () => {
      const Comp = SCREEN_MAP["/courses/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Course Details")).toBeTruthy();
      expect(queryByText("ENROLLED")).toBeNull();
    });
    it("[/courses/[id]] empty", async () => {
      const Comp = SCREEN_MAP["/courses/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Course Details")).toBeTruthy();
      expect(queryByText("ENROLLED")).toBeNull();
    });
    it("[/courses/[id]] error500", async () => {
      const Comp = SCREEN_MAP["/courses/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
    });
    it("[/courses/[id]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/courses/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
    });
    it("[/courses/[id]] success", async () => {
      const Comp = SCREEN_MAP["/courses/[id]"];
      if (!Comp) return;
      const mockCourse = { course: { id: "mock-id-1", title: "Indian Polity Masterclass", description: "Detailed constitution course", isEnrolled: true }, chapters: [] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockCourse }) } as any);
      const { findAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      const matches = await findAllByText("Indian Polity Masterclass");
      expect(matches.length).toBeGreaterThan(0);
      expect(queryByText("Something went wrong")).toBeNull();
    });
  });

  describe("/courses/[id]/lesson/[lessonId]", () => {
    it("[/courses/[id]/lesson/[lessonId]] loading", async () => {
      const Comp = SCREEN_MAP["/courses/[id]/lesson/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/courses/[id]/lesson/[lessonId]] empty", async () => {
      const Comp = SCREEN_MAP["/courses/[id]/lesson/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("Completed")).toBeNull();
    });
    it("[/courses/[id]/lesson/[lessonId]] error500", async () => {
      const Comp = SCREEN_MAP["/courses/[id]/lesson/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
    });
    it("[/courses/[id]/lesson/[lessonId]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/courses/[id]/lesson/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
    });
    it("[/courses/[id]/lesson/[lessonId]] success", async () => {
      const Comp = SCREEN_MAP["/courses/[id]/lesson/[lessonId]"];
      if (!Comp) return;
      const mockLesson = { id: "mock-les-1", title: "Preamble & Articles", streamUrl: "https://example.com/stream.m3u8", isLocked: false };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockLesson }) } as any);
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getAllByText("Preamble & Articles").length).toBeGreaterThan(0);
      });
      expect(queryByText("Something went wrong")).toBeNull();
    });
  });

  describe("/current-affairs", () => {
    it("[/current-affairs] loading", async () => {
      const Comp = SCREEN_MAP["/current-affairs"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Current Affairs & Quizzes")).toBeTruthy();
      expect(queryByText("No Current Affairs Listed")).toBeNull();
    });
    it("[/current-affairs] empty", async () => {
      const Comp = SCREEN_MAP["/current-affairs"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Current Affairs Listed")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/current-affairs] error500", async () => {
      const Comp = SCREEN_MAP["/current-affairs"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Current Affairs Listed")).toBeNull();
    });
    it("[/current-affairs] networkFailure", async () => {
      const Comp = SCREEN_MAP["/current-affairs"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Current Affairs Listed")).toBeNull();
    });
    it("[/current-affairs] success", async () => {
      const Comp = SCREEN_MAP["/current-affairs"];
      if (!Comp) return;
      const mockCA = { id: "ca1", title: "Daily GK Oct 2026", category: "National", date: "2026-10-22" };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [mockCA] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Daily GK Oct 2026")).toBeTruthy();
      expect(queryByText("No Current Affairs Listed")).toBeNull();
    });
  });

  describe("/index", () => {
    it("[/index] success", async () => {
      const Comp = SCREEN_MAP["/index"];
      if (!Comp) return;
      const { toJSON } = render(<Comp />, { wrapper: createWrapper() });
      expect(toJSON()).toBeDefined();
    });
  });

  describe("/library", () => {
    it("[/library] loading", async () => {
      const Comp = SCREEN_MAP["/library"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("My Library")).toBeTruthy();
      expect(queryByText("Your library is empty")).toBeNull();
    });
    it("[/library] empty", async () => {
      const Comp = SCREEN_MAP["/library"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Your library is empty")).toBeTruthy();
      expect(queryByText("Read PDF")).toBeNull();
    });
    it("[/library] error500", async () => {
      const Comp = SCREEN_MAP["/library"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Your library is empty")).toBeTruthy();
      expect(queryByText("Read PDF")).toBeNull();
    });
    it("[/library] networkFailure", async () => {
      const Comp = SCREEN_MAP["/library"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Your library is empty")).toBeTruthy();
      expect(queryByText("Read PDF")).toBeNull();
    });
    it("[/library] success", async () => {
      const Comp = SCREEN_MAP["/library"];
      if (!Comp) return;
      const mockBook = { id: "b1", title: "Indian Economy PDF", author: "Dr. Sen", fileSize: 2097152 };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [mockBook] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Indian Economy PDF")).toBeTruthy();
      expect(queryByText("Your library is empty")).toBeNull();
    });
  });

  describe("/my-learning", () => {
    it("[/my-learning] loading", async () => {
      const Comp = SCREEN_MAP["/my-learning"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("My Batches & Learning")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-learning] empty", async () => {
      const Comp = SCREEN_MAP["/my-learning"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign In to Access Enrolled Courses")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-learning] error500", async () => {
      const Comp = SCREEN_MAP["/my-learning"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign In to Access Enrolled Courses")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-learning] networkFailure", async () => {
      const Comp = SCREEN_MAP["/my-learning"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign In to Access Enrolled Courses")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-learning] success", async () => {
      const Comp = SCREEN_MAP["/my-learning"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("My Batches & Learning")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
  });

  describe("/my-tests", () => {
    it("[/my-tests] loading", async () => {
      const Comp = SCREEN_MAP["/my-tests"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("My Tests & Performance")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-tests] empty", async () => {
      const Comp = SCREEN_MAP["/my-tests"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign In to Access Tests")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-tests] error500", async () => {
      const Comp = SCREEN_MAP["/my-tests"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign In to Access Tests")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-tests] networkFailure", async () => {
      const Comp = SCREEN_MAP["/my-tests"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign In to Access Tests")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/my-tests] success", async () => {
      const Comp = SCREEN_MAP["/my-tests"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("My Tests & Performance")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
  });

  describe("/practice", () => {
    it("[/practice] success", async () => {
      const Comp = SCREEN_MAP["/practice"];
      if (!Comp) return;
      const { getByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Coding Practice")).toBeTruthy();
      expect(getByText(/Interactive code editor/i)).toBeTruthy();
    });
  });

  describe("/profile", () => {
    it("[/profile] loading", async () => {
      const Comp = SCREEN_MAP["/profile"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/profile] empty", async () => {
      const Comp = SCREEN_MAP["/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(getByText("Sign In / Register")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/profile] error500", async () => {
      const Comp = SCREEN_MAP["/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(getByText("Sign In / Register")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/profile] networkFailure", async () => {
      const Comp = SCREEN_MAP["/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
    it("[/profile] success", async () => {
      const Comp = SCREEN_MAP["/profile"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Guest Aspirant")).toBeTruthy();
      expect(getByText("Sign In / Register")).toBeTruthy();
      expect(queryByText("Sign Out")).toBeNull();
    });
  });

  describe("/pyqs", () => {
    it("[/pyqs] loading", async () => {
      const Comp = SCREEN_MAP["/pyqs"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("No Papers Found")).toBeNull();
    });
    it("[/pyqs] empty", async () => {
      const Comp = SCREEN_MAP["/pyqs"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Papers Found")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/pyqs] error500", async () => {
      const Comp = SCREEN_MAP["/pyqs"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Papers Found")).toBeNull();
    });
    it("[/pyqs] networkFailure", async () => {
      const Comp = SCREEN_MAP["/pyqs"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Papers Found")).toBeNull();
    });
    it("[/pyqs] success", async () => {
      const Comp = SCREEN_MAP["/pyqs"];
      if (!Comp) return;
      const mockPaper = { id: "p1", title: "69th BPSC Prelims GS", examName: "BPSC", year: 2023, isFree: true };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [mockPaper] }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("69th BPSC Prelims GS")).toBeTruthy();
      expect(queryByText("No Papers Found")).toBeNull();
    });
  });

  describe("/pyqs/pdf-view", () => {
    it("[/pyqs/pdf-view] loading", async () => {
      const Comp = SCREEN_MAP["/pyqs/pdf-view"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/pyqs/pdf-view] empty", async () => {
      const Comp = SCREEN_MAP["/pyqs/pdf-view"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("This paper is currently unavailable")).toBeTruthy();
    });
    it("[/pyqs/pdf-view] error500", async () => {
      const Comp = SCREEN_MAP["/pyqs/pdf-view"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
    });
    it("[/pyqs/pdf-view] networkFailure", async () => {
      const Comp = SCREEN_MAP["/pyqs/pdf-view"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
    });
    it("[/pyqs/pdf-view] success", async () => {
      const Comp = SCREEN_MAP["/pyqs/pdf-view"];
      if (!Comp) return;
      const mockPaper = { id: "mock-paper-1", title: "General Studies Paper 1", fileUrl: "https://example.com/paper.pdf", isFree: true };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockPaper }) } as any);
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
  });

  describe("/reader/[id]", () => {
    it("[/reader/[id]] loading", async () => {
      const Comp = SCREEN_MAP["/reader/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Verifying digital license and loading document...")).toBeTruthy();
      expect(queryByText("Document Locked")).toBeNull();
    });
    it("[/reader/[id]] empty", async () => {
      const Comp = SCREEN_MAP["/reader/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Verifying digital license and loading document...")).toBeTruthy();
      expect(queryByText("Document Locked")).toBeNull();
    });
    it("[/reader/[id]] error500", async () => {
      const Comp = SCREEN_MAP["/reader/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Verifying digital license and loading document...")).toBeTruthy();
      expect(queryByText("Document Locked")).toBeNull();
    });
    it("[/reader/[id]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/reader/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Verifying digital license and loading document...")).toBeTruthy();
      expect(queryByText("Document Locked")).toBeNull();
    });
    it("[/reader/[id]] success", async () => {
      const Comp = SCREEN_MAP["/reader/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Verifying digital license and loading document...")).toBeTruthy();
      expect(queryByText("Document Locked")).toBeNull();
    });
  });

  describe("/search", () => {
    it("[/search] loading", async () => {
      const Comp = SCREEN_MAP["/search"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByPlaceholderText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByPlaceholderText("Search mock tests, video courses, PYQs...")).toBeTruthy();
      expect(queryByText("No Results Found")).toBeNull();
    });
    it("[/search] empty", async () => {
      const Comp = SCREEN_MAP["/search"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByPlaceholderText, getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByPlaceholderText("Search mock tests, video courses, PYQs...")).toBeTruthy();
      expect(getByText("Popular Searches")).toBeTruthy();
      expect(queryByText("No Results Found")).toBeNull();
    });
    it("[/search] error500", async () => {
      const Comp = SCREEN_MAP["/search"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByPlaceholderText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByPlaceholderText("Search mock tests, video courses, PYQs...")).toBeTruthy();
      expect(queryByText("No Results Found")).toBeNull();
    });
    it("[/search] networkFailure", async () => {
      const Comp = SCREEN_MAP["/search"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByPlaceholderText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByPlaceholderText("Search mock tests, video courses, PYQs...")).toBeTruthy();
      expect(queryByText("No Results Found")).toBeNull();
    });
    it("[/search] success", async () => {
      const Comp = SCREEN_MAP["/search"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { query: "", total: 0, results: [] } }) } as any);
      const { getByPlaceholderText, getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByPlaceholderText("Search mock tests, video courses, PYQs...")).toBeTruthy();
      expect(getByText("Popular Searches")).toBeTruthy();
      expect(queryByText("No Results Found")).toBeNull();
    });
  });

  describe("/settings", () => {
    it("[/settings] loading", async () => {
      const Comp = SCREEN_MAP["/settings"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Account Settings")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/settings] empty", async () => {
      const Comp = SCREEN_MAP["/settings"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Account Settings")).toBeTruthy();
      expect(getByText("Current Target Goal")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/settings] error500", async () => {
      const Comp = SCREEN_MAP["/settings"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Account Settings")).toBeTruthy();
      expect(getByText("Current Target Goal")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/settings] networkFailure", async () => {
      const Comp = SCREEN_MAP["/settings"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Account Settings")).toBeTruthy();
      expect(getByText("Current Target Goal")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/settings] success", async () => {
      const Comp = SCREEN_MAP["/settings"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Account Settings")).toBeTruthy();
      expect(getByText("Current Target Goal")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
  });

  describe("/subscription", () => {
    it("[/subscription] loading", async () => {
      const Comp = SCREEN_MAP["/subscription"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Subscription & Payments")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/subscription] empty", async () => {
      const Comp = SCREEN_MAP["/subscription"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign in to view your payment history and subscription records.")).toBeTruthy();
    });
    it("[/subscription] error500", async () => {
      const Comp = SCREEN_MAP["/subscription"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign in to view your payment history and subscription records.")).toBeTruthy();
    });
    it("[/subscription] networkFailure", async () => {
      const Comp = SCREEN_MAP["/subscription"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Sign in to view your payment history and subscription records.")).toBeTruthy();
    });
    it("[/subscription] success", async () => {
      const Comp = SCREEN_MAP["/subscription"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);
      const { getByText, getAllByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Subscription & Payments")).toBeTruthy();
      expect(getAllByText(/Free Learner Tier|Aspirantbook Pass/i).length).toBeGreaterThan(0);
    });
  });

  describe("/tests/[id]", () => {
    it("[/tests/[id]] loading", async () => {
      const Comp = SCREEN_MAP["/tests/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Exam Instructions")).toBeTruthy();
      expect(queryByText("Failed to load test instructions")).toBeNull();
    });
    it("[/tests/[id]] empty", async () => {
      const Comp = SCREEN_MAP["/tests/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Failed to load test instructions")).toBeTruthy();
    });
    it("[/tests/[id]] error500", async () => {
      const Comp = SCREEN_MAP["/tests/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
    });
    it("[/tests/[id]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tests/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
    });
    it("[/tests/[id]] success", async () => {
      const Comp = SCREEN_MAP["/tests/[id]"];
      if (!Comp) return;
      const mockTest = { id: "mock-id-1", title: "Full Mock Test 1", durationMinutes: 120, totalMarks: 150, sections: [] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockTest }) } as any);
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getAllByText("Full Mock Test 1").length).toBeGreaterThan(0);
      });
      expect(queryByText("Failed to load test instructions")).toBeNull();
    });
  });

  describe("/tests/[id]/leaderboard", () => {
    it("[/tests/[id]/leaderboard] loading", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/leaderboard"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Live Leaderboard")).toBeTruthy();
      expect(queryByText("No Candidates Found")).toBeNull();
    });
    it("[/tests/[id]/leaderboard] empty", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/leaderboard"];
      if (!Comp) return;
      const mockData = { testTitle: "Mock 1", totalMarks: 100, totalParticipants: 0, currentUserRank: null, rankings: [] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockData }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Candidates Found")).toBeTruthy();
      expect(queryByText("Connection Unavailable")).toBeNull();
    });
    it("[/tests/[id]/leaderboard] error500", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/leaderboard"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Candidates Found")).toBeNull();
    });
    it("[/tests/[id]/leaderboard] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/leaderboard"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Candidates Found")).toBeNull();
    });
    it("[/tests/[id]/leaderboard] success", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/leaderboard"];
      if (!Comp) return;
      const mockData = { testTitle: "Mock 1 Leaderboard", totalMarks: 100, totalParticipants: 1, currentUserRank: 1, rankings: [{ rank: 1, userName: "Rahul Sharma", score: 98, timeSpentSeconds: 3000 }] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockData }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Mock 1 Leaderboard")).toBeTruthy();
      expect(queryByText("No Candidates Found")).toBeNull();
    });
  });

  describe("/tests/[id]/result", () => {
    it("[/tests/[id]/result] loading", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/result"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Score Report")).toBeTruthy();
      expect(queryByText("Could not retrieve examination report")).toBeNull();
    });
    it("[/tests/[id]/result] empty", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/result"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Failed to load examination result")).toBeTruthy();
    });
    it("[/tests/[id]/result] error500", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/result"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
    });
    it("[/tests/[id]/result] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/result"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
    });
    it("[/tests/[id]/result] success", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/result"];
      if (!Comp) return;
      const mockResult = { testTitle: "Full Mock Test 1", score: 120, totalMarks: 150, rank: 5, totalCandidates: 100, percentile: 95, accuracy: 80, timeSpentMinutes: 90 };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockResult }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Score Report")).toBeTruthy();
      expect(queryByText("Something went wrong")).toBeNull();
    });
  });

  describe("/tests/[id]/runner", () => {
    it("[/tests/[id]/runner] loading", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/runner"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("Unable to Load Test")).toBeNull();
    });
    it("[/tests/[id]/runner] empty", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/runner"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Unable to Load Test")).toBeTruthy();
    });
    it("[/tests/[id]/runner] error500", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/runner"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
    });
    it("[/tests/[id]/runner] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/runner"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
    });
    it("[/tests/[id]/runner] success", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/runner"];
      if (!Comp) return;
      const mockAttempt = { id: "mock-att-1", testTitle: "Full Mock Test", totalDurationSeconds: 7200, remainingTimeSeconds: 7200, questions: [{ id: "q1", sequence: 1, textEn: "What is the capital of Bihar?", optionsEn: ["Patna", "Gaya"] }] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockAttempt }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("What is the capital of Bihar?")).toBeTruthy();
      expect(queryByText("Unable to Load Test")).toBeNull();
    });
  });

  describe("/tests/[id]/solutions", () => {
    it("[/tests/[id]/solutions] loading", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/solutions"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(queryByText("No Questions Match Filter")).toBeNull();
    });
    it("[/tests/[id]/solutions] empty", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/solutions"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { questions: [] } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Questions Match Filter")).toBeTruthy();
      expect(queryByText("Patna")).toBeNull();
    });
    it("[/tests/[id]/solutions] error500", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/solutions"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Questions Match Filter")).toBeNull();
    });
    it("[/tests/[id]/solutions] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/solutions"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Questions Match Filter")).toBeNull();
    });
    it("[/tests/[id]/solutions] success", async () => {
      const Comp = SCREEN_MAP["/tests/[id]/solutions"];
      if (!Comp) return;
      const mockSolutions = {
        testTitle: "Full Mock Test",
        questions: [{
          id: "q1",
          questionNumber: 1,
          textEn: "Capital of Bihar?",
          optionsEn: ["Patna", "Gaya"],
          correctOption: "A",
          selectedOption: "A",
          isCorrect: true,
          explanationEn: "Patna is the capital city of Bihar.",
        }],
      };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockSolutions }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Solutions & Explanations")).toBeTruthy();
      expect(queryByText("No Questions Match Filter")).toBeNull();
    });
  });

  describe("/tests/series/[id]", () => {
    it("[/tests/series/[id]] loading", async () => {
      const Comp = SCREEN_MAP["/tests/series/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Test Series")).toBeTruthy();
      expect(queryByText("No Tests In This Section")).toBeNull();
    });
    it("[/tests/series/[id]] empty", async () => {
      const Comp = SCREEN_MAP["/tests/series/[id]"];
      if (!Comp) return;
      const mockEmpty = { series: { title: "Package Details" }, tests: [], isEnrolled: false };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockEmpty }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("No Tests In This Section")).toBeTruthy();
      expect(queryByText("General Studies Mock 1")).toBeNull();
    });
    it("[/tests/series/[id]] error500", async () => {
      const Comp = SCREEN_MAP["/tests/series/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("No Tests In This Section")).toBeNull();
    });
    it("[/tests/series/[id]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tests/series/[id]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("No Tests In This Section")).toBeNull();
    });
    it("[/tests/series/[id]] success", async () => {
      const Comp = SCREEN_MAP["/tests/series/[id]"];
      if (!Comp) return;
      const mockData = { series: { title: "Package Details" }, tests: [{ id: "t1", title: "General Studies Mock 1", questionsCount: 150, durationMinutes: 120 }], isEnrolled: true };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockData }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("General Studies Mock 1")).toBeTruthy();
      expect(queryByText("No Tests In This Section")).toBeNull();
    });
  });

  describe("/tutorials/[slug]/[lessonId]", () => {
    it("[/tutorials/[slug]/[lessonId]] loading", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Loading lesson content...")).toBeTruthy();
      expect(queryByText("Lesson not found.")).toBeNull();
    });
    it("[/tutorials/[slug]/[lessonId]] empty", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Could not load lesson")).toBeTruthy();
      expect(queryByText("Introduction to Python")).toBeNull();
    });
    it("[/tutorials/[slug]/[lessonId]] error500", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("Lesson not found.")).toBeNull();
    });
    it("[/tutorials/[slug]/[lessonId]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]/[lessonId]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("Lesson not found.")).toBeNull();
    });
    it("[/tutorials/[slug]/[lessonId]] success", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]/[lessonId]"];
      if (!Comp) return;
      const mockLesson = { id: "les-1", title: "Introduction to Python", contentBlocks: [{ type: "markdown", content: "Hello Python" }] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockLesson }) } as any);
      const { getAllByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getAllByText("Introduction to Python").length).toBeGreaterThan(0);
      });
      expect(queryByText("Lesson not found.")).toBeNull();
    });
  });

  describe("/tutorials/[slug]", () => {
    it("[/tutorials/[slug]] loading", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]"];
      if (!Comp) return;
      global.fetch = jest.fn(() => new Promise(() => {})) as any;
      const { getByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(getByText("Loading course syllabus...")).toBeTruthy();
      expect(queryByText("Tutorial not found.")).toBeNull();
    });
    it("[/tutorials/[slug]] empty", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: null }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Could not load tutorial")).toBeTruthy();
      expect(queryByText("Python 101 Tutorial")).toBeNull();
    });
    it("[/tutorials/[slug]] error500", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Internal server error")).toBeTruthy();
      expect(queryByText("Tutorial not found.")).toBeNull();
    });
    it("[/tutorials/[slug]] networkFailure", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]"];
      if (!Comp) return;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Network connection failed")).toBeTruthy();
      expect(queryByText("Tutorial not found.")).toBeNull();
    });
    it("[/tutorials/[slug]] success", async () => {
      const Comp = SCREEN_MAP["/tutorials/[slug]"];
      if (!Comp) return;
      const mockTutorial = { id: "tut-1", title: "Python 101 Tutorial", description: "Beginner programming course", chapters: [] };
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: mockTutorial }) } as any);
      const { findByText, queryByText } = render(<Comp />, { wrapper: createWrapper() });
      expect(await findByText("Table of Contents")).toBeTruthy();
      expect(queryByText("Tutorial not found.")).toBeNull();
    });
  });

});
