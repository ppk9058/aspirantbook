import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";
import BootstrapScreen from "../src/app/index";

const { __mockReplace } = require("expo-router");

// F3 decision-table guard. Before the change BootstrapScreen called api.getMe()
// and AuthProvider called api.getMe() again on cold start. The two call sites
// now share one in-flight request, and every branch below must still land on
// the same redirect and the same token side effect.
//
// | case            | token | /me result      | redirect          | tokens           |
// | --------------- | ----- | --------------- | ----------------- | ---------------- |
// | logged-in       | yes   | 200 profile     | /(tabs)/home      | kept             |
// | guest / logged-out | no | (not called)    | /(tabs)/home      | none to clear    |
// | expired token   | yes   | 401 + refresh ✗ | /(tabs)/home      | cleared          |
// | offline         | yes   | network error   | /(tabs)/home      | cleared          |

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider queryClient={queryClient}>
            <GoalProvider>{children}</GoalProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

function jsonResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => data,
  } as any;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  jest.clearAllMocks();
  await Storage.clearAllAuthTokens();
});

afterEach(async () => {
  await Storage.clearAllAuthTokens();
});

describe("F3: cold-start viewer request", () => {
  it("logged-in: one /me request for the bootstrap screen and the auth context", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setRefreshToken("valid-refresh");

    let meCalls = 0;
    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/v1/me")) {
        meCalls += 1;
        await delay(40);
        return jsonResponse({
          ok: true,
          data: { id: "u1", name: "Learner", email: "learner@example.test", role: "STUDENT" },
        });
      }
      return jsonResponse({ ok: true, data: null });
    }) as any;

    render(<BootstrapScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home"));
    await waitFor(() => expect(meCalls).toBe(1));
    // give the second (deduped) caller time to settle
    await delay(120);
    expect(meCalls).toBe(1);
    expect(await Storage.getAccessToken()).toBe("valid-token");
  });

  it("guest: no /me request and the same redirect", async () => {
    let meCalls = 0;
    global.fetch = jest.fn(async (input: any) => {
      if (String(input).includes("/api/v1/me")) meCalls += 1;
      return jsonResponse({ ok: true, data: null });
    }) as any;

    render(<BootstrapScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home"));
    expect(meCalls).toBe(0);
  });

  it("expired token: same redirect and the tokens are still cleared", async () => {
    await Storage.setAccessToken("expired-token");
    await Storage.setRefreshToken("expired-refresh");

    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/v1/me")) {
        return jsonResponse({ ok: false, error: { code: "UNAUTHORIZED", message: "expired" } }, 401);
      }
      return jsonResponse({ ok: false, error: { code: "UNAUTHORIZED", message: "expired" } }, 401);
    }) as any;

    render(<BootstrapScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home"));
    await waitFor(async () => expect(await Storage.getAccessToken()).toBeNull());
  });

  it("offline: same redirect and today's token wipe still happens", async () => {
    await Storage.setAccessToken("valid-token");
    await Storage.setRefreshToken("valid-refresh");

    global.fetch = jest.fn(async () => {
      throw new Error("Network request failed");
    }) as any;

    render(<BootstrapScreen />, { wrapper: createWrapper() });

    await waitFor(() => expect(__mockReplace).toHaveBeenCalledWith("/(tabs)/home"));
    await waitFor(async () => expect(await Storage.getAccessToken()).toBeNull());
  });
});
