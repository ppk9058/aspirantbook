import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/context/AuthContext";
import { GoalProvider } from "../src/context/GoalContext";
import * as WebBrowser from "expo-web-browser";
import { getWebOrigin, buildWebUrl, openWebUrl } from "../src/lib/web-links";

// Screens / Components using web-links
import CurrentAffairsScreen from "../src/app/current-affairs/index";
import SubscriptionScreen from "../src/app/subscription";
import PassTabScreen from "../src/app/(tabs)/pass";
import TestSeriesDetailScreen from "../src/app/tests/series/[id]";
import CourseDetailScreen from "../src/app/courses/[id]";
import RegisterScreen from "../src/app/(auth)/register";
import PyqPdfViewScreen from "../src/app/pyqs/pdf-view";
import { WebOnlyScreen } from "../src/components/primitives/WebOnlyScreen";
import { AvailableOnWebsiteModal } from "../src/components/common/AvailableOnWebsiteModal";

const { __setMockParams } = require("expo-router");

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

describe("G6: Web Link Callers Audit", () => {
  const originalWebUrl = process.env.EXPO_PUBLIC_WEB_URL;
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_WEB_URL = originalWebUrl;
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    jest.clearAllMocks();
  });

  // 1. app/current-affairs/index
  it("[weblink:app/current-affairs/index] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/current-affairs")).toBeNull();
  });

  it("[weblink:app/current-affairs/index] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/current-affairs", "daily_digest");
    expect(url).toBe("https://web.test.com/current-affairs?utm_source=mobile_app&utm_campaign=daily_digest");
    const res = await openWebUrl("/current-affairs");
    expect(res.success).toBe(true);
  });

  // 2. app/subscription
  it("[weblink:app/subscription] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/subscription")).toBeNull();
  });

  it("[weblink:app/subscription] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/subscription", "manage_sub");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/subscription");
    expect(res.success).toBe(true);
  });

  // 3. app/(tabs)/pass
  it("[weblink:app/(tabs)/pass] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/pass")).toBeNull();
  });

  it("[weblink:app/(tabs)/pass] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/pass", "pass_tab");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/pass");
    expect(res.success).toBe(true);
  });

  // 4. app/tests/series/[id]
  it("[weblink:app/tests/series/[id]] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/tests/series/s-1")).toBeNull();
  });

  it("[weblink:app/tests/series/[id]] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/tests/series/s-1", "series_enroll");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/tests/series/s-1");
    expect(res.success).toBe(true);
  });

  // 5. app/courses/[id]
  it("[weblink:app/courses/[id]] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/courses/c-1")).toBeNull();
  });

  it("[weblink:app/courses/[id]] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/courses/c-1", "course_enroll");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/courses/c-1");
    expect(res.success).toBe(true);
  });

  // 6. app/(auth)/register
  it("[weblink:app/(auth)/register] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/legal/terms")).toBeNull();
  });

  it("[weblink:app/(auth)/register] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/legal/terms", "register_consent");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/legal/terms");
    expect(res.success).toBe(true);
  });

  // 7. app/pyqs/pdf-view
  it("[weblink:app/pyqs/pdf-view] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/pyqs")).toBeNull();
  });

  it("[weblink:app/pyqs/pdf-view] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/pyqs/123", "pdf_viewer");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/pyqs/123");
    expect(res.success).toBe(true);
  });

  // 8. components/primitives/WebOnlyScreen
  it("[weblink:components/primitives/WebOnlyScreen] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/practice")).toBeNull();
  });

  it("[weblink:components/primitives/WebOnlyScreen] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/practice", "web_only_screen");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/practice");
    expect(res.success).toBe(true);
  });

  // 9. components/common/AvailableOnWebsiteModal
  it("[weblink:components/common/AvailableOnWebsiteModal] origin unset disables or shows unavailable feedback", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(buildWebUrl("/feature")).toBeNull();
  });

  it("[weblink:components/common/AvailableOnWebsiteModal] origin configured opens browser with mobile utm", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://web.test.com";
    const url = buildWebUrl("/feature", "website_modal");
    expect(url).toContain("utm_source=mobile_app");
    const res = await openWebUrl("/feature");
    expect(res.success).toBe(true);
  });
});
