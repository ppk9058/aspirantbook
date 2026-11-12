import { test, expect } from "@playwright/test"
import { prisma } from "./test-series-e2e-helpers"

const nonce = `cdv2${Date.now()}`

async function createCourse(options: {
  slug: string
  title: string
  metadataJson: string
  withHindi?: boolean
}) {
  return prisma.course.create({
    data: {
      title: options.title,
      titleHi: options.withHindi ? "हिंदी शीर्षक" : null,
      slug: options.slug,
      description: "Course Studio v2 fixture course used by the browser regression check.",
      descriptionHi: options.withHindi ? "हिंदी विवरण" : null,
      difficulty: "BEGINNER",
      technology: "UPSC",
      status: "PUBLISHED",
      isPublished: true,
      price: 0,
      isPremium: false,
      metadataJson: options.metadataJson,
      chapters: {
        create: [
          {
            title: "Polity Foundation",
            titleHi: options.withHindi ? "राजनीति" : null,
            order: 1,
            lessons: {
              create: [
                {
                  title: "Lecture 1 — Constitution",
                  type: "VIDEO",
                  order: 1,
                  duration: 60,
                  scheduledAt: new Date("2026-11-02T09:30:00.000Z"),
                  isTrial: true,
                },
              ],
            },
          },
        ],
      },
    },
  })
}

test.describe("Course Studio v2 detail page", () => {
  test.afterAll(async () => {
    await prisma.course.deleteMany({ where: { slug: { contains: nonce } } })
    await prisma.$disconnect()
  })

  test("v2 course renders the new detail design, English and Hindi", async ({ page }) => {
    const course = await createCourse({
      slug: `${nonce}-v2`,
      title: `V2 Fixture ${nonce}`,
      withHindi: true,
      metadataJson: JSON.stringify({
        schemaVersion: 2,
        language: "ENGLISH",
        subtitle: "Complete GS foundation",
        subtitleHi: "संपूर्ण जीएस फाउंडेशन",
        heroMetrics: [{ value: "1", label: "Lectures", valueHi: "1", labelHi: "व्याख्यान" }],
        pillTags: ["UPSC", "GS"],
        aboutHighlights: ["Live classes with recordings"],
        aboutHighlightsHi: ["रिकॉर्डिंग के साथ लाइव कक्षाएं"],
        sections: { about: true, plan: true, syllabus: false, teachers: false, questions: false, lectures: true, callback: false },
        faqs: [],
      }),
    })

    await page.goto(`/courses/${course.slug}`, { waitUntil: "domcontentloaded" })

    // Hero + derived start label
    await expect(page.getByRole("heading", { level: 1, name: `V2 Fixture ${nonce}` })).toBeVisible()
    await expect(page.getByText("Complete GS foundation")).toBeVisible()

    // Sections that are enabled
    await expect(page.getByRole("heading", { name: "About this course" })).toBeVisible()
    await expect(page.getByText("Live classes with recordings")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Course plan" })).toBeVisible()
    await expect(page.locator("#plan").getByText("Polity Foundation").filter({ visible: true }).first()).toBeVisible()

    // Disabled sections stay out of the DOM
    await expect(page.getByRole("heading", { name: "Exam syllabus" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Your teachers" })).toHaveCount(0)

    // Hindi toggle swaps the hero to the Hindi twins
    await expect(async () => {
      await page.getByRole("button", { name: /हिन्दी|हिंदी/ }).click()
      await expect(page.getByRole("heading", { level: 1, name: "हिंदी शीर्षक" })).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 20_000 })
    await expect(page.getByText("संपूर्ण जीएस फाउंडेशन")).toBeVisible()
  })

  test("course without v2 metadata keeps the legacy detail view", async ({ page }) => {
    const course = await createCourse({
      slug: `${nonce}-legacy`,
      title: `Legacy Fixture ${nonce}`,
      metadataJson: JSON.stringify({ language: "HINGLISH" }),
    })

    await page.goto(`/courses/${course.slug}`, { waitUntil: "domcontentloaded" })

    // Legacy bundle view markers
    await expect(page.getByText("Syllabus & Video Lectures").first()).toBeVisible()
    await expect(page.getByText("About This Course").first()).toBeVisible()

    // The v2 shell must not appear
    await expect(page.getByRole("button", { name: /हिन्दी|हिंदी/ })).toHaveCount(0)
  })

  test("BPSC Mains Demolish course renders pixel-faithfully and captures screenshots", async ({ page }) => {
    // Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/courses/bpsc-mains-demolish", { waitUntil: "domcontentloaded" })

    // Hero verification
    await expect(page.getByRole("heading", { level: 1, name: /BPSC Mains Demolish Course/i })).toBeVisible()
    await expect(page.getByText("Taught by Abhimanyu Kumar").first()).toBeVisible()
    await expect(page.getByText("₹5,499").first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Enroll now/i }).first()).toBeVisible()
    await expect(page.getByText("Joining late?")).toBeVisible()

    // Course Plan snaking board
    await expect(page.getByRole("heading", { name: "Course plan" })).toBeVisible()
    await expect(page.getByText("History").first()).toBeVisible()
    await expect(page.getByText("Data Interpretation").first()).toBeVisible()
    await expect(page.getByText("72nd BPSC Mains").first()).toBeVisible()

    // Screenshot Desktop
    await page.screenshot({ path: "evidence/course-detail-v2-bpsc-desktop.png", fullPage: false })

    // Mobile Viewport (iPhone / 390px)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { level: 1, name: /BPSC Mains Demolish Course/i })).toBeVisible()
    await expect(page.locator(".lg\\:hidden").getByText("₹5,499").first()).toBeVisible()

    // Screenshot Mobile
    await page.screenshot({ path: "evidence/course-detail-v2-bpsc-mobile.png", fullPage: false })
  })

  test("SSC CGL Tier-2 Masterclass course renders non-BPSC layout and captures screenshots", async ({ page }) => {
    // Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/courses/ssc-cgl-tier-2-masterclass", { waitUntil: "domcontentloaded" })

    // Hero verification
    await expect(page.getByRole("heading", { level: 1, name: /SSC CGL Tier-2 Complete Masterclass/i })).toBeVisible()
    await expect(page.getByText("Sneha Sharma").first()).toBeVisible()
    await expect(page.getByText("₹2,999").first()).toBeVisible()

    // Course Plan units verification
    await expect(page.getByRole("heading", { name: "Course plan" })).toBeVisible()
    await expect(page.getByText("Mathematical Abilities").first()).toBeVisible()

    // Screenshot Desktop
    await page.screenshot({ path: "evidence/course-detail-v2-ssc-desktop.png", fullPage: false })

    // Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { level: 1, name: /SSC CGL Tier-2 Complete Masterclass/i })).toBeVisible()
    await expect(page.locator(".lg\\:hidden").getByText("₹2,999").first()).toBeVisible()

    // Screenshot Mobile
    await page.screenshot({ path: "evidence/course-detail-v2-ssc-mobile.png", fullPage: false })
  })
})
