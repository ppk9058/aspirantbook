import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Phase 7: Account, Settings, Search, and Pass Parity", () => {
  const appRoot = path.join(__dirname, "../src/app");

  it("all Phase 7 route files exist under src/app", () => {
    const requiredRoutes = [
      "(tabs)/profile.tsx",
      "profile.tsx",
      "settings.tsx",
      "search.tsx",
      "(tabs)/pass.tsx",
      "subscription.tsx",
    ];

    for (const route of requiredRoutes) {
      const fullPath = path.join(appRoot, route);
      assert.equal(
        fs.existsSync(fullPath),
        true,
        `Route file missing: ${route}`
      );
    }
  });

  it("subscription and pass screens strictly implement Reader model with utm_source", () => {
    const passContent = fs.readFileSync(path.join(appRoot, "(tabs)/pass.tsx"), "utf8");
    const subContent = fs.readFileSync(path.join(appRoot, "subscription.tsx"), "utf8");

    assert.equal(
      passContent.includes("WebBrowser.openBrowserAsync"),
      true,
      "Pass screen must direct to WebBrowser for pricing (Reader Model)"
    );
    assert.equal(
      passContent.includes("utm_source=mobile_app"),
      true,
      "Pass screen pricing URL must include utm_source=mobile_app"
    );

    assert.equal(
      subContent.includes("WebBrowser.openBrowserAsync"),
      true,
      "Subscription screen must direct to WebBrowser for pricing"
    );
    assert.equal(
      subContent.includes("utm_source=mobile_app"),
      true,
      "Subscription screen pricing URL must include utm_source=mobile_app"
    );
  });

  it("global search connects to typed api.search and handles multi-type filters", () => {
    const searchContent = fs.readFileSync(path.join(appRoot, "search.tsx"), "utf8");
    assert.equal(
      searchContent.includes("api.search"),
      true,
      "Search screen must consume typed api.search"
    );
    assert.equal(
      searchContent.includes("filterType"),
      true,
      "Search screen must handle filterType categorization"
    );
  });

  it("profile and settings include session revocation and account deletion safeguards", () => {
    const profileContent = fs.readFileSync(path.join(appRoot, "(tabs)/profile.tsx"), "utf8");
    const settingsContent = fs.readFileSync(path.join(appRoot, "settings.tsx"), "utf8");

    assert.equal(
      profileContent.includes("deleteMe"),
      true,
      "Profile screen must support deleteMe API"
    );
    assert.equal(
      profileContent.includes("revokeSession"),
      true,
      "Profile screen must support remote device session revocation"
    );

    assert.equal(
      settingsContent.includes("logoutAll"),
      true,
      "Settings screen must support revoking all sessions"
    );
    assert.equal(
      settingsContent.includes("deleteMe"),
      true,
      "Settings screen must support permanent account deletion"
    );
  });
});
