import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { isBooksRoute } from "@/components/layout/layout-utils";

const topNavBarPath = path.resolve(__dirname, "../../components/layout/TopNavBar.tsx");
const leftSidebarPath = path.resolve(__dirname, "../../components/layout/LeftSidebar.tsx");
const dashboardShellPath = path.resolve(__dirname, "../../components/layout/DashboardShell.tsx");
const brandLogoLinkPath = path.resolve(__dirname, "../../components/layout/BrandLogoLink.tsx");

describe("Books Header Logo and Shared Route Wiring", () => {
  const topNavBarSource = fs.readFileSync(topNavBarPath, "utf-8");
  const leftSidebarSource = fs.readFileSync(leftSidebarPath, "utf-8");
  const dashboardShellSource = fs.readFileSync(dashboardShellPath, "utf-8");
  const brandLogoLinkSource = fs.readFileSync(brandLogoLinkPath, "utf-8");

  it("isBooksRoute accurately matches all /books routes and rejects non-books routes", () => {
    assert.strictEqual(isBooksRoute("/books"), true);
    assert.strictEqual(isBooksRoute("/books/cart"), true);
    assert.strictEqual(isBooksRoute("/books/orders"), true);
    assert.strictEqual(isBooksRoute("/books/wishlist"), true);
    assert.strictEqual(isBooksRoute("/books/sample-slug"), true);
    assert.strictEqual(isBooksRoute("/books/read/book-123"), true);

    assert.strictEqual(isBooksRoute("/dashboard"), false);
    assert.strictEqual(isBooksRoute("/courses"), false);
    assert.strictEqual(isBooksRoute("/tutorials"), false);
    assert.strictEqual(isBooksRoute("/"), false);
    assert.strictEqual(isBooksRoute(""), false);
    assert.strictEqual(isBooksRoute(null), false);
    assert.strictEqual(isBooksRoute(undefined), false);
  });

  it("BrandLogoLink component contains exact logo mark, wordmark, testids, and collapsed prop handling", () => {
    assert.ok(
      brandLogoLinkSource.includes('data-testid="brand-logo"'),
      "BrandLogoLink must render data-testid='brand-logo'"
    );
    assert.ok(
      brandLogoLinkSource.includes("BrandLogo"),
      "BrandLogoLink must render BrandLogo"
    );
    assert.ok(
      brandLogoLinkSource.includes("collapsed"),
      "BrandLogoLink must pass collapsed prop"
    );
  });

  it("TopNavBar imports and renders BrandLogoLink without duplicate brand-logo definitions", () => {
    assert.ok(
      topNavBarSource.includes("BrandLogoLink"),
      "TopNavBar must import and use BrandLogoLink"
    );
    assert.ok(
      !topNavBarSource.includes('data-testid="brand-logo"'),
      "TopNavBar must delegate brand-logo rendering to BrandLogoLink"
    );
  });

  it("DashboardShell and LeftSidebar share the same isBooksRoute helper", () => {
    assert.ok(
      dashboardShellSource.includes("isBooksRoute"),
      "DashboardShell must use isBooksRoute helper"
    );
    assert.ok(
      leftSidebarSource.includes("isBooksRoute"),
      "LeftSidebar must use isBooksRoute helper"
    );
    assert.ok(
      !dashboardShellSource.includes('pathname.startsWith("/books")'),
      "DashboardShell must not duplicate raw string check"
    );
    assert.ok(
      !leftSidebarSource.includes('pathname.startsWith("/books")'),
      "LeftSidebar must not duplicate raw string check"
    );
  });

  it("LeftSidebar adapts to top-0 / h-screen and mounts 60px logo header on books routes", () => {
    assert.ok(
      leftSidebarSource.includes("isBooksPage ? \"top-0 h-screen\" : \"top-[60px] h-[calc(100vh-60px)]\""),
      "LeftSidebar aside must toggle between top-0 and top-[60px]"
    );
    assert.ok(
      leftSidebarSource.includes("h-[60px]"),
      "LeftSidebar must render a 60px header"
    );
    assert.ok(
      leftSidebarSource.includes("border-b border-gray-200 dark:border-gray-800"),
      "LeftSidebar header must have border-b matching theme tokens"
    );
    assert.ok(
      leftSidebarSource.includes("<BrandLogoLink collapsed={effectiveCollapsed} />"),
      "LeftSidebar must pass collapsed state to BrandLogoLink"
    );
  });
});
