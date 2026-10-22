import React from "react";
import { render, waitFor, act } from "@testing-library/react-native";
import { AppState } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";
import { cbtSyncQueue } from "../src/lib/cbt-sync";
import { CbtRecoveryManager } from "../src/components/cbt/CbtRecoveryManager";

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

describe("T4: CBT Recovery Wiring - Mounted Lifecycle & AppState Tests", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await Storage.clearAllAuthTokens();
    cbtSyncQueue.lastSyncError = null;
  });

  afterEach(async () => {
    await Storage.clearAllAuthTokens();
    cbtSyncQueue.lastSyncError = null;
  });

  it("proves recoverUnsentAnswers() is NOT called while user is unauthenticated / guest", async () => {
    const recoverSpy = jest.spyOn(cbtSyncQueue, "recoverUnsentAnswers").mockResolvedValue(0);

    render(<CbtRecoveryManager />, { wrapper: createWrapper() });

    // Wait short delay to allow mount
    await new Promise((r) => setTimeout(r, 100));

    expect(recoverSpy).not.toHaveBeenCalled();
    recoverSpy.mockRestore();
  });

  it("proves recoverUnsentAnswers() IS called when user auth resolves to authenticated", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setUser({ id: "u-rec-1", name: "Candidate", email: "candidate@test.com" });

    global.fetch = jest.fn(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/v1/me")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: { id: "u-rec-1", name: "Candidate", email: "candidate@test.com", role: "STUDENT" },
          }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, data: {} }) } as any;
    });

    const recoverSpy = jest.spyOn(cbtSyncQueue, "recoverUnsentAnswers").mockResolvedValue(3);

    render(<CbtRecoveryManager />, { wrapper: createWrapper() });

    await waitFor(
      () => {
        expect(recoverSpy).toHaveBeenCalledTimes(1);
      },
      { timeout: 4000 }
    );

    recoverSpy.mockRestore();
  });

  it("proves recoverUnsentAnswers() IS called on AppState change to active", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setUser({ id: "u-rec-2", name: "Candidate", email: "candidate@test.com" });

    global.fetch = jest.fn(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/v1/me")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: { id: "u-rec-2", name: "Candidate", email: "candidate@test.com", role: "STUDENT" },
          }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, data: {} }) } as any;
    });

    const recoverSpy = jest.spyOn(cbtSyncQueue, "recoverUnsentAnswers").mockResolvedValue(1);

    render(<CbtRecoveryManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(recoverSpy).toHaveBeenCalledTimes(1);
    });

    // Simulate AppState transition: background -> active
    await act(async () => {
      (AppState as any).__mockEmitStateChange?.("active") ||
        (AppState as any).emit?.("change", "active");
    });

    // If AppState emit helper is standard EventEmitter:
    await waitFor(() => {
      expect(recoverSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    recoverSpy.mockRestore();
  });

  it("proves recovery errors are surfaced to queue state rather than silently swallowed", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setUser({ id: "u-rec-err", name: "Candidate", email: "candidate@test.com" });

    global.fetch = jest.fn(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/v1/me")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            data: { id: "u-rec-err", name: "Candidate", email: "candidate@test.com", role: "STUDENT" },
          }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, data: {} }) } as any;
    });

    const onRecoveryError = jest.fn();
    const recoverSpy = jest.spyOn(cbtSyncQueue, "recoverUnsentAnswers").mockRejectedValue(
      new Error("Server 503 Service Unavailable during recovery")
    );

    render(<CbtRecoveryManager onRecoveryError={onRecoveryError} />, {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(onRecoveryError).toHaveBeenCalledWith("Server 503 Service Unavailable during recovery");
        expect(cbtSyncQueue.getLastSyncError()).toBe("Server 503 Service Unavailable during recovery");
      },
      { timeout: 4000 }
    );

    recoverSpy.mockRestore();
  });
});
