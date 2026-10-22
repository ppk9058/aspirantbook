/**
 * Screen Registry for TrillionSkill Mobile (Run 4)
 * Comprehensive manifest of all screens in apps/mobile/src/app
 */

export type ScreenKind = "data" | "static" | "web-only";
export type ScreenState = "loading" | "empty" | "error500" | "networkFailure" | "success";

export const ALL_SCREEN_STATES: ScreenState[] = [
  "loading",
  "empty",
  "error500",
  "networkFailure",
  "success",
];

export interface ScreenRegistryEntry {
  route: string;
  file: string; // relative to apps/mobile/src/app
  kind: ScreenKind;
  requiredStates: ScreenState[];
  naJustifications?: Partial<Record<ScreenState, string>>;
}

export const SCREEN_REGISTRY: ScreenRegistryEntry[] = [
  // --- Auth Screens (Form & Lifecycle States) ---
  {
    route: "/(auth)/forgot-password",
    file: "(auth)/forgot-password.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(auth)/login",
    file: "(auth)/login.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(auth)/register",
    file: "(auth)/register.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(auth)/reset-password",
    file: "(auth)/reset-password.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },

  // --- Tab Screens (Data) ---
  {
    route: "/(tabs)/index",
    file: "(tabs)/index.tsx",
    kind: "static",
    requiredStates: ["success"],
    naJustifications: {
      loading: "Tabs index performs route redirect to home without data list states",
      empty: "Tabs index contains no data list",
      error500: "Tabs index performs instant redirect",
      networkFailure: "Tabs index performs instant redirect",
    },
  },
  {
    route: "/(tabs)/courses",
    file: "(tabs)/courses.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(tabs)/home",
    file: "(tabs)/home.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(tabs)/learn",
    file: "(tabs)/learn.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(tabs)/library",
    file: "(tabs)/library.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(tabs)/pass",
    file: "(tabs)/pass.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(tabs)/practice",
    file: "(tabs)/practice.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(tabs)/profile",
    file: "(tabs)/profile.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/(tabs)/tests",
    file: "(tabs)/tests.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },

  // --- Dynamic & Feature Screens (Data) ---
  {
    route: "/career-tracks/[id]",
    file: "career-tracks/[id].tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/career-tracks",
    file: "career-tracks/index.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/courses/[id]",
    file: "courses/[id].tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/courses/[id]/lesson/[lessonId]",
    file: "courses/[id]/lesson/[lessonId].tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/current-affairs",
    file: "current-affairs/index.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/index",
    file: "index.tsx",
    kind: "static",
    requiredStates: ["success"],
    naJustifications: {
      loading: "Index splash performs route redirect without data list states",
      empty: "Index splash contains no data list",
      error500: "Index splash falls back to guest mode or login, no error UI state",
      networkFailure: "Index splash falls back to home on network error",
    },
  },
  {
    route: "/library",
    file: "library.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/my-learning",
    file: "my-learning.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/my-tests",
    file: "my-tests.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/practice",
    file: "practice.tsx",
    kind: "web-only",
    requiredStates: ["success"],
    naJustifications: {
      loading: "WebOnlyScreen renders static message with no initial fetch",
      empty: "WebOnlyScreen is an informational notice with no collection",
      error500: "WebOnlyScreen does not make API requests to fail with 500",
      networkFailure: "WebOnlyScreen does not make network calls",
    },
  },
  {
    route: "/profile",
    file: "profile.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/pyqs",
    file: "pyqs/index.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/pyqs/pdf-view",
    file: "pyqs/pdf-view.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/reader/[id]",
    file: "reader/[id].tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/search",
    file: "search.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/settings",
    file: "settings.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/subscription",
    file: "subscription.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tests/[id]",
    file: "tests/[id]/index.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tests/[id]/leaderboard",
    file: "tests/[id]/leaderboard.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tests/[id]/result",
    file: "tests/[id]/result.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tests/[id]/runner",
    file: "tests/[id]/runner.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tests/[id]/solutions",
    file: "tests/[id]/solutions.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tests/series/[id]",
    file: "tests/series/[id].tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tutorials/[slug]/[lessonId]",
    file: "tutorials/[slug]/[lessonId].tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
  {
    route: "/tutorials/[slug]",
    file: "tutorials/[slug]/index.tsx",
    kind: "data",
    requiredStates: ALL_SCREEN_STATES,
  },
];
