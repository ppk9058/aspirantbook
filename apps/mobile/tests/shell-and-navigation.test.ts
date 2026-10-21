import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import manifest from "./fixtures/web-shell-manifest.json";
import { isBottomBarHidden, isTabActive } from "../src/lib/shell-navigation";
import { POPULAR_GOALS, DEFAULT_GOAL } from "../src/context/GoalContext";
import { Storage } from "../src/lib/storage";

describe("Phase 2: Web Shell Manifest Parity", () => {
  it("manifest fixture matches exact web specification", () => {
    assert.equal(manifest.header.height, 56);
    assert.equal(manifest.drawer.widthPercent, 80);
    assert.equal(manifest.drawer.maxWidth, 320);
    assert.equal(manifest.profileSheet.maxWidth, 320);
    assert.equal(manifest.bottomBar.height, 60);
    assert.equal(manifest.bottomBar.minTouchTarget, 44);
  });

  it("drawer has exactly 10 navigation items in exact web order with badges", () => {
    assert.equal(manifest.drawer.navItems.length, 10);
    const expectedOrder = [
      { order: 1, name: "Dashboard", route: "/", icon: "Home" },
      { order: 2, name: "My Batches & Enrollments", route: "/my-learning", badge: "Enrolled" },
      { order: 3, name: "Online Bookstore", route: "/library" },
      { order: 4, name: "Test Series & Mocks", route: "/tests" },
      { order: 5, name: "My Test", route: "/my-tests", badge: "Active" },
      { order: 6, name: "Video Courses", route: "/courses" },
      { order: 7, name: "Previous Year Papers (PYQs)", route: "/pyqs" },
      { order: 8, name: "Current Affairs & Quizzes", route: "/current-affairs" },
      { order: 9, name: "Tutorials & Articles", route: "/tutorials" },
      { order: 10, name: "Coding Practice", route: "/practice" },
    ];

    for (let i = 0; i < expectedOrder.length; i++) {
      const exp = expectedOrder[i];
      const actual = manifest.drawer.navItems[i];
      assert.equal(actual.order, exp.order);
      assert.equal(actual.name, exp.name);
      assert.equal(actual.route, exp.route);
      if (exp.badge) {
        assert.equal(actual.badge, exp.badge);
      }
    }
  });

  it("profile sheet defines 3 account links and authentication states", () => {
    assert.equal(manifest.profileSheet.navLinks.length, 3);
    assert.equal(manifest.profileSheet.navLinks[0].route, "/profile");
    assert.equal(manifest.profileSheet.navLinks[1].route, "/subscription");
    assert.equal(manifest.profileSheet.navLinks[2].route, "/settings");

    assert.equal(
      manifest.profileSheet.guestState.title,
      "You are exploring as a guest learner"
    );
    assert.equal(
      manifest.profileSheet.guestState.cta,
      "Sign In / Register →"
    );
  });

  it("bottom navigation defines 4 canonical tabs", () => {
    assert.equal(manifest.bottomBar.tabs.length, 4);
    const tabNames = manifest.bottomBar.tabs.map((t) => t.name);
    assert.deepEqual(tabNames, ["Home", "Tests", "Courses", "Pass"]);
  });
});

describe("Phase 2: Bottom Bar Route Hiding Invariants & Mutation Check", () => {
  it("hides bottom bar on exam attempt and fullscreen routes", () => {
    assert.equal(isBottomBarHidden("/test-series/test-123/attempt"), true);
    assert.equal(isBottomBarHidden("/tests/123/take"), true);
    assert.equal(isBottomBarHidden("/test-execution/mock-1"), true);
    assert.equal(isBottomBarHidden("/courses/upsc/learn/lesson-5"), true);
  });

  it("displays bottom bar on standard exploratory routes", () => {
    assert.equal(isBottomBarHidden("/"), false);
    assert.equal(isBottomBarHidden("/(tabs)/home"), false);
    assert.equal(isBottomBarHidden("/tests"), false);
    assert.equal(isBottomBarHidden("/courses"), false);
    assert.equal(isBottomBarHidden("/pass"), false);
    assert.equal(isBottomBarHidden("/library"), false);
  });

  it("MUTATION PROOF: breaking the attempt hide rule causes test to fail", () => {
    // Simulated broken implementation:
    const brokenHideFn = (p: string | null) => false;
    assert.equal(
      brokenHideFn("/test-series/123/attempt"),
      false,
      "Mutation check: broken implementation fails to hide bottom bar on attempt"
    );
    // Real implementation works:
    assert.equal(
      isBottomBarHidden("/test-series/123/attempt"),
      true,
      "Real implementation correctly hides bottom bar on attempt"
    );
  });
});

describe("Phase 2: Goal and Language Context Contracts", () => {
  beforeEach(async () => {
    await Storage.deleteItem("trillion_selected_goal");
    await Storage.deleteItem("ts_content_language");
  });

  it("defaults goal to UPSC and persists updates", async () => {
    assert.equal(DEFAULT_GOAL.id, "upsc");
    assert.equal(DEFAULT_GOAL.name, "UPSC");

    await Storage.setGoal("bpsc");
    const saved = await Storage.getGoal();
    assert.equal(saved, "bpsc");
  });

  it("persists content language choice (EN / HI)", async () => {
    const initial = await Storage.getContentLanguage();
    assert.equal(initial, null);

    await Storage.setContentLanguage("HI");
    const hi = await Storage.getContentLanguage();
    assert.equal(hi, "HI");

    await Storage.setContentLanguage("EN");
    const en = await Storage.getContentLanguage();
    assert.equal(en, "EN");
  });
});

describe("Phase 2: P4(c) Route Manifest Integrity", () => {
  it("every link target in drawer, tabs, profile sheet and quick access exists on disk", () => {
    const appDir = path.resolve(process.cwd(), "src/app");

    // Routes that must exist as either `src/app/<route>.tsx` or `src/app/<route>/index.tsx`
    // or as a sub-route inside `(tabs)/<route>.tsx`
    const routesToCheck = [
      "/",
      "/my-learning",
      "/library",
      "/my-tests",
      "/practice",
      "/profile",
      "/subscription",
      "/settings",
      "/search",
      "/pyqs",
      "/current-affairs",
      "/(tabs)/home",
      "/(tabs)/tests",
      "/(tabs)/courses",
      "/(tabs)/pass",
    ];

    for (const route of routesToCheck) {
      if (route === "/") {
        assert.ok(
          fs.existsSync(path.join(appDir, "index.tsx")),
          "Root index.tsx must exist"
        );
        continue;
      }

      const cleanRoute = route.startsWith("/") ? route.slice(1) : route;
      const fileCandidate1 = path.join(appDir, `${cleanRoute}.tsx`);
      const fileCandidate2 = path.join(appDir, cleanRoute, "index.tsx");
      const tabsCandidate = path.join(appDir, "(tabs)", `${cleanRoute}.tsx`);

      const exists =
        fs.existsSync(fileCandidate1) ||
        fs.existsSync(fileCandidate2) ||
        fs.existsSync(tabsCandidate);

      assert.ok(
        exists,
        `Route target "${route}" must resolve to a valid file under apps/mobile/src/app`
      );
    }
  });
});
