import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { prisma, createActor, loginThroughUi, newNonce } from "./test-series-e2e-helpers"

test.describe("Axe Accessibility & Responsive Audit on UI-Created Courses", () => {
  let courses: { id: string; title: string; slug: string }[] = []
  let adminUser: any
  let nonce: string

  test.beforeAll(async () => {
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-axe-audit")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { selectedGoal: "general" },
    })

    const railway = await prisma.course.findFirst({
      where: { slug: { startsWith: "railway-ntpc" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true },
    })
    const upsc = await prisma.course.findFirst({
      where: { slug: { startsWith: "upsc-prelims-2027" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true },
    })
    const ibps = await prisma.course.findFirst({
      where: { slug: { startsWith: "ibps-po-mains" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true },
    })
    courses = [railway, upsc, ibps].filter(Boolean) as { id: string; title: string; slug: string }[]
  })

  test.afterAll(async () => {
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  const viewports = [
    { name: "mobile-360", width: 360, height: 780 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1280", width: 1280, height: 800 },
    { name: "wide-1920", width: 1920, height: 1080 },
  ]

  for (const vp of viewports) {
    test(`Responsive overflow check (${vp.name}) across all 3 UI courses (default + expanded)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      for (const course of courses) {
        await page.goto(`/courses/${course.slug}`)
        await page.waitForLoadState("networkidle")

        // 1. Default state overflow check
        let isOverflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        expect(
          isOverflowing,
          `Course ${course.slug} default state has horizontal scrollbar on ${vp.name}`
        ).toBe(false)

        // 2. Switch to Hindi mode
        const hindiBtn = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" }).locator("visible=true").first()
        if (await hindiBtn.isVisible()) {
          await hindiBtn.click()
        }

        // 3. Expand accordions & syllabus tabs
        const accordions = page.locator('button[aria-expanded="false"]')
        const count = await accordions.count()
        for (let i = 0; i < Math.min(count, 5); i++) {
          const btn = accordions.nth(i)
          if (await btn.isVisible()) {
            await btn.click().catch(() => {})
          }
        }

        // 4. Expanded state overflow check
        isOverflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        expect(
          isOverflowing,
          `Course ${course.slug} expanded state has horizontal scrollbar on ${vp.name}`
        ).toBe(false)
      }
    })
  }

  test("Axe accessibility audit on all 3 UI-created courses (default & expanded)", async ({ page }) => {
    for (const course of courses) {
      await page.goto(`/courses/${course.slug}`)
      await page.waitForLoadState("networkidle")

      // Audit default state
      const defaultScan = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()

      const seriousOrCritical = defaultScan.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      )

      console.log(`\n=== AXE AUDIT REPORT (Default): ${course.title} (/courses/${course.slug}) ===`)
      console.log(`Total Violations: ${defaultScan.violations.length}`)
      console.log(`Critical/Serious Violations: ${seriousOrCritical.length}`)
      for (const v of defaultScan.violations) {
        console.log(`- [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} instances)`)
      }

      expect(
        seriousOrCritical,
        `Expected 0 serious/critical Axe violations on ${course.slug} (default), but found ${seriousOrCritical.length}`
      ).toEqual([])

      // Switch to Hindi & expand accordions
      const hindiBtn = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" }).locator("visible=true").first()
      if (await hindiBtn.isVisible()) {
        await hindiBtn.click()
      }
      const accordions = page.locator('button[aria-expanded="false"]')
      const count = await accordions.count()
      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = accordions.nth(i)
        if (await btn.isVisible()) {
          await btn.click().catch(() => {})
        }
      }
      await page.waitForTimeout(300)

      // Audit expanded state
      const expandedScan = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()

      const expSeriousOrCritical = expandedScan.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      )

      console.log(`\n=== AXE AUDIT REPORT (Expanded Hindi): ${course.title} (/courses/${course.slug}) ===`)
      console.log(`Total Violations: ${expandedScan.violations.length}`)
      console.log(`Critical/Serious Violations: ${expSeriousOrCritical.length}`)
      for (const v of expandedScan.violations) {
        console.log(`- [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} instances)`)
        for (const node of v.nodes) {
          console.log(`    Target: ${node.target.join(", ")} | HTML: ${node.html}`)
        }
      }

      expect(
        expSeriousOrCritical,
        `Expected 0 serious/critical Axe violations on ${course.slug} (expanded), but found ${expSeriousOrCritical.length}`
      ).toEqual([])
    }
  })

  test("Axe accessibility & responsive audit on Studio Edit Page", async ({ page }) => {
    if (courses.length === 0) return
    await loginThroughUi(page, adminUser.email)
    const targetCourse = courses[0]

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(`/admin/courses/${targetCourse.id}/edit`)
      await page.waitForLoadState("networkidle")

      const isOverflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(
        isOverflowing,
        `Studio edit page for ${targetCourse.slug} has horizontal scrollbar on ${vp.name}`
      ).toBe(false)
    }

    // Axe audit on Studio Edit desktop
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/admin/courses/${targetCourse.id}/edit`)
    await page.waitForLoadState("networkidle")

    const studioScan = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()

    const studioSeriousOrCritical = studioScan.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    )

    console.log(`\n=== AXE AUDIT REPORT: Studio Edit Page (/admin/courses/${targetCourse.id}/edit) ===`)
    console.log(`Total Violations: ${studioScan.violations.length}`)
    console.log(`Critical/Serious Violations: ${studioSeriousOrCritical.length}`)
    for (const v of studioScan.violations) {
      console.log(`- [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} instances)`)
      for (const node of v.nodes.slice(0, 5)) {
        console.log(`    Target: ${node.target.join(", ")} | HTML: ${node.html}`)
      }
    }

    expect(
      studioSeriousOrCritical,
      `Expected 0 serious/critical Axe violations on Studio edit page, but found ${studioSeriousOrCritical.length}`
    ).toEqual([])
  })
})
