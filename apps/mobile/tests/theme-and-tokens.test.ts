import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TOKENS, LIGHT_THEME, DARK_THEME, COLOR_PALETTE, WEB_SOURCES } from "../src/theme/tokens";
import { Storage } from "../src/lib/storage";

describe("Phase 1: Design Tokens & Parity Citations", () => {
  it("P5: every visual token strictly cites its web file source", () => {
    assert.equal(WEB_SOURCES.tailwindConfig, "tailwind.config.ts");
    assert.equal(WEB_SOURCES.globalsCss, "app/globals.css");
    assert.equal(WEB_SOURCES.header, "components/layout/MobileAppHeader.tsx");
    assert.equal(WEB_SOURCES.drawer, "components/layout/MobileDrawer.tsx");
    assert.equal(WEB_SOURCES.profileSheet, "components/layout/MobileProfileSheet.tsx");
    assert.equal(WEB_SOURCES.bottomBar, "components/layout/MobileNativeBottomBar.tsx");
    assert.equal(WEB_SOURCES.themeProvider, "components/providers/ThemeProvider.tsx");
  });

  it("mirrors web shell layout dimensions exactly", () => {
    // Header is 56px sticky (MobileAppHeader.tsx#L47: h-14)
    assert.equal(TOKENS.dimensions.headerHeight, 56);

    // Bottom navigation bar is 60px (MobileNativeBottomBar.tsx#L101: h-15)
    assert.equal(TOKENS.dimensions.bottomBarHeight, 60);

    // Minimum touch target is 44px (MobileNativeBottomBar.tsx#L113: min-h-[44px])
    assert.equal(TOKENS.dimensions.minTouchTarget, 44);

    // Drawer is 80% width with 320px max (MobileDrawer.tsx#L72: w-4/5 max-w-xs)
    assert.equal(TOKENS.dimensions.drawerWidthPercent, "80%");
    assert.equal(TOKENS.dimensions.drawerMaxWidth, 320);
  });

  it("mirrors web brand color scale & dark mode parity", () => {
    // Brand primary is #1448d8 (tailwind.config.ts#L36)
    assert.equal(COLOR_PALETTE.teal[500], "#1448d8");
    assert.equal(LIGHT_THEME.primary, "#1448d8");

    // Dark mode primary is #60a5fa (tailwind.config.ts#L35)
    assert.equal(DARK_THEME.primary, "#60a5fa");

    // Pass active badge is emerald-700 #047857 (MobileNativeBottomBar.tsx#L126)
    assert.equal(COLOR_PALETTE.emerald[700], "#047857");
    assert.equal(LIGHT_THEME.passBadgeBg, "#047857");
    assert.equal(DARK_THEME.passBadgeBg, "#047857");

    // Notification dot is rose-500 #f43f5e (MobileAppHeader.tsx#L87)
    assert.equal(COLOR_PALETTE.rose[500], "#f43f5e");
    assert.equal(LIGHT_THEME.notificationDot, "#f43f5e");
    assert.equal(DARK_THEME.notificationDot, "#f43f5e");
  });

  it("verifies storage keys match web localStorage keys identically", () => {
    // Web uses "ts_theme" for theme choice (components/providers/ThemeProvider.tsx#L22)
    assert.equal(TOKENS.storageKeys.theme, "ts_theme");

    // Web uses "trillion_selected_goal" for target goal (components/providers/GoalProvider.tsx#L119)
    assert.equal(TOKENS.storageKeys.goal, "trillion_selected_goal");

    // Web uses "ts_content_language" for EN/HI language choice (MobileAppHeader.tsx#L29)
    assert.equal(TOKENS.storageKeys.contentLanguage, "ts_content_language");
  });
});

describe("Phase 1: Theme Persistence & Toggle Contract", () => {
  beforeEach(async () => {
    await Storage.deleteItem(TOKENS.storageKeys.theme);
  });

  it("persists theme preference to storage with ts_theme key", async () => {
    const initial = await Storage.getTheme();
    assert.equal(initial, null);

    await Storage.setTheme("dark");
    const saved = await Storage.getTheme();
    assert.equal(saved, "dark");

    await Storage.setTheme("light");
    const toggled = await Storage.getTheme();
    assert.equal(toggled, "light");
  });

  it("verifies Light Theme and Dark Theme color structures are complete and typed", () => {
    const requiredKeys: (keyof typeof LIGHT_THEME)[] = [
      "mode",
      "background",
      "surface",
      "surfaceSecondary",
      "headerBackground",
      "headerBorder",
      "bottomBarBackground",
      "bottomBarBorder",
      "bottomBarActive",
      "bottomBarInactive",
      "drawerBackdrop",
      "drawerBackground",
      "brandFrom",
      "brandTo",
      "textPrimary",
      "textSecondary",
      "textMuted",
      "border",
      "primary",
      "notificationDot",
      "passActiveBg",
      "passActiveText",
      "passUpgradeBg",
      "passBadgeBg",
      "success",
      "warning",
      "danger",
    ];

    for (const key of requiredKeys) {
      assert.ok(LIGHT_THEME[key] !== undefined, `LIGHT_THEME missing key: ${String(key)}`);
      assert.ok(DARK_THEME[key] !== undefined, `DARK_THEME missing key: ${String(key)}`);
    }

    assert.equal(LIGHT_THEME.mode, "light");
    assert.equal(DARK_THEME.mode, "dark");
  });
});
