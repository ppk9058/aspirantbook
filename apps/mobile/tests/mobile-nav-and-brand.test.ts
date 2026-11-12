import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", rel), "utf8");

/**
 * Mobile landing navigation — Expo parity.
 *
 * Source-level audit only. The Expo app has no landing/welcome screen with a
 * "Login" button (`src/app/index.tsx` is a bootstrap redirect and the only
 * sign-in button lives on the login form), so change 4 is not applicable here.
 */
describe("Expo — brand wordmark is never clipped and the header has no bell", () => {
  it("MobileAppHeader renders the full aspirantBook wordmark", () => {
    const header = read("src/components/shell/MobileAppHeader.tsx");

    assert.ok(header.includes(">aspirantBook<") || header.includes("aspirantBook"), "brand text present");
    assert.ok(
      !header.includes("numberOfLines={1}"),
      "the wordmark must not be limited to one ellipsised line"
    );
    assert.ok(
      !header.includes("ellipsizeMode"),
      "the wordmark must not use ellipsizeMode"
    );
    // Brand row/text may not shrink next to the header controls.
    assert.match(header, /brandRow: \{[\s\S]*?flexShrink: 0,[\s\S]*?\},/);
    assert.match(header, /brandText: \{[\s\S]*?flexShrink: 0,[\s\S]*?\},/);
  });

  it("the standalone bell and its always-on dot are gone from the header", () => {
    const header = read("src/components/shell/MobileAppHeader.tsx");

    assert.ok(!header.includes('testID="mobile-header-bell"'), "no header bell");
    assert.ok(
      !header.includes('testID="mobile-header-notification-dot"'),
      "no placeholder notification dot"
    );
    assert.ok(!header.includes("Bell"), "the Bell icon is not imported");
    // Search stays, and the hamburger (change 1) already exists on Expo.
    assert.ok(header.includes('testID="mobile-header-search"'), "search kept");
    assert.ok(header.includes('testID="mobile-header-hamburger"'), "hamburger kept");
  });

  it("notifications are reachable from the profile sheet, above Account Settings", () => {
    const sheet = read("src/components/shell/MobileProfileSheet.tsx");

    const notificationsAt = sheet.indexOf('testId: "profile-sheet-link-notifications"');
    const settingsAt = sheet.indexOf('testId: "profile-sheet-link-settings"');
    assert.ok(notificationsAt > 0, "notifications item exists");
    assert.ok(settingsAt > notificationsAt, "notifications sits above Account Settings");
    assert.ok(
      sheet.includes('route: "/notifications/preferences"'),
      "keeps the destination the header bell used"
    );
  });
});
