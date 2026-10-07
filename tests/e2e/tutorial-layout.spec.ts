import { test, expect } from "@playwright/test"

const BASE_URL = "http://127.0.0.1:3045"

test.describe("Tutorial navigation, layout, and sidebar collapse", () => {
    test("308 permanent redirect from /courses/ to /tutorials/ preserving query params", async ({ request }) => {
        const response = await request.get(`${BASE_URL}/courses/agentic-engineering-zero-to-hero?tab=code&ref=test`, {
            maxRedirects: 0,
        })
        expect(response.status()).toBe(308)
        expect(response.headers()["location"]).toBe("/tutorials/agentic-engineering-zero-to-hero?tab=code&ref=test")
    })

    test("Desktop layout at 1280x800, 1440x900, 1920x1080 and mobile 390x844 with screenshots", async ({ page }) => {
        // 1. 1280x800 Desktop check
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.goto(`${BASE_URL}/tutorials/agentic-engineering-zero-to-hero`, { waitUntil: "networkidle" })

        // Assert breadcrumbs
        const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]')
        await expect(breadcrumbNav).toBeVisible()
        const breadcrumbText = await breadcrumbNav.innerText()
        console.log("Breadcrumb text:", breadcrumbText)
        expect(breadcrumbText).toContain("Tutorials")
        expect(breadcrumbText).not.toContain("Courses")

        // Assert sidebar is auto-collapsed on tutorial page (width <= 75px)
        const sidebar = page.locator("aside").first()
        const sidebarBox = await sidebar.boundingBox()
        console.log("Sidebar bounding box at 1280x800:", sidebarBox)
        expect(sidebarBox).not.toBeNull()
        expect(sidebarBox!.width).toBeLessThanOrEqual(75)

        // Assert no horizontal page overflow
        const overflow1280 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
        expect(overflow1280).toBe(true)

        // Capture tut-after-1280.png
        await page.screenshot({ path: "screenshots/tut-after-1280.png", fullPage: false })

        // 2. 1440x900 Desktop check
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.waitForTimeout(500)
        const overflow1440 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
        expect(overflow1440).toBe(true)
        await page.screenshot({ path: "screenshots/tut-after-1440.png", fullPage: false })

        // 3. 1920x1080 Desktop check
        await page.setViewportSize({ width: 1920, height: 1080 })
        await page.waitForTimeout(500)
        const overflow1920 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
        expect(overflow1920).toBe(true)
        await page.screenshot({ path: "screenshots/tut-after-1920.png", fullPage: false })

        // 4. Test manual toggle to expand sidebar on tutorial page
        const toggleBtn = page.locator('button[title*="Expand sidebar"], button[title*="Collapse sidebar"]').first()
        await toggleBtn.click()
        await page.waitForTimeout(500)

        const expandedBox = await sidebar.boundingBox()
        console.log("Expanded sidebar width:", expandedBox?.width)
        expect(expandedBox!.width).toBeGreaterThan(200)
        const overflowExpanded = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
        expect(overflowExpanded).toBe(true)
        await page.screenshot({ path: "screenshots/tut-sidebar-expanded.png", fullPage: false })

        // 5. Navigate to another page (e.g. /dashboard) and check sidebar returns to normal / uncollapsed
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" })
        const otherSidebarBox = await sidebar.boundingBox()
        console.log("Other page sidebar width:", otherSidebarBox?.width)
        await page.screenshot({ path: "screenshots/other-page-sidebar.png", fullPage: false })

        // 6. Mobile 390x844 check
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(`${BASE_URL}/tutorials/agentic-engineering-zero-to-hero`, { waitUntil: "networkidle" })
        const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
        console.log("Mobile overflow ok:", overflowMobile)
        expect(overflowMobile).toBe(true)
        await page.screenshot({ path: "screenshots/tut-after-mobile.png", fullPage: false })
    })

    test("Chapter switching inside tutorial page keeps URL the same", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.goto(`${BASE_URL}/tutorials/agentic-engineering-zero-to-hero`, { waitUntil: "networkidle" })

        const initialUrl = page.url()
        // Click on Chapter 1 button specifically
        const chapterTopicBtn = page.getByRole("button", { name: "CHAPTER 1 — What Is an AI" })
        await expect(chapterTopicBtn).toBeVisible()
        await chapterTopicBtn.click()
        await page.waitForTimeout(500)

        // URL must stay /tutorials/agentic-engineering-zero-to-hero
        expect(page.url()).toBe(initialUrl)

        // Verify lesson content rendered
        const lessonHeadline = page.locator("main h2")
        await expect(lessonHeadline).toBeVisible()
        const headlineText = await lessonHeadline.innerText()
        console.log("Rendered chapter headline:", headlineText)
    })
})
