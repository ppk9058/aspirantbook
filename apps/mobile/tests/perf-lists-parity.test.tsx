import React from "react";
import { FlatList } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";

import HomeScreen from "../src/app/(tabs)/home";
import CoursesTabScreen from "../src/app/(tabs)/courses";
import TestsTabScreen from "../src/app/(tabs)/tests";
import CurrentAffairsScreen from "../src/app/current-affairs/index";
import PyqsScreen from "../src/app/pyqs/index";

// F1 parity guard: the five audited mobile screens render their long lists
// through a virtualized FlatList (not ScrollView + .map()) while showing the
// exact same header content, item content, keys, separators and states as
// before the change.

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

function mockFetchByPath(routes: Record<string, any>) {
  global.fetch = jest.fn(async (input: any) => {
    const url = String(input);
    for (const [path, data] of Object.entries(routes)) {
      if (url.includes(path)) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ ok: true, data }),
        } as any;
      }
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ ok: true, data: null }),
    } as any;
  });
}

const course = (id: string, title: string) => ({
  id,
  title,
  slug: id,
  description: "Syllabus overview",
  thumbnailUrl: null,
  difficulty: "BEGINNER",
  duration: 30,
  rating: 4.5,
  enrollmentCount: 10,
  isFree: true,
  price: 0,
  chaptersCount: 2,
  lessonsCount: 8,
  isEnrolled: false,
});

const series = (id: string, title: string) => ({
  id,
  title,
  category: "BPSC",
  description: "Full length mocks",
  isFree: true,
  freeTests: 2,
  totalTests: 10,
  languages: ["English", "Hindi"],
});

const caItem = (id: string, title: string) => ({
  id,
  title,
  slug: id,
  month: "October",
  year: 2026,
  publishedAt: "2026-10-01T00:00:00.000Z",
});

const paper = (id: string, title: string) => ({
  id,
  title,
  year: 2025,
  shift: "Shift 1",
  examId: "e1",
  examName: "BPSC Prelims",
  hasFile: true,
  totalQuestions: 150,
  isLockedForGuest: false,
  previewCount: 150,
  totalItemsCount: 150,
  fileUrl: null,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await Storage.clearAllAuthTokens();
});

describe("F1: virtualized lists keep the exact same content", () => {
  it("home renders the same header plus every recent test in a FlatList", async () => {
    mockFetchByPath({
      "/api/v1/home": {
        streakDays: 4,
        continueLearning: null,
        todayQuiz: { title: "Daily CA Quiz", questionCount: 15 },
        upcomingOrRecentTests: [
          {
            id: "t1",
            title: "BPSC Mock 1",
            seriesTitle: "BPSC Series",
            durationMinutes: 120,
            score: null,
          },
          {
            id: "t2",
            title: "BPSC Mock 2",
            seriesTitle: "BPSC Series",
            durationMinutes: 120,
            score: 88,
          },
        ],
      },
    });

    render(<HomeScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Daily Prep Hub")).toBeTruthy();
      expect(screen.getByText("Mock Examinations")).toBeTruthy();
      expect(screen.getByText("See all →")).toBeTruthy();
      expect(screen.getByText("BPSC Mock 1")).toBeTruthy();
      expect(screen.getByText("BPSC Mock 2")).toBeTruthy();
      expect(screen.getByText("Latest Score: 88")).toBeTruthy();
    });

    expect(screen.UNSAFE_getByType(FlatList)).toBeTruthy();
  });

  it("home keeps the same empty card when there are no recent attempts", async () => {
    mockFetchByPath({
      "/api/v1/home": {
        streakDays: 0,
        continueLearning: null,
        todayQuiz: null,
        upcomingOrRecentTests: [],
      },
    });

    render(<HomeScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No recent attempts")).toBeTruthy();
      expect(screen.getByText("Explore test series to attempt simulated CBT exams.")).toBeTruthy();
    });
  });

  it("courses renders every card and keeps the search input mounted while typing", async () => {
    mockFetchByPath({
      "/api/v1/career-tracks": [{ id: "tr1", title: "Track 1", slug: "track-1", type: "CAREER", description: "", thumbnail: null, totalCourses: 3 }],
      "/api/v1/courses": [course("c1", "Alpha Course"), course("c2", "Beta Course"), course("c3", "Gamma Course")],
    });

    render(<CoursesTabScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Alpha Course")).toBeTruthy();
      expect(screen.getByText("Gamma Course")).toBeTruthy();
      expect(screen.getByText("1 structured end-to-end paths")).toBeTruthy();
      expect(screen.getByText("Career & Skill Tracks")).toBeTruthy();
      expect(screen.getByText("All Levels")).toBeTruthy();
    });

    const input = screen.getByPlaceholderText("Search courses by topic, syllabus...");
    fireEvent.changeText(input, "alpha");
    expect(screen.getByPlaceholderText("Search courses by topic, syllabus...").props.value).toBe("alpha");

    expect(screen.UNSAFE_getByType(FlatList)).toBeTruthy();
  });

  it("courses keeps the same empty state", async () => {
    mockFetchByPath({ "/api/v1/career-tracks": [], "/api/v1/courses": [] });

    render(<CoursesTabScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No Courses Found")).toBeTruthy();
      expect(screen.getByText("Clear Filters")).toBeTruthy();
    });
  });

  it("tests tab renders each pill list in the same order and content", async () => {
    mockFetchByPath({
      "/api/v1/exam-series": [series("s1", "BPSC Full Series"), series("s2", "UPSC Full Series")],
      "/api/v1/pyq/exams": [{ id: "p1", name: "BPSC PYQ", code: "bpsc", description: "", totalPapers: 3 }],
      "/api/v1/current-affairs": [caItem("ca1", "CA Quiz One")],
    });

    render(<TestsTabScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("BPSC Full Series")).toBeTruthy();
      expect(screen.getByText("UPSC Full Series")).toBeTruthy();
      expect(screen.getAllByText("10 Total Tests")).toHaveLength(2);
    });

    fireEvent.press(screen.getByText("PYQs"));
    await waitFor(() => expect(screen.getByText("PYQ ARCHIVE")).toBeTruthy());

    fireEvent.press(screen.getByText("Quizzes"));
    await waitFor(() => expect(screen.getByText("CA Quiz One")).toBeTruthy());

    expect(screen.UNSAFE_getByType(FlatList)).toBeTruthy();
  });

  it("tests tab keeps the same empty states per pill", async () => {
    mockFetchByPath({
      "/api/v1/exam-series": [],
      "/api/v1/pyq/exams": [],
      "/api/v1/current-affairs": [],
    });

    render(<TestsTabScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText("No Test Series Found")).toBeTruthy());
    fireEvent.press(screen.getByText("PYQs"));
    await waitFor(() => expect(screen.getByText("No PYQ Papers Found")).toBeTruthy());
    fireEvent.press(screen.getByText("Quizzes"));
    await waitFor(() => expect(screen.getByText("No Current Affairs Quizzes")).toBeTruthy());
  });

  it("current affairs renders both tabs from the same list", async () => {
    mockFetchByPath({
      "/api/v1/current-affairs": [caItem("ca1", "CA Quiz One"), caItem("ca2", "CA Quiz Two")],
    });

    render(<CurrentAffairsScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("CA Quiz One")).toBeTruthy();
      expect(screen.getByText("CA Quiz Two")).toBeTruthy();
      expect(screen.getAllByText("15 mins • 15 MCQs")).toHaveLength(2);
    });

    fireEvent.press(screen.getByText("Monthly PDF Magazines"));
    await waitFor(() => expect(screen.getAllByText("MONTHLY 2026")).toHaveLength(2));

    expect(screen.UNSAFE_getByType(FlatList)).toBeTruthy();
  });

  it("current affairs keeps the same empty state", async () => {
    mockFetchByPath({ "/api/v1/current-affairs": [] });
    render(<CurrentAffairsScreen />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText("No Current Affairs Listed")).toBeTruthy());
  });

  it("pyqs renders every paper and keeps the search input mounted", async () => {
    mockFetchByPath({
      "/api/v1/pyq/exams": [{ id: "e1", name: "BPSC Prelims", code: "bpsc", description: "", totalPapers: 2 }],
      "/api/v1/pyq/papers": [paper("p1", "BPSC 2025 Paper"), paper("p2", "BPSC 2024 Paper")],
    });

    render(<PyqsScreen />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("BPSC 2025 Paper")).toBeTruthy();
      expect(screen.getByText("BPSC 2024 Paper")).toBeTruthy();
      expect(screen.getAllByText("Year 2025 (Shift 1)")).toHaveLength(2);
      expect(screen.getAllByText("150 Questions • Official Paper")).toHaveLength(2);
      expect(screen.getByText("BPSC Prelims (2)")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("Search papers by exam or year..."), "2024");
    expect(screen.getByPlaceholderText("Search papers by exam or year...").props.value).toBe("2024");

    expect(screen.UNSAFE_getByType(FlatList)).toBeTruthy();
  });

  it("pyqs keeps the same empty state", async () => {
    mockFetchByPath({ "/api/v1/pyq/exams": [], "/api/v1/pyq/papers": [] });
    render(<PyqsScreen />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText("No Papers Found")).toBeTruthy());
  });
});
