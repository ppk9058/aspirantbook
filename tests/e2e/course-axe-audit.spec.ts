import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { prisma } from "./test-series-e2e-helpers"

test.describe("Axe Accessibility & Responsive Audit on UI-Created Courses", () => {
  let courses: { id: string; title: string; slug: string }[] = []

  test.beforeAll(async () => {
    await prisma.$connect()
    courses = await prisma.course.findMany({
      where: {
        slug: {
          in: [
            "railway-ntpc-e2e-20261104231534109-hkkdi",
            "upsc-prelims-2027-e2e-20261104231534109-hkkdi",
            "ibps-po-mains-e2e-20261104231534109-hkkdi",
          ],
        },
      },
      select: { id: true, title: true, slug: true },
      orderBy: { createdAt: "desc" },
    })
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  const viewports = [
    { name: "mobile-360", width: 360, height: 780 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1280", width: 1280, height: 800 },
    { name: "wide-1920", width: 1920, height: 1080 },
  ]

  for (const vp of viewports) {
    test(`Responsive overflow check (${vp.name}) across all 3 UI courses`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      for (const course of courses) {
        await page.goto(`/courses/${course.slug}`)
        await page.waitForLoadState("networkidle")

        const isOverflowing = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth
        })
        expect(
          isOverflowing,
          `Course ${course.slug} has horizontal scrollbar on ${vp.name} (scrollWidth > innerWidth)`
        ).toBe(false)
      }
    })
  }

  test("Axe accessibility audit on all 3 UI-created courses", async ({ page }) => {
    for (const course of courses) {
      await page.goto(`/courses/${course.slug}`)
      await page.waitForLoadState("networkidle")

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()

      const seriousOrCritical = accessibilityScanResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      )

      console.log(`\n=== AXE AUDIT REPORT: ${course.title} (/courses/${course.slug}) ===`)
      console.log(`Total Violations: ${accessibilityScanResults.violations.length}`)
      console.log(`Critical/Serious Violations: ${seriousOrCritical.length}`)

      for (const v of accessibilityScanResults.violations) {
        console.log(`- [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} instances)`)
      }

      expect(
        seriousOrCritical,
        `Expected 0 serious/critical Axe violations on ${course.slug}, but found ${seriousOrCritical.length}`
      ).toEqual([])
    }
  })
})
