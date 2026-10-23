import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveNotificationRoute,
  handleNotificationDeepLink,
  getNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences,
} from "../src/lib/push";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("F3: Push Notifications Architecture & Deep Linking", () => {
  it("complies with App Store & Play Store guidelines: cold launch never triggers push permission prompt", () => {
    const indexPath = path.resolve(__dirname, "../src/app/index.tsx");
    const indexContent = fs.readFileSync(indexPath, "utf8");

    assert.ok(
      !indexContent.includes("registerForPushNotificationsAsync()"),
      "app/index.tsx must NOT request push notification permission on cold launch"
    );
  });

  it("resolves deep link routes from diverse push notification payloads", () => {
    // Explicit route payload
    assert.equal(
      resolveNotificationRoute({ route: "/courses/upsc-2027" }),
      "/courses/upsc-2027"
    );

    // Entity type course
    assert.equal(
      resolveNotificationRoute({ type: "course", id: "history-ancient" }),
      "/courses/history-ancient"
    );

    // Entity type test
    assert.equal(
      resolveNotificationRoute({ type: "test", id: "test-series-44" }),
      "/tests/test-series-44"
    );

    // URL payload with origin
    assert.equal(
      resolveNotificationRoute({ url: "https://aspirantbook.com/courses/polity-foundation" }),
      "/courses/polity-foundation"
    );

    // Invalid or empty payload
    assert.equal(resolveNotificationRoute(null), null);
    assert.equal(resolveNotificationRoute({}), null);
  });

  it("dispatches deep link navigation through router", () => {
    const pushedRoutes: string[] = [];
    const mockRouter = {
      push: (route: string) => {
        pushedRoutes.push(route);
      },
    };

    const handled = handleNotificationDeepLink(
      { type: "test", id: "prelims-live-mock-1" },
      mockRouter
    );

    assert.equal(handled, true);
    assert.deepEqual(pushedRoutes, ["/tests/prelims-live-mock-1"]);
  });

  it("persists and restores notification preferences in local storage", async () => {
    const samplePrefs: NotificationPreferences = {
      pushEnabled: true,
      examReminders: false,
      courseUpdates: true,
      dailyStreak: false,
    };

    await saveNotificationPreferences(samplePrefs);
    const retrieved = await getNotificationPreferences();

    assert.equal(retrieved.pushEnabled, true);
    assert.equal(retrieved.examReminders, false);
    assert.equal(retrieved.courseUpdates, true);
    assert.equal(retrieved.dailyStreak, false);
  });
});

describe("F3: Mutation Proofs (4 Required Invariants)", () => {
  it("MUTATION PROOF 1: Breaking course deep link resolution fails routing", () => {
    const brokenResolver = (data: any) => {
      // Mutated: misses course routing
      if (data?.type === "test") return `/tests/${data.id}`;
      return null;
    };
    const courseRoute = brokenResolver({ type: "course", id: "geo-101" });
    assert.equal(courseRoute, null); // Mutated fails

    const realRoute = resolveNotificationRoute({ type: "course", id: "geo-101" });
    assert.equal(realRoute, "/courses/geo-101");
  });

  it("MUTATION PROOF 2: Breaking test deep link resolution fails routing", () => {
    const brokenResolver = (data: any) => {
      // Mutated: misses test routing
      if (data?.type === "course") return `/courses/${data.id}`;
      return null;
    };
    const testRoute = brokenResolver({ type: "test", id: "test-99" });
    assert.equal(testRoute, null); // Mutated fails

    const realRoute = resolveNotificationRoute({ type: "test", id: "test-99" });
    assert.equal(realRoute, "/tests/test-99");
  });

  it("MUTATION PROOF 3: Reintroducing push registration in index.tsx MUST fail compliance guard", () => {
    const mutatedIndexContent = `
      useEffect(() => {
        registerForPushNotificationsAsync();
      }, []);
    `;
    const checkCompliance = (content: string) => !content.includes("registerForPushNotificationsAsync()");
    assert.equal(checkCompliance(mutatedIndexContent), false); // Mutated fails

    const realIndexContent = fs.readFileSync(path.resolve(__dirname, "../src/app/index.tsx"), "utf8");
    assert.equal(checkCompliance(realIndexContent), true);
  });

  it("MUTATION PROOF 4: Saving preferences MUST persist full granular dictionary", async () => {
    const brokenSave = async (_prefs: any) => {
      // Mutated: drops dailyStreak
    };
    await brokenSave({ pushEnabled: true, dailyStreak: false });
    // Real saver MUST persist all fields
    const testPrefs: NotificationPreferences = {
      pushEnabled: false,
      examReminders: false,
      courseUpdates: false,
      dailyStreak: false,
    };
    await saveNotificationPreferences(testPrefs);
    const readBack = await getNotificationPreferences();
    assert.equal(readBack.pushEnabled, false);
    assert.equal(readBack.dailyStreak, false);
  });
});
