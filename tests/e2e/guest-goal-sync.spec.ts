import { test, expect } from "@playwright/test";
import { prisma, createActor } from "./test-series-e2e-helpers";
import { UserRole } from "@prisma/client";

test.describe("Guest goal synchronization and series catalog", () => {
  test.beforeAll(async () => {
    let teacher = await prisma.user.findFirst({ where: { role: "TEACHER" } });
    if (!teacher) {
      teacher = await createActor("ggs", UserRole.TEACHER, "sync-teacher");
    }

    await prisma.examSeries.upsert({
      where: { slug: "pb-7391-s-pub" },
      update: { isPublished: true },
      create: {
        title: "PB-7391 S-PUB BPSC Prelims Test Series",
        slug: "pb-7391-s-pub",
        category: "BPSC",
        examName: "BPSC",
        isPublished: true,
        createdById: teacher.id,
        tests: {
          create: {
            title: "PB-7391 Published Test",
            isPublished: true,
            createdById: teacher.id,
          },
        },
      },
    });

    await prisma.examSeries.upsert({
      where: { slug: "pb-7391-s-legacy" },
      update: { isPublished: true },
      create: {
        title: "PB-7391 S-LEGACY Prelims Series",
        slug: "pb-7391-s-legacy",
        category: "UPSC",
        examName: "UPSC",
        isPublished: true,
        createdById: teacher.id,
        tests: {
          create: {
            title: "PB-7391 Legacy Test",
            isPublished: true,
            createdById: teacher.id,
          },
        },
      },
    });

    await prisma.examSeries.upsert({
      where: { slug: "pb-7391-s-unpub" },
      update: { isPublished: false },
      create: {
        title: "PB-7391 S-UNPUB BPSC Advanced Series",
        slug: "pb-7391-s-unpub",
        category: "BPSC",
        examName: "BPSC",
        isPublished: false,
        createdById: teacher.id,
      },
    });
  });

  test("stale cookie 'upsc,skills' + localStorage 'bpsc' must sync cookie and show BPSC series, includeAll must show all published series and never drafts", async ({ context, page }) => {
    // 1. Set stale cookie on the context
    await context.addCookies([
      {
        name: "trillion_selected_goal",
        value: "upsc,skills",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 2. Set localStorage before navigation
    await page.addInitScript(() => {
      window.localStorage.setItem("trillion_selected_goal", "bpsc");
    });

    // 3. Navigate to /test-series
    await page.goto("/test-series");
    await page.waitForLoadState("domcontentloaded");

    // 4. Verification: Guest must see published BPSC series (e.g. "PB-7391 S-PUB BPSC Prelims Test Series" or "BPSC Sectional Test Series")
    // and must NEVER see the draft BPSC series ("PB-7391 S-UNPUB BPSC Advanced Series")
    const pubBpscCard = page.locator("text=PB-7391 S-PUB BPSC Prelims Test Series").or(page.locator("text=BPSC Sectional Test Series"));
    await expect(pubBpscCard.first()).toBeVisible({ timeout: 25000 });

    const draftCard = page.locator("text=PB-7391 S-UNPUB BPSC Advanced Series");
    await expect(draftCard).toHaveCount(0);

    // 5. Check that cookie was synchronized from localStorage ('bpsc')
    const cookiesAfterHydrate = await context.cookies();
    const goalCookie = cookiesAfterHydrate.find((c) => c.name === "trillion_selected_goal");
    expect(goalCookie?.value).toBe("bpsc");

    // 6. Test includeAll=true: Calling /api/exam/series/list?includeAll=true returns both published BPSC and UPSC, never draft
    const includeAllRes = await page.request.get("/api/exam/series/list?includeAll=true");
    expect(includeAllRes.status()).toBe(200);
    const includeAllJson = await includeAllRes.json();
    const seriesList = includeAllJson.data || [];
    const slugs = seriesList.map((s: { slug: string }) => s.slug);

    // Must include published BPSC and published UPSC
    expect(slugs).toContain("pb-7391-s-pub");
    expect(slugs).toContain("pb-7391-s-legacy");
    // Must NEVER include draft
    expect(slugs).not.toContain("pb-7391-s-unpub");

    // 7. Test UI "Show all exam tests" action
    const showAllBtn = page.getByText("Show all exam tests →");
    if (await showAllBtn.isVisible()) {
      await showAllBtn.click();
      await page.waitForLoadState("networkidle");
      // Now both UPSC and BPSC series should be visible in the DOM
      await expect(page.locator("text=PB-7391 S-LEGACY Prelims Series").first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=PB-7391 S-UNPUB BPSC Advanced Series")).toHaveCount(0);
    }
  });
});
