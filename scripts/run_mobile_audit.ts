import { chromium, Browser, BrowserContext, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  fontScale200?: boolean;
}

const VIEWPORT_CONFIGS: ViewportConfig[] = [
  { name: "320x640", width: 320, height: 640 },
  { name: "360x740", width: 360, height: 740 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844_scaled200", width: 390, height: 844, fontScale200: true },
];

const USER_STATE_VIEWPORTS: ViewportConfig[] = [
  { name: "320x640", width: 320, height: 640 },
  { name: "390x844", width: 390, height: 844 },
  { name: "390x844_scaled200", width: 390, height: 844, fontScale200: true },
];

const THEMES: Array<"light" | "dark"> = ["light", "dark"];

export interface AuditViolation {
  category:
    | "SCROLL_OVERFLOW"
    | "ELEMENT_OVERFLOW"
    | "TEXT_TRUNCATION"
    | "BOTTOM_NAV_OVERLAP"
    | "AI_BUTTON_OVERLAP"
    | "COLOR_CONTRAST"
    | "VIEWPORT_META";
  pageUrl: string;
  viewport: string;
  theme: string;
  details: string;
  userState?: string;
}

async function getStorageStateForUser(
  browser: Browser,
  user: { email: string; rawPassword: string; role: string }
) {
  const loginContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await loginContext.addCookies([
    {
      name: "ts_demo_role",
      value: user.role === "TEACHER" ? "TEACHER" : "STUDENT",
      domain: "localhost",
      path: "/",
    },
  ]);
  const loginPage = await loginContext.newPage();
  await loginPage.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  const authStatus = await loginPage.evaluate(
    async ({ email, password }) => {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken,
          callbackUrl: "http://localhost:3000/dashboard",
          json: "true",
        }),
      });
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      return { status: res.status, user: sessionData?.user };
    },
    { email: user.email, password: user.rawPassword }
  );

  if (!authStatus.user?.id) {
    await loginContext.close();
    throw new Error(`Failed to log in test user: ${user.email} (status: ${authStatus.status})`);
  }

  const storage = await loginContext.storageState();
  await loginContext.close();
  return storage;
}

async function auditSinglePage({
  browser,
  storageState,
  pagePath,
  pageName,
  vp,
  theme,
  screenshotsDir,
  allViolations,
  userStateLabel,
}: {
  browser: Browser;
  storageState: any;
  pagePath: string;
  pageName: string;
  vp: ViewportConfig;
  theme: "light" | "dark";
  screenshotsDir: string;
  allViolations: AuditViolation[];
  userStateLabel: string;
}) {
  const runLabel = `${userStateLabel}: ${pageName} [${vp.name}, ${theme}]`;
  const context = await browser.newContext({
    storageState,
    viewport: { width: vp.width, height: vp.height },
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
  });

  // Inject theme and hide dev indicators / handle font scaling
  await context.addInitScript(
    ({ curTheme, isScale200 }) => {
      try {
        localStorage.setItem("ts_theme", curTheme);
        if (curTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch {}

      const style = document.createElement("style");
      style.textContent = `
        nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-overlay] { display: none !important; }
        ${isScale200 ? "html { font-size: 200% !important; }" : ""}
      `;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(style);
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          (document.head || document.documentElement)?.appendChild(style);
        });
      }
    },
    { curTheme: theme, isScale200: !!vp.fontScale200 }
  );

  const page = await context.newPage();

  try {
    await page.goto(`http://localhost:3000${pagePath}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400); // Allow layout settlement
  } catch (e: any) {
    console.error(`  ✖ Failed to navigate to ${pagePath}: ${e.message}`);
    allViolations.push({
      category: "SCROLL_OVERFLOW",
      pageUrl: pagePath,
      viewport: vp.name,
      theme,
      userState: userStateLabel,
      details: `Navigation timeout or error: ${e.message}`,
    });
    await context.close();
    return;
  }

  // a. Viewport meta check
  const metaViewport = await page
    .$eval('meta[name="viewport"]', (el) => el.getAttribute("content"))
    .catch(() => null);

  if (!metaViewport || !metaViewport.includes("width=device-width") || !metaViewport.includes("initial-scale=1")) {
    allViolations.push({
      category: "VIEWPORT_META",
      pageUrl: pagePath,
      viewport: vp.name,
      theme,
      userState: userStateLabel,
      details: `Invalid viewport meta: "${metaViewport}" (must contain width=device-width, initial-scale=1)`,
    });
  }

  // a. Strict documentElement scrollWidth vs clientWidth check (NEVER window.innerWidth)
  const scrollInfo = await page.evaluate(() => {
    const de = document.documentElement;
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      innerWidth: window.innerWidth,
    };
  });

  if (scrollInfo.scrollWidth > scrollInfo.clientWidth + 1) {
    allViolations.push({
      category: "SCROLL_OVERFLOW",
      pageUrl: pagePath,
      viewport: vp.name,
      theme,
      userState: userStateLabel,
      details: `document.documentElement.scrollWidth (${scrollInfo.scrollWidth}px) > clientWidth (${scrollInfo.clientWidth}px)`,
    });
  }

  // b. Element scan:
  //    - right > clientWidth + 1 unless inside [data-scroll-x]
  //    - text overflow hidden/clip without ellipsis/line-clamp where scrollWidth > clientWidth + 1
  const elementIssues = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const issues: string[] = [];

    const allElements = Array.from(document.querySelectorAll("*"));
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // Check right overflow
      if (rect.right > clientWidth + 1) {
        const inScrollX = el.closest("[data-scroll-x]");
        if (!inScrollX) {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : "";
          const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(" ") : "";
          const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
          const pTag = el.parentElement ? el.parentElement.tagName.toLowerCase() : "";
          const pCls = el.parentElement && typeof el.parentElement.className === "string" ? el.parentElement.className.split(" ").slice(0, 3).join(" ") : "";
          const container = el.closest("button, a, div")?.outerHTML?.slice(0, 120) || "";
          issues.push(
            `Element overflow: <${tag}${id} class="${cls}"> in <${pTag} class="${pCls}"> rect.right=${rect.right.toFixed(1)}px > clientWidth=${clientWidth}px [container: ${container.replace(/\s+/g, " ")}]`
          );
        }
      }

      // Check text element with overflow hidden/clip where scrollWidth > clientWidth + 1
      const hasDirectText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length > 0
      );
      const overflowVal = style.overflow + " " + style.overflowX;
      if (hasDirectText && (overflowVal.includes("hidden") || overflowVal.includes("clip"))) {
        if (el.scrollWidth > el.clientWidth + 1) {
          const isClamped = (style as any).webkitLineClamp && (style as any).webkitLineClamp !== "none";
          const hasEllipsis = style.textOverflow === "ellipsis";
          const cls = typeof el.className === "string" ? el.className : "";
          const hasClampOrTrunc = cls.includes("line-clamp") || cls.includes("truncate");
          const inScrollX = el.closest("[data-scroll-x]");
          if (!isClamped && !hasEllipsis && !hasClampOrTrunc && !inScrollX) {
            const tag = el.tagName.toLowerCase();
            const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
            issues.push(
              `Text clipped without ellipsis/clamp: <${tag}> scrollWidth=${el.scrollWidth}px > clientWidth=${el.clientWidth}px ("${text}")`
            );
          }
        }
      }
    }
    return issues;
  });

  for (const issue of elementIssues) {
    allViolations.push({
      category: issue.startsWith("Text") ? "TEXT_TRUNCATION" : "ELEMENT_OVERFLOW",
      pageUrl: pagePath,
      viewport: vp.name,
      theme,
      userState: userStateLabel,
      details: issue,
    });
  }

  // c. Overlap check:
  //    - scroll to bottom, last content element bottom <= top of bottom nav
  //    - AI floating button must not overlap any button, link or heading
  await page.evaluate(() => {
    const de = document.scrollingElement || document.documentElement || document.body;
    const maxScroll = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    window.scrollTo(0, maxScroll);
    if (de) de.scrollTop = maxScroll;
    const main = document.querySelector("main");
    if (main) main.scrollTop = main.scrollHeight;
  });
  await page.waitForTimeout(600);

  const overlapIssues = await page.evaluate(async () => {
    const issues: string[] = [];

    // Bottom nav overlap check
    const bottomNav =
      document.querySelector("[data-mobile-bottom-nav]") ||
      document.querySelector("nav.fixed.bottom-0") ||
      document.querySelector(".fixed.bottom-0");

    if (bottomNav) {
      const navStyle = window.getComputedStyle(bottomNav);
      if (navStyle.display !== "none" && navStyle.visibility !== "hidden") {
        const navRect = bottomNav.getBoundingClientRect();
        if (navRect.height > 0 && navRect.top < window.innerHeight) {
          const main = document.querySelector("main");
          if (main) {
            let maxBottom = 0;
            let deepestEl: Element | null = null;
            const contentTags = new Set(["button", "a", "input", "img", "svg", "p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "label", "li"]);

            const allDescendants = Array.from(main.querySelectorAll("*"));
            for (const desc of allDescendants) {
              const dStyle = window.getComputedStyle(desc);
              if (dStyle.display === "none" || dStyle.visibility === "hidden" || dStyle.position === "fixed") continue;
              const tag = desc.tagName.toLowerCase();
              const isContent = contentTags.has(tag) || (desc.children.length === 0 && (desc.textContent || "").trim().length > 0);
              if (!isContent) continue;
              const r = desc.getBoundingClientRect();
              if (r.height > 0 && r.bottom > maxBottom) {
                maxBottom = r.bottom;
                deepestEl = desc;
              }
            }
            if (maxBottom > navRect.top + 1) {
              const text = deepestEl ? (deepestEl.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30) : "";
              issues.push(
                `Bottom content covered by bottom nav: bottom (${maxBottom.toFixed(1)}px) > nav.top (${navRect.top.toFixed(1)}px) [scrollY=${window.scrollY}px, scrollHeight=${document.documentElement.scrollHeight}px] ("${text}")`
              );
            }
          }
        }
      }
    }

    // AI Floating button overlap check
    const aiButton =
      document.querySelector('button[aria-label*="AI"]') ||
      document.querySelector('button[aria-label*="Tutor"]') ||
      document.querySelector('button[aria-label*="Assistant"]');

    if (aiButton) {
      const aiStyle = window.getComputedStyle(aiButton);
      if (aiStyle.display !== "none" && aiStyle.visibility !== "hidden" && parseFloat(aiStyle.opacity || "1") > 0) {
        const aiRect = aiButton.getBoundingClientRect();
        if (aiRect.width > 0 && aiRect.height > 0) {
          const targets = Array.from(document.querySelectorAll("button, a, h1, h2, h3, h4, h5, h6"));
          for (const target of targets) {
            if (target === aiButton || aiButton.contains(target) || target.contains(aiButton)) continue;
            // Skip if target is inside bottom nav (AI button sits above bottom nav)
            if (target.closest("[data-mobile-bottom-nav]") || target.closest("nav.fixed.bottom-0")) continue;

            const tStyle = window.getComputedStyle(target);
            if (tStyle.display === "none" || tStyle.visibility === "hidden" || parseFloat(tStyle.opacity || "1") === 0) continue;
            const tRect = target.getBoundingClientRect();
            if (tRect.width === 0 || tRect.height === 0) continue;

            const overlaps = !(
              aiRect.right <= tRect.left ||
              aiRect.left >= tRect.right ||
              aiRect.bottom <= tRect.top ||
              aiRect.top >= tRect.bottom
            );
            if (overlaps) {
              const tag = target.tagName.toLowerCase();
              const text = (target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
              issues.push(
                `AI button overlaps <${tag}> "${text}" (AI: [${Math.round(aiRect.left)},${Math.round(aiRect.top)},${Math.round(aiRect.right)},${Math.round(aiRect.bottom)}] vs Target: [${Math.round(tRect.left)},${Math.round(tRect.top)},${Math.round(tRect.right)},${Math.round(tRect.bottom)}])`
              );
            }
          }
        }
      }
    }

    return issues;
  });

  for (const issue of overlapIssues) {
    allViolations.push({
      category: issue.includes("AI button") ? "AI_BUTTON_OVERLAP" : "BOTTOM_NAV_OVERLAP",
      pageUrl: pagePath,
      viewport: vp.name,
      theme,
      userState: userStateLabel,
      details: issue,
    });
  }

  // d. Contrast and a11y via @axe-core/playwright
  try {
    await page.evaluate(() => {
      document.querySelectorAll("nextjs-portal, [data-nextjs-dev-overlay], [data-nextjs-toast], #__next-build-watcher").forEach(el => el.remove());
    });

    const axeResults = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    for (const v of axeResults.violations) {
      for (const node of v.nodes) {
        const targetSelector = node.target.join(" > ");
        const snippet = node.html ? node.html.replace(/\s+/g, " ").slice(0, 80) : "";
        const reason = node.failureSummary ? node.failureSummary.split("\n")[0] : v.description;
        allViolations.push({
          category: "COLOR_CONTRAST",
          pageUrl: pagePath,
          viewport: vp.name,
          theme,
          userState: userStateLabel,
          details: `${targetSelector} - ${reason} (HTML: ${snippet})`,
        });
      }
    }
  } catch (e: any) {
    console.warn(`    ⚠ Axe color-contrast check failed to run on ${runLabel}: ${e.message}`);
  }

  // g. Save screenshot outside git
  const sanitizedState = userStateLabel.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const shotName = `${sanitizedState}_${pageName}_${vp.name}_${theme}.png`;
  const shotPath = path.join(screenshotsDir, shotName);
  await page.screenshot({ path: shotPath, fullPage: false });

  // Summary for this run
  const runViolations = allViolations.filter(
    (v) => v.pageUrl === pagePath && v.viewport === vp.name && v.theme === theme && v.userState === userStateLabel
  );
  if (runViolations.length === 0) {
    console.log(`  ✓ [PASS] ${runLabel} (0 defects)`);
  } else {
    console.log(`  ✖ [FAIL] ${runLabel}: ${runViolations.length} defect(s) detected`);
    for (const v of runViolations.slice(0, 3)) {
      console.log(`      • [${v.category}] ${v.details.slice(0, 100)}...`);
    }
    if (runViolations.length > 3) {
      console.log(`      ... and ${runViolations.length - 3} more`);
    }
  }

  await context.close();
}

async function auditTeacherCreateFlow({
  browser,
  storageState,
  vp,
  theme,
  screenshotsDir,
  allViolations,
}: {
  browser: Browser;
  storageState: any;
  vp: ViewportConfig;
  theme: "light" | "dark";
  screenshotsDir: string;
  allViolations: AuditViolation[];
}) {
  const runLabel = `teacher_test_create_interactive [${vp.name}, ${theme}]`;
  const pagePath = "/teacher/test-series/create";

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.width < 768,
    hasTouch: vp.width < 768,
    colorScheme: theme,
    storageState,
  });

  await context.addInitScript(
    ({ curTheme, isScale200 }) => {
      try {
        localStorage.setItem("theme", curTheme);
        if (curTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (e) {}

      const style = document.createElement("style");
      style.textContent = `
        nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-overlay] { display: none !important; }
        ${isScale200 ? "html { font-size: 200% !important; }" : ""}
      `;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(style);
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          (document.head || document.documentElement)?.appendChild(style);
        });
      }
    },
    { curTheme: theme, isScale200: !!vp.fontScale200 }
  );

  const page = await context.newPage();

  try {
    await page.goto(`http://localhost:3000${pagePath}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);

    // 1. Fill Step 1
    const titleInput = page.locator('input[placeholder*="72nd BPSC Prelims"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill("UPSC History Sectional Mock Test 2026");
    }
    const examNameInput = page.locator('input[placeholder*="UPSC CSE"]').first();
    if (await examNameInput.isVisible()) {
      await examNameInput.fill("UPSC CSE");
    }

    // Advance to Step 2
    const nextBtn1 = page.getByRole("button", { name: "Next", exact: true });
    if (await nextBtn1.isVisible()) {
      await nextBtn1.click();
      await page.waitForTimeout(400);
    }

    // Advance to Step 3
    const nextBtn2 = page.getByRole("button", { name: "Next", exact: true });
    if (await nextBtn2.isVisible()) {
      await nextBtn2.click();
      await page.waitForTimeout(400);
    }

    // In Step 3:
    // a. Open Bulk Import Modal and verify layout
    const bulkImportBtn = page.getByRole("button", { name: /Bulk Import/i });
    if (await bulkImportBtn.isVisible()) {
      await bulkImportBtn.click();
      await page.waitForTimeout(400);

      // Verify no horizontal overflow in modal
      const modalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      });
      if (modalOverflow) {
        allViolations.push({
          category: "SCROLL_OVERFLOW",
          pageUrl: `${pagePath}#bulk-import`,
          viewport: vp.name,
          theme,
          userState: "TEACHER",
          details: `Bulk Import modal caused root scrollWidth overflow`,
        });
      }

      // Perform file upload test with Gemini JSON
      const sampleJson = {
        questions: [
          {
            id: 1,
            topic: "Ancient History: Harappan Craft Production",
            question: "Consider the following statements regarding Harappan crafts:\nI. Chanhudaro was dedicated to bead-making.\nII. Carnelian was obtained from Lothal.",
            options: {
              A: "I only",
              B: "II only",
              C: "Both I and II",
              D: "Neither I nor II"
            },
            correct_answer: "C",
            explanation: "Both statements are correct according to standard historical texts."
          }
        ]
      };
      const tmpJsonPath = path.join(screenshotsDir, `temp_import_${Date.now()}.json`);
      fs.writeFileSync(tmpJsonPath, JSON.stringify(sampleJson, null, 2));

      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fileInput.setInputFiles(tmpJsonPath);
        await page.waitForTimeout(500);
      }
      try { fs.unlinkSync(tmpJsonPath); } catch (e) {}

      // Close modal
      const closeBtn = page.getByRole("button", { name: "Close bulk import modal" }).or(page.locator('.fixed.inset-0 button:has(svg)').first());
      if (await closeBtn.isVisible()) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(300);
      }
    }

    // b. Enter long English and Hindi text in Question 1
    const engTextarea = page.locator('textarea[placeholder*="Type the question in English"]').first();
    if (await engTextarea.isVisible()) {
      await engTextarea.fill(
        "Critically evaluate the socio-economic impact of the British Land Revenue settlements—namely the Permanent Settlement, the Ryotwari System, and the Mahalwari System—on the traditional agrarian structure of nineteenth-century India."
      );
    }
    const hiTextarea = page.locator('textarea[placeholder*="प्रश्न हिंदी में"], textarea[placeholder*="उत्तर की व्याख्या"]').first();
    if (await hiTextarea.isVisible()) {
      await hiTextarea.fill(
        "उन्नीसवीं शताब्दी के भारत में ब्रिटिश भू-राजस्व नीतियों (स्थायी बंदोबस्त, रैयतवाड़ी प्रणाली और महालवाड़ी प्रणाली) के पारंपरिक कृषि संरचना, कृषक वर्ग और ग्रामीण अर्थव्यवस्था पर पड़े सामाजिक-आर्थिक प्रभावों का आलोचनात्मक मूल्यांकन कीजिए।"
      );
    }

    await page.waitForTimeout(400);

    // c. Run mobile audit assertions on Step 3
    const scrollInfo = await page.evaluate(() => {
      const de = document.documentElement;
      return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth };
    });
    if (scrollInfo.scrollWidth > scrollInfo.clientWidth + 1) {
      allViolations.push({
        category: "SCROLL_OVERFLOW",
        pageUrl: `${pagePath}#step3`,
        viewport: vp.name,
        theme,
        userState: "TEACHER",
        details: `Step 3 document.documentElement.scrollWidth (${scrollInfo.scrollWidth}px) > clientWidth (${scrollInfo.clientWidth}px)`,
      });
    }

    const elementIssues = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const issues: string[] = [];
      const allElements = Array.from(document.querySelectorAll("*"));
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right > clientWidth + 1) {
          const inScrollX = el.closest("[data-scroll-x]");
          if (!inScrollX) {
            const tag = el.tagName.toLowerCase();
            const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(" ") : "";
            issues.push(`Element overflow: <${tag} class="${cls}"> rect.right=${rect.right.toFixed(1)}px > clientWidth=${clientWidth}px`);
          }
        }
      }
      return issues;
    });

    for (const issue of elementIssues) {
      allViolations.push({
        category: "ELEMENT_OVERFLOW",
        pageUrl: `${pagePath}#step3`,
        viewport: vp.name,
        theme,
        userState: "TEACHER",
        details: issue,
      });
    }

    // Take screenshot
    const shotName = `teacher_create_interactive_${vp.name}_${theme}.png`;
    const shotPath = path.join(screenshotsDir, shotName);
    await page.screenshot({ path: shotPath, fullPage: false });

    const createViolations = allViolations.filter(
      (v) => v.pageUrl.includes(pagePath) && v.viewport === vp.name && v.theme === theme && v.userState === "TEACHER"
    );
    if (createViolations.length === 0) {
      console.log(`  ✓ [PASS] ${runLabel} (0 defects)`);
    } else {
      console.log(`  ✖ [FAIL] ${runLabel}: ${createViolations.length} defect(s) detected`);
      for (const v of createViolations.slice(0, 3)) {
        console.log(`      • [${v.category}] ${v.details.slice(0, 100)}...`);
      }
    }
  } catch (e: any) {
    console.error(`  ✖ Failed ${runLabel}: ${e.message}`);
    allViolations.push({
      category: "SCROLL_OVERFLOW",
      pageUrl: pagePath,
      viewport: vp.name,
      theme,
      userState: "TEACHER",
      details: `Exception: ${e.message}`,
    });
  } finally {
    await context.close();
  }
}

async function runMobileAudit() {
  console.log("======================================================================");
  console.log("STRICT REAL-BROWSER MOBILE UI/UX AUDIT (PHASE 6)");
  console.log("======================================================================\n");

  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const runId = "audit_" + Date.now();
  const createdUsers: string[] = [];
  let testSeries: any = null;
  let browser: Browser | null = null;
  const allViolations: AuditViolation[] = [];

  try {
    // 1. Setup isolated database data
    console.log("1. Setting up isolated test records in DB...");
    const rawPassword = `Audit_${crypto.randomUUID()}!`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Create student user with active yearly subscription & payment history
    const activeStudent = await prisma.user.create({
      data: {
        email: `student_${runId}@internal.test`,
        name: "Audit Student",
        role: "PREMIUM",
        password: passwordHash,
        subscriptions: {
          create: {
            plan: "YEARLY",
            status: "ACTIVE",
            provider: "RAZORPAY",
            providerId: `sub_${runId}`,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          },
        },
        payments: {
          create: {
            amount: 4999,
            currency: "INR",
            status: "COMPLETED",
            paymentProvider: "RAZORPAY",
          },
        },
      },
    });
    createdUsers.push(activeStudent.id);
    console.log(`✓ Student created with ACTIVE YEARLY subscription: ${activeStudent.email}`);

    // Create faculty user
    const teacherUser = await prisma.user.create({
      data: {
        email: `teacher_${runId}@internal.test`,
        name: "Audit Faculty",
        role: "TEACHER",
        password: passwordHash,
      },
    });
    createdUsers.push(teacherUser.id);

    // Create test series
    testSeries = await prisma.examSeries.create({
      data: {
        id: "cuid_series_" + runId,
        slug: "audit-series-" + runId,
        title: "Civil Services Mobile Audit Series 2026",
        category: "Civil Services",
        examName: "UPSC",
        isFree: true,
        isPro: false,
        isPublished: true,
        createdById: teacherUser.id,
      },
    });

    // 2. Launch Chromium Browser
    console.log("2. Launching Playwright Chromium browser...");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // 3. Log in primary student
    console.log("3. Logging in primary active student...");
    const activeStorage = await getStorageStateForUser(browser, {
      email: activeStudent.email,
      rawPassword,
      role: "STUDENT",
    });
    console.log("✓ Login successful, active subscriber session captured.\n");

    // 4. Define pages to audit for primary run
    const mode = process.env.AUDIT_MODE || "target"; // "target" or "all"
    let pagesToAudit: Array<{ path: string; name: string }> = [
      { path: "/subscription", name: "subscription" },
      { path: `/test-series/bpsc-72nd-2026`, name: "test_series_detail_bpsc" },
      { path: "/test-series", name: "test_series_hub" },
      { path: "/my-tests", name: "my_tests" },
      { path: "/courses", name: "courses" },
      { path: "/courses/72nd-bpsc-prelims-current-affairs", name: "course_detail_bpsc" },
      { path: "/courses/72nd-bpsc-prelims-current-affairs/learn/cmui8hds90004xpacc9bropjd", name: "course_watch_bpsc" },
    ];

    if (process.env.AUDIT_PAGES) {
      const pageList = process.env.AUDIT_PAGES.split(",").map((p) => p.trim());
      const allKnown = [
        { path: "/subscription", name: "subscription" },
        { path: `/test-series/bpsc-72nd-2026`, name: "test_series_detail_bpsc" },
        { path: "/test-series", name: "test_series_hub" },
        { path: "/my-tests", name: "my_tests" },
        { path: "/courses", name: "courses" },
        { path: "/courses/72nd-bpsc-prelims-current-affairs", name: "course_detail_bpsc" },
        { path: "/courses/72nd-bpsc-prelims-current-affairs/learn/cmui8hds90004xpacc9bropjd", name: "course_watch_bpsc" },
        { path: "/", name: "dashboard_home" },
        { path: "/my-learning", name: "my_learning" },
        { path: "/tracks", name: "tracks" },
        { path: "/books", name: "books" },
        { path: "/pyqs", name: "pyqs" },
        { path: "/search", name: "search" },
        { path: "/profile", name: "profile" },
        { path: "/settings", name: "settings" },
      ];
      pagesToAudit = allKnown.filter((k) => pageList.includes(k.path) || pageList.includes(k.name));
    } else if (mode === "all") {
      pagesToAudit.push(
        { path: "/", name: "dashboard_home" },
        { path: "/my-learning", name: "my_learning" },
        { path: "/tracks", name: "tracks" },
        { path: "/books", name: "books" },
        { path: "/pyqs", name: "pyqs" },
        { path: "/search", name: "search" },
        { path: "/profile", name: "profile" },
        { path: "/settings", name: "settings" }
      );
    }

    console.log(`4. Running strict primary audit across ${pagesToAudit.length} pages, ${VIEWPORT_CONFIGS.length} viewports, 2 themes...`);

    for (const pageItem of pagesToAudit) {
      console.log(`\n======================================================`);
      console.log(`AUDITING PRIMARY PAGE: ${pageItem.path} (${pageItem.name})`);
      console.log(`======================================================`);

      for (const vp of VIEWPORT_CONFIGS) {
        for (const theme of THEMES) {
          await auditSinglePage({
            browser,
            storageState: activeStorage,
            pagePath: pageItem.path,
            pageName: pageItem.name,
            vp,
            theme,
            screenshotsDir,
            allViolations,
            userStateLabel: "ACTIVE",
          });
        }
      }
    }

    // 5. Diverse User States Audit (FREE, EXPIRED, NEW/EMPTY, TEACHER)
    const runDiverseStates = process.env.AUDIT_DIVERSE_STATES !== "false";
    if (runDiverseStates) {
      console.log("\n======================================================================");
      console.log("5. AUDITING DIVERSE USER STATES (FREE, EXPIRED, NEW/EMPTY, TEACHER)");
      console.log("   Viewports: 320x640, 390x844, 390x844_scaled200 | Themes: light, dark");
      console.log("======================================================================\n");

      // a. FREE student (no subscription)
      const freeStudent = await prisma.user.create({
        data: {
          email: `free_${runId}@internal.test`,
          name: "Free Student",
          role: "FREE",
          password: passwordHash,
        },
      });
      createdUsers.push(freeStudent.id);
      const freeStorage = await getStorageStateForUser(browser, {
        email: freeStudent.email,
        rawPassword,
        role: "STUDENT",
      });
      console.log(`✓ FREE Student logged in: ${freeStudent.email}`);

      const freePages = [
        { path: "/subscription", name: "subscription" },
        { path: "/test-series", name: "test_series_hub" },
        { path: "/test-series/bpsc-72nd-2026", name: "test_series_detail_bpsc" },
        { path: "/courses", name: "courses" },
        { path: "/courses/72nd-bpsc-prelims-current-affairs", name: "course_detail_bpsc" },
      ];
      for (const pageItem of freePages) {
        for (const vp of USER_STATE_VIEWPORTS) {
          for (const theme of THEMES) {
            await auditSinglePage({
              browser,
              storageState: freeStorage,
              pagePath: pageItem.path,
              pageName: pageItem.name,
              vp,
              theme,
              screenshotsDir,
              allViolations,
              userStateLabel: "FREE",
            });
          }
        }
      }

      // b. EXPIRED student (subscription with past end date)
      const expiredStudent = await prisma.user.create({
        data: {
          email: `expired_${runId}@internal.test`,
          name: "Expired Student",
          role: "FREE",
          password: passwordHash,
          subscriptions: {
            create: {
              plan: "YEARLY",
              status: "EXPIRED",
              provider: "RAZORPAY",
              providerId: `sub_exp_${runId}`,
              startDate: new Date(Date.now() - 370 * 24 * 3600 * 1000),
              endDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
            },
          },
        },
      });
      createdUsers.push(expiredStudent.id);
      const expiredStorage = await getStorageStateForUser(browser, {
        email: expiredStudent.email,
        rawPassword,
        role: "STUDENT",
      });
      console.log(`✓ EXPIRED Student logged in: ${expiredStudent.email}`);

      const expiredPages = [
        { path: "/subscription", name: "subscription" },
        { path: "/test-series", name: "test_series_hub" },
      ];
      for (const pageItem of expiredPages) {
        for (const vp of USER_STATE_VIEWPORTS) {
          for (const theme of THEMES) {
            await auditSinglePage({
              browser,
              storageState: expiredStorage,
              pagePath: pageItem.path,
              pageName: pageItem.name,
              vp,
              theme,
              screenshotsDir,
              allViolations,
              userStateLabel: "EXPIRED",
            });
          }
        }
      }

      // c. NEW/EMPTY student (no enrollments, no attempts)
      const emptyStudent = await prisma.user.create({
        data: {
          email: `empty_${runId}@internal.test`,
          name: "Empty Student",
          role: "FREE",
          password: passwordHash,
        },
      });
      createdUsers.push(emptyStudent.id);
      const emptyStorage = await getStorageStateForUser(browser, {
        email: emptyStudent.email,
        rawPassword,
        role: "STUDENT",
      });
      console.log(`✓ NEW/EMPTY Student logged in: ${emptyStudent.email}`);

      const emptyPages = [
        { path: "/my-tests", name: "my_tests" },
        { path: "/subscription", name: "subscription" },
      ];
      for (const pageItem of emptyPages) {
        for (const vp of USER_STATE_VIEWPORTS) {
          for (const theme of THEMES) {
            await auditSinglePage({
              browser,
              storageState: emptyStorage,
              pagePath: pageItem.path,
              pageName: pageItem.name,
              vp,
              theme,
              screenshotsDir,
              allViolations,
              userStateLabel: "NEW_EMPTY",
            });
          }
        }
      }

      // d. TEACHER user
      const teacherStorage = await getStorageStateForUser(browser, {
        email: teacherUser.email,
        rawPassword,
        role: "TEACHER",
      });
      console.log(`✓ TEACHER user logged in: ${teacherUser.email}`);

      const teacherPages = [
        { path: "/teacher/test-series", name: "teacher_studio" },
        { path: "/teacher/test-series/bpsc-sectional-5q/submissions", name: "teacher_submissions" },
        { path: "/teacher/test-series/create", name: "teacher_create_initial" },
      ];
      for (const pageItem of teacherPages) {
        for (const vp of USER_STATE_VIEWPORTS) {
          for (const theme of THEMES) {
            await auditSinglePage({
              browser,
              storageState: teacherStorage,
              pagePath: pageItem.path,
              pageName: pageItem.name,
              vp,
              theme,
              screenshotsDir,
              allViolations,
              userStateLabel: "TEACHER",
            });
          }
        }
      }

      console.log("\nAuditing Teacher Test Authoring Studio with JSON import & bilingual questions...");
      for (const vp of USER_STATE_VIEWPORTS) {
        for (const theme of THEMES) {
          await auditTeacherCreateFlow({
            browser,
            storageState: teacherStorage,
            vp,
            theme,
            screenshotsDir,
            allViolations,
          });
        }
      }
    }

    // ── Print Final Summary ──────────────────────────────────────────
    console.log("\n======================================================================");
    console.log("MOBILE AUDIT EXECUTION SUMMARY");
    console.log("======================================================================");
    console.log(`Total defects found: ${allViolations.length}`);

    const byCategory: Record<string, number> = {};
    for (const v of allViolations) {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(byCategory)) {
      console.log(`  • ${cat}: ${count}`);
    }

    if (allViolations.length > 0) {
      console.log("\nDETAILED DEFECT LOG (First 50, prioritized non-contrast):");
      const sorted = [...allViolations].sort((a, b) => {
        if (a.category === "COLOR_CONTRAST" && b.category !== "COLOR_CONTRAST") return 1;
        if (a.category !== "COLOR_CONTRAST" && b.category === "COLOR_CONTRAST") return -1;
        return 0;
      });
      sorted.slice(0, 50).forEach((v, idx) => {
        console.log(`[#${idx + 1}] [${v.category}] [${v.userState || "ACTIVE"}] ${v.pageUrl} | ${v.viewport} | ${v.theme}`);
        console.log(`    ${v.details}`);
      });
    }

    console.log("======================================================================\n");

    if (process.env.STRICT_EXIT === "true" && allViolations.length > 0) {
      throw new Error(`Audit failed with ${allViolations.length} defects!`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }

    console.log("Cleaning up audit test records from DB...");
    for (const uId of createdUsers) {
      await prisma.payment.deleteMany({ where: { userId: uId } }).catch(() => {});
      await prisma.subscription.deleteMany({ where: { userId: uId } }).catch(() => {});
      await prisma.user.delete({ where: { id: uId } }).catch(() => {});
      console.log(`  Deleted user ${uId}`);
    }
    if (testSeries) {
      await prisma.examSeries.delete({ where: { id: testSeries.id } }).catch(() => {});
      console.log(`  Deleted testSeries ${testSeries.id}`);
    }
    console.log("Cleanup complete.\n");
  }
}

runMobileAudit().catch((err) => {
  console.error("FATAL ERROR in runMobileAudit:", err);
  process.exit(1);
});
