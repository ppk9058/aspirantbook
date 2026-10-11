import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const BASE = process.env.BASE_URL || "http://127.0.0.1:3045";

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

const ts = Date.now();
const STUDENT_EMAIL = `drawer_student_${ts}@test.local`;
const PASSWORD = "Password123!";
const TUTORIAL_SLUG = "agentic-engineering-zero-to-hero";

let studentId = "";

const SCREENSHOT_DIR = path.join(process.cwd(), "test-results", "drawer-screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface ViewportProof {
  viewport: string;
  indexVisibleByDefault: string;
  menuButtonPresent: string;
  drawerOpensOnMenuTap: string;
  drawerClosesAfterChapterTap: string;
  openedChapterMatchesTapped: string;
  closesOnX: string;
  closesOnBackdrop: string;
  closesOnEscape: string;
  closesOnBack: string;
  msToOpen: number;
}

const proofRows: ViewportProof[] = [];

test.describe.serial("Mobile and Tablet Tutorial Chapter Index Off-Canvas Drawer Proof", () => {
  test.beforeAll(async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: STUDENT_EMAIL,
        password: hash,
        name: "Drawer Proof Student",
        role: "FREE",
      },
    });
    studentId = user.id;
  });

  test.afterAll(async () => {
    if (studentId) {
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // 1. Mobile (390x844)
  test("Mobile 390x844: Drawer behavior, close events, chapter selection, and screenshots", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    // Login
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"]').fill(STUDENT_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Open Tutorial (30+ chapters)
    await page.goto(`${BASE}/tutorials/${TUTORIAL_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Horizontal scroll check
    const hScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        hasDocHScroll: doc.scrollWidth > doc.clientWidth,
        hasBodyHScroll: body.scrollWidth > body.clientWidth,
      };
    });
    console.log(`[390x844] Horizontal scroll check: doc=${hScroll.docClientWidth}/${hScroll.docScrollWidth}, body=${hScroll.bodyClientWidth}/${hScroll.bodyScrollWidth}`);
    expect(hScroll.hasDocHScroll).toBe(false);
    expect(hScroll.hasBodyHScroll).toBe(false);

    // Screenshot 1: Closed state
    const closedScreenshotPath = path.join(SCREENSHOT_DIR, "tutorial-390x844-closed.png");
    await page.screenshot({ path: closedScreenshotPath, fullPage: false });
    console.log(`[SCREENSHOT] 390x844 Closed state: ${closedScreenshotPath}`);

    // Verify index is CLOSED by default on mobile
    const drawer = page.locator('aside[aria-label="Course Navigation"]');
    const isDrawerOpenDefault = await drawer.evaluate((el) => {
      return el.classList.contains("translate-x-0") && !el.classList.contains("-translate-x-full");
    });
    const desktopSidebar = page.locator('aside.hidden.lg\\:block');
    const isDesktopSidebarVisible = await desktopSidebar.isVisible();

    const indexVisibleByDefault = (isDrawerOpenDefault || isDesktopSidebarVisible) ? "yes" : "no";
    expect(indexVisibleByDefault).toBe("no");

    // Verify Index button is present (renamed from Menu)
    const indexBtn = page.locator('header button[aria-label="Index"]');
    const menuBtn = indexBtn;
    const isIndexBtnVisible = await indexBtn.isVisible();
    const menuButtonPresent = isIndexBtnVisible ? "yes" : "no";
    expect(menuButtonPresent).toBe("yes");
    await expect(indexBtn.getByText("Index")).toBeVisible();

    // Verify Download & Export button is REMOVED
    const downloadExportBtn = page.getByRole("button", { name: /download & export/i });
    expect(await downloadExportBtn.count()).toBe(0);

    // Test Open Drawer via Index tap + measure ms
    const t0 = Date.now();
    await indexBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    const msToOpen = Date.now() - t0;
    const drawerOpensOnMenuTap = "yes";

    // Screenshot 2: Open state
    const openScreenshotPath = path.join(SCREENSHOT_DIR, "tutorial-390x844-open.png");
    await page.screenshot({ path: openScreenshotPath, fullPage: false });
    console.log(`[SCREENSHOT] 390x844 Open state: ${openScreenshotPath}`);

    // Verify Drawer Header, Search, Overview, and Chapter items
    await expect(drawer.getByText("Course Navigation")).toBeVisible();
    await expect(drawer.getByPlaceholder("Search chapters or topics...")).toBeVisible();
    await expect(drawer.getByText("Course Overview & Roadmap")).toBeVisible();

    // Verify Close on X button
    const closeBtn = drawer.getByRole("button", { name: "Close navigation" });
    await closeBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const closesOnX = "yes";

    // Reopen & verify Close on Backdrop tap
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    const backdrop = page.locator('[data-testid="tutorial-drawer-backdrop"]');
    await backdrop.click({ position: { x: 350, y: 300 } });
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const closesOnBackdrop = "yes";

    // Reopen & verify Close on Escape key
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const closesOnEscape = "yes";

    // Reopen & verify Close on Browser Back button
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    await page.goBack();
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    // Verify page was NOT left
    expect(page.url()).toContain(TUTORIAL_SLUG);
    const closesOnBack = "yes";

    // Reopen & Select a chapter from later in the 30+ chapter list
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });

    // Find all chapter buttons in the drawer
    const drawerChapterButtons = drawer.locator("button.asp-nv");
    const totalChaptersInDrawer = await drawerChapterButtons.count();
    console.log(`[390x844] Total items in drawer: ${totalChaptersInDrawer}`);
    expect(totalChaptersInDrawer).toBeGreaterThanOrEqual(30);

    // Pick a chapter further down (index 15)
    const targetChapterBtn = drawerChapterButtons.nth(15);
    const targetTitleRaw = (await targetChapterBtn.innerText()).replace("✔", "").replace("🔒", "").trim();
    console.log(`[390x844] Tapping chapter index 15: "${targetTitleRaw}"`);

    await targetChapterBtn.click();

    // Verify drawer closed automatically
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const drawerClosesAfterChapterTap = "yes";

    // Verify opened chapter title in <h2> matches the tapped chapter
    const pageHeading = page.locator("main h2").first();
    await pageHeading.waitFor({ state: "visible", timeout: 5000 });
    const headingText = (await pageHeading.innerText()).trim();
    console.log(`[390x844] Rendered chapter heading: "${headingText}"`);

    const cleanedTargetTitle = targetTitleRaw.replace(/^\d+\.\s*/, "").trim();
    const openedChapterMatchesTapped = headingText.includes(cleanedTargetTitle) || cleanedTargetTitle.includes(headingText) ? "yes" : "no";
    expect(openedChapterMatchesTapped).toBe("yes");

    // Verify window scrolled to top (scrollY === 0 or < 50)
    const scrollY = await page.evaluate(() => window.scrollY);
    console.log(`[390x844] Window scrollY after chapter click: ${scrollY}`);
    expect(scrollY).toBeLessThan(100);

    // Reopen drawer to confirm active item highlight & active-item scroll
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    await page.waitForTimeout(300);

    const activeItem = drawer.locator("button.asp-nv.active");
    await expect(activeItem).toBeVisible();
    const activeText = (await activeItem.innerText()).trim();
    expect(activeText).toContain(cleanedTargetTitle);

    proofRows.push({
      viewport: "390x844",
      indexVisibleByDefault,
      menuButtonPresent,
      drawerOpensOnMenuTap,
      drawerClosesAfterChapterTap,
      openedChapterMatchesTapped,
      closesOnX,
      closesOnBackdrop,
      closesOnEscape,
      closesOnBack,
      msToOpen,
    });

    await context.close();
  });

  // 2. Tablet (768x1024)
  test("Tablet 768x1024: Drawer behavior, close events, chapter selection, and screenshots", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
    });
    const page = await context.newPage();

    // Login
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"]').fill(STUDENT_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Open Tutorial (30+ chapters)
    await page.goto(`${BASE}/tutorials/${TUTORIAL_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Horizontal scroll check
    const hScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        hasDocHScroll: doc.scrollWidth > doc.clientWidth,
        hasBodyHScroll: body.scrollWidth > body.clientWidth,
      };
    });
    expect(hScroll.hasDocHScroll).toBe(false);
    expect(hScroll.hasBodyHScroll).toBe(false);

    // Screenshot 1: Closed state
    const closedScreenshotPath = path.join(SCREENSHOT_DIR, "tutorial-768x1024-closed.png");
    await page.screenshot({ path: closedScreenshotPath, fullPage: false });
    console.log(`[SCREENSHOT] 768x1024 Closed state: ${closedScreenshotPath}`);

    // Verify index is CLOSED by default on tablet
    const drawer = page.locator('aside[aria-label="Course Navigation"]');
    const isDrawerOpenDefault = await drawer.evaluate((el) => {
      return el.classList.contains("translate-x-0") && !el.classList.contains("-translate-x-full");
    });
    const desktopSidebar = page.locator('aside.hidden.lg\\:block');
    const isDesktopSidebarVisible = await desktopSidebar.isVisible();

    const indexVisibleByDefault = (isDrawerOpenDefault || isDesktopSidebarVisible) ? "yes" : "no";
    expect(indexVisibleByDefault).toBe("no");

    // Verify Index button is present (renamed from Menu)
    const indexBtn = page.locator('header button[aria-label="Index"]');
    const menuBtn = indexBtn;
    const isIndexBtnVisible = await indexBtn.isVisible();
    const menuButtonPresent = isIndexBtnVisible ? "yes" : "no";
    expect(menuButtonPresent).toBe("yes");
    await expect(indexBtn.getByText("Index")).toBeVisible();

    // Verify Download & Export button is REMOVED
    const downloadExportBtn = page.getByRole("button", { name: /download & export/i });
    expect(await downloadExportBtn.count()).toBe(0);

    // Test Open Drawer via Index tap + measure ms
    const t0 = Date.now();
    await indexBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    const msToOpen = Date.now() - t0;
    const drawerOpensOnMenuTap = "yes";

    // Screenshot 2: Open state
    const openScreenshotPath = path.join(SCREENSHOT_DIR, "tutorial-768x1024-open.png");
    await page.screenshot({ path: openScreenshotPath, fullPage: false });
    console.log(`[SCREENSHOT] 768x1024 Open state: ${openScreenshotPath}`);

    // Close on X
    const closeBtn = drawer.getByRole("button", { name: "Close navigation" });
    await closeBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const closesOnX = "yes";

    // Close on Backdrop
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    const backdrop = page.locator('[data-testid="tutorial-drawer-backdrop"]');
    await backdrop.click({ position: { x: 500, y: 300 } });
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const closesOnBackdrop = "yes";

    // Close on Escape
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const closesOnEscape = "yes";

    // Close on Back
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });
    await page.goBack();
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    expect(page.url()).toContain(TUTORIAL_SLUG);
    const closesOnBack = "yes";

    // Reopen & Select Chapter
    await menuBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 });

    const drawerChapterButtons = drawer.locator("button.asp-nv");
    const targetChapterBtn = drawerChapterButtons.nth(8);
    const targetTitleRaw = (await targetChapterBtn.innerText()).replace("✔", "").replace("🔒", "").trim();
    console.log(`[768x1024] Tapping chapter index 8: "${targetTitleRaw}"`);

    await targetChapterBtn.click();
    await page.waitForSelector('aside[aria-label="Course Navigation"].-translate-x-full', { timeout: 3000 });
    const drawerClosesAfterChapterTap = "yes";

    const pageHeading = page.locator("main h2").first();
    await pageHeading.waitFor({ state: "visible", timeout: 5000 });
    const headingText = (await pageHeading.innerText()).trim();

    const cleanedTargetTitle = targetTitleRaw.replace(/^\d+\.\s*/, "").trim();
    const openedChapterMatchesTapped = headingText.includes(cleanedTargetTitle) || cleanedTargetTitle.includes(headingText) ? "yes" : "no";
    expect(openedChapterMatchesTapped).toBe("yes");

    proofRows.push({
      viewport: "768x1024",
      indexVisibleByDefault,
      menuButtonPresent,
      drawerOpensOnMenuTap,
      drawerClosesAfterChapterTap,
      openedChapterMatchesTapped,
      closesOnX,
      closesOnBackdrop,
      closesOnEscape,
      closesOnBack,
      msToOpen,
    });

    await context.close();
  });

  // 3. Desktop (1440x900)
  test("Desktop 1440x900: Layout identical to before, no Menu button, inline sidebar present", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // Login
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"]').fill(STUDENT_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Open Tutorial
    await page.goto(`${BASE}/tutorials/${TUTORIAL_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Horizontal scroll check
    const hScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        hasDocHScroll: doc.scrollWidth > doc.clientWidth,
        hasBodyHScroll: body.scrollWidth > body.clientWidth,
      };
    });
    expect(hScroll.hasDocHScroll).toBe(false);
    expect(hScroll.hasBodyHScroll).toBe(false);

    // DOM EVIDENCE AT 1440x900:
    // 1. Index button (renamed from Menu) is NOT rendered / visible
    const indexBtn = page.locator('header button[aria-label="Index"]');
    const isIndexBtnVisible = await indexBtn.isVisible();
    expect(isIndexBtnVisible).toBe(false);

    // 2. Download & Export button is REMOVED from desktop
    const downloadExportBtn = page.getByRole("button", { name: /download & export/i });
    expect(await downloadExportBtn.count()).toBe(0);

    // 3. Desktop sidebar is VISIBLE inline
    const desktopSidebar = page.locator('aside.hidden.lg\\:block');
    const isDesktopSidebarVisible = await desktopSidebar.isVisible();
    expect(isDesktopSidebarVisible).toBe(true);

    const sidebarBox = await desktopSidebar.boundingBox();
    console.log("\n================ DOM EVIDENCE AT 1440x900 ================");
    console.log(`Index button visible:     ${isIndexBtnVisible} (Expected: false)`);
    console.log(`Download/Export visible:  ${await downloadExportBtn.count() > 0} (Expected: false)`);
    console.log(`Desktop sidebar visible:  ${isDesktopSidebarVisible} (Expected: true)`);
    console.log(`Desktop sidebar width:    ${sidebarBox?.width}px (Expected: ~330px)`);
    console.log(`Desktop sidebar height:   ${sidebarBox?.height}px`);
    console.log("==========================================================\n");

    expect(sidebarBox?.width).toBeGreaterThanOrEqual(300);

    proofRows.push({
      viewport: "1440x900",
      indexVisibleByDefault: "yes",
      menuButtonPresent: "no",
      drawerOpensOnMenuTap: "no (desktop inline)",
      drawerClosesAfterChapterTap: "N/A (desktop inline)",
      openedChapterMatchesTapped: "N/A (desktop inline)",
      closesOnX: "N/A",
      closesOnBackdrop: "N/A",
      closesOnEscape: "N/A",
      closesOnBack: "N/A",
      msToOpen: 0,
    });

    await context.close();
  });

  test("Print Final Proof Table", async () => {
    console.log("\n==========================================================================================================================================================================");
    console.log("MOBILE & TABLET TUTORIAL CHAPTER INDEX DRAWER PROOF TABLE");
    console.log("==========================================================================================================================================================================");
    console.log(
      "Viewport".padEnd(12) + " | " +
      "Default Index".padEnd(14) + " | " +
      "Index Btn".padEnd(9) + " | " +
      "Opens on Index".padEnd(14) + " | " +
      "Closes on Tap".padEnd(14) + " | " +
      "Title Matches".padEnd(14) + " | " +
      "Closes (X/Backdrop/Esc/Back)".padEnd(28) + " | " +
      "ms to Open"
    );
    console.log("--------------------------------------------------------------------------------------------------------------------------------------------------------------------------");
    for (const r of proofRows) {
      const closeCol = r.viewport === "1440x900"
        ? "N/A (Desktop inline)"
        : `X:${r.closesOnX} / B:${r.closesOnBackdrop} / Esc:${r.closesOnEscape} / Back:${r.closesOnBack}`;
      console.log(
        r.viewport.padEnd(12) + " | " +
        r.indexVisibleByDefault.padEnd(14) + " | " +
        r.menuButtonPresent.padEnd(9) + " | " +
        r.drawerOpensOnMenuTap.padEnd(14) + " | " +
        r.drawerClosesAfterChapterTap.padEnd(14) + " | " +
        r.openedChapterMatchesTapped.padEnd(14) + " | " +
        closeCol.padEnd(28) + " | " +
        `${r.msToOpen}ms`
      );
    }
    console.log("==========================================================================================================================================================================\n");
  });
});
