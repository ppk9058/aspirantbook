import React from "react";
import { InteractionManager } from "react-native";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";
import { Skeleton } from "../src/components/primitives/Skeleton";
import TestsTabScreen from "../src/app/(tabs)/tests";

// F4: the tests tab opens on the "Explore Series" pill. The PYQ and
// current-affairs queries are deferred until the mount interactions settle, and
// a pill tapped before that starts its own query immediately and shows the
// pre-existing skeleton (never the empty state) while it loads.

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

function jsonResponse(data: any) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ ok: true, data }),
  } as any;
}

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

beforeEach(async () => {
  jest.clearAllMocks();
  await Storage.clearAllAuthTokens();
});

describe("F4: tests tab defers the non-visible queries", () => {
  it("only requests the series list on mount, then the deferred pills after interactions", async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/v1/exam-series")) {
        calls.push("exam-series");
        return jsonResponse([series("s1", "BPSC Full Series")]);
      }
      if (url.includes("/api/v1/pyq/exams")) {
        calls.push("pyq-exams");
        return jsonResponse([{ id: "p1", name: "BPSC PYQ", code: "bpsc", description: "", totalPapers: 3 }]);
      }
      if (url.includes("/api/v1/current-affairs")) {
        calls.push("current-affairs");
        return jsonResponse([{ id: "ca1", title: "CA Quiz One", slug: "ca-1", month: "October", year: 2026 }]);
      }
      return jsonResponse(null);
    }) as any;

    // Hold every "after interactions" callback so the mount phase can be
    // inspected without the deferral firing.
    const queued: Array<() => void> = [];
    const runAfterInteractions = jest
      .spyOn(InteractionManager, "runAfterInteractions")
      .mockImplementation((task?: any) => {
        const run = typeof task === "function" ? task : task?.run;
        if (typeof run === "function") queued.push(run);
        return { then: () => {}, done: () => {}, cancel: () => {} } as any;
      });

    render(<TestsTabScreen />, { wrapper: createWrapper() });

    // First paint (series pill): only the visible list is requested.
    await waitFor(() => expect(screen.getByText("BPSC Full Series")).toBeTruthy());
    expect(calls).toEqual(["exam-series"]);

    // After the mount interactions settle both deferred lists load, so the
    // other two pills are ready exactly as before.
    await act(async () => {
      queued.forEach((run) => run());
    });
    await waitFor(() => expect(calls).toContain("pyq-exams"));
    await waitFor(() => expect(calls).toContain("current-affairs"));

    runAfterInteractions.mockRestore();
  });

  it("a pill tapped before the deferral starts its query and shows the skeleton, not the empty state", async () => {
    let resolvePyq: ((value: any) => void) | null = null;
    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/v1/exam-series")) return jsonResponse([series("s1", "BPSC Full Series")]);
      if (url.includes("/api/v1/pyq/exams")) {
        return new Promise((resolve) => {
          resolvePyq = resolve;
        });
      }
      return jsonResponse([]);
    }) as any;

    // Keep the deferral callback queued so the tap happens first.
    const runAfterInteractions = jest
      .spyOn(InteractionManager, "runAfterInteractions")
      .mockImplementation((task?: any) => ({ then: () => {}, done: () => {}, cancel: () => {} }) as any);

    render(<TestsTabScreen />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText("BPSC Full Series")).toBeTruthy());

    fireEvent.press(screen.getByText("PYQs"));

    await waitFor(() => expect(screen.UNSAFE_getAllByType(Skeleton).length).toBeGreaterThan(0));
    expect(screen.queryByText("No PYQ Papers Found")).toBeNull();

    await act(async () => {
      resolvePyq?.(jsonResponse([{ id: "p1", name: "BPSC PYQ Archive", code: "bpsc", description: "", totalPapers: 3 }]));
    });

    await waitFor(() => expect(screen.getByText("PYQ ARCHIVE")).toBeTruthy());
    expect(screen.queryByText("No PYQ Papers Found")).toBeNull();

    runAfterInteractions.mockRestore();
  });
});
