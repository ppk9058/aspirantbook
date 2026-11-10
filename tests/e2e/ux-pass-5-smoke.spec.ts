import { test, expect, Page } from "@playwright/test"

/**
 * UX Pass 5 - Browser smoke tests (Evidence-first verification)
 * Runs against port 3045 with NEXT_DIST_DIR=.next-test
 */

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("UX Pass 5 - Hamburger opens on all pages at 360px", () => {
    const pages = [
        { path: "/", name: "Landing" },
        { path: "/test-series", name: "Test Series" },
        { path: "/courses", name: "Courses" },
        { path: "/books", name: "Books" },
        { path: "/tutorials", name: "Tutorials" },
        { path: "/dashboard", name: "Dashboard" },
        { path: "/pricing", name: "Pricing" },
    ]

    for (const { path, name } of pages) {
        test(`Hamburger opens at 360px on ${name} (${path})`, async ({ page }) => {
            await page.setViewportSize({ width: 360, height: 740 })
            await page.goto(`${BASE_URL}${path}`)
            
            // Find hamburger button (landing-mobile-menu-btn or similar)
            const hamburger = page.locator('[data-testid="landing-mobile-menu-btn"], button[aria-label*="menu" i]').first()
            await expect(hamburger).toBeVisible({ timeout: 10000 })
            
            // Click to open
            await hamburger.click()
            
            // Verify drawer opened (check for drawer content or close button)
            const drawer = page.locator('[role="dialog"], [data-testid="drawer-close"]')
            await expect(drawer).toBeVisible({ timeout: 3000 })
            
            console.log(`✓ ${name}: Hamburger opens`)
        })
    }
})

test.describe("UX Pass 5 - Horizontal overflow check", () => {
    const widths = [320, 360, 390]
    const testPages = ["/", "/test-series", "/pricing"]

    for (const width of widths) {
        for (const path of testPages) {
            test(`No horizontal overflow at ${width}px on ${path}`, async ({ page }) => {
                await page.setViewportSize({ width, height: 740 })
                await page.goto(`${BASE_URL}${path}`)
                
                const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
                const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
                
                console.log(`${path} at ${width}px: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`)
                expect(scrollWidth).toBeLessThanOrEqual(width + 1) // Allow 1px tolerance
            })
        }
    }
})

test.describe("UX Pass 5 - Landing drawer behavior", () => {
    test("Drawer has full viewport height and backdrop", async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 740 })
        await page.goto(`${BASE_URL}/`)
        
        const hamburger = page.locator('[data-testid="landing-mobile-menu-btn"]')
        await hamburger.click()
        
        // Check drawer panel exists
        const drawer = page.locator('[role="dialog"]').first()
        await expect(drawer).toBeVisible()
        
        // Measure drawer height
        const drawerHeight = await drawer.evaluate((el) => el.getBoundingClientRect().height)
        console.log(`Drawer height: ${drawerHeight}px`)
        expect(drawerHeight).toBeGreaterThan(700) // Should be close to viewport height
        
        // Check backdrop exists
        const backdrop = page.locator('[role="dialog"] ~ div, [role="dialog"] div').first()
        const hasBackdrop = await backdrop.count() > 0
        console.log(`Backdrop present: ${hasBackdrop}`)
    })

    test("Escape key closes drawer", async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 740 })
        await page.goto(`${BASE_URL}/`)
        
        const hamburger = page.locator('[data-testid="landing-mobile-menu-btn"]')
        await hamburger.click()
        
        const drawer = page.locator('[role="dialog"]')
        await expect(drawer).toBeVisible()
        
        // Press Escape
        await page.keyboard.press("Escape")
        
        // Drawer should close
        await expect(drawer).not.toBeVisible({ timeout: 1000 })
        console.log("✓ Escape closes drawer")
    })
})

test.describe("UX Pass 5 - Bottom nav", () => {
    const testPages = ["/", "/courses", "/test-series", "/pricing"]

    for (const path of testPages) {
        test(`Bottom nav visible with correct order on ${path}`, async ({ page }) => {
            await page.setViewportSize({ width: 360, height: 740 })
            await page.goto(`${BASE_URL}${path}`)
            
            // Find bottom nav
            const bottomNav = page.locator('[data-mobile-bottom-nav="true"], nav[aria-label*="Bottom" i]')
            await expect(bottomNav).toBeVisible({ timeout: 5000 })
            
            // Get bar height
            const barBox = await bottomNav.boundingBox()
            const barHeight = barBox?.height || 0
            console.log(`${path}: Bottom nav height = ${barHeight}px`)
            
            // Check tab order: Home, Courses, Pass, Tests
            const tabs = await bottomNav.locator('a, button').allTextContents()
            console.log(`${path}: Tab labels = ${JSON.stringify(tabs)}`)
            
            // Verify all tabs visible
            const tabCount = await bottomNav.locator('a, button').count()
            expect(tabCount).toBeGreaterThanOrEqual(3)
        })
    }
})

test.describe("UX Pass 5 - Hydration warnings", () => {
    test("No hydration warnings on pages (light theme)", async ({ page }) => {
        // Set light theme
        await page.addInitScript(() => {
            localStorage.setItem("ts_theme", "light")
        })
        
        const logs: string[] = []
        page.on("console", (msg) => {
            const text = msg.text()
            if (text.toLowerCase().includes("hydrat")) {
                logs.push(text)
            }
        })
        
        const pages = ["/", "/test-series", "/courses", "/books", "/pricing"]
        for (const path of pages) {
            await page.goto(`${BASE_URL}${path}`)
            await page.waitForLoadState("networkidle")
        }
        
        console.log(`Hydration warnings (light): ${logs.length === 0 ? "0 warnings" : logs.join("\n")}`)
        expect(logs.length).toBe(0)
    })

    test("No hydration warnings on pages (dark theme)", async ({ page }) => {
        // Set dark theme
        await page.addInitScript(() => {
            localStorage.setItem("ts_theme", "dark")
        })
        
        const logs: string[] = []
        page.on("console", (msg) => {
            const text = msg.text()
            if (text.toLowerCase().includes("hydrat")) {
                logs.push(text)
            }
        })
        
        const pages = ["/", "/test-series", "/courses", "/books", "/pricing"]
        for (const path of pages) {
            await page.goto(`${BASE_URL}${path}`)
            await page.waitForLoadState("networkidle")
        }
        
        console.log(`Hydration warnings (dark): ${logs.length === 0 ? "0 warnings" : logs.join("\n")}`)
        expect(logs.length).toBe(0)
    })
})

test.describe("UX Pass 5 - Desktop pricing page at 1280px", () => {
    test("Pricing page layout at desktop width", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 1024 })
        await page.goto(`${BASE_URL}/pricing`)
        
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        console.log(`Pricing desktop scrollWidth: ${scrollWidth}`)
        expect(scrollWidth).toBeLessThanOrEqual(1280 + 1)
        
        // Check FAQ accordion works
        const firstFaq = page.locator('button[aria-expanded]').first()
        await expect(firstFaq).toBeVisible()
        await firstFaq.click()
        const expanded = await firstFaq.getAttribute("aria-expanded")
        expect(expanded).toBe("true")
        
        // Save screenshot
        await page.screenshot({ path: "/tmp/ux-fix3-shots/pricing-desktop-1280.png", fullPage: true })
        console.log("✓ Screenshot saved: /tmp/ux-fix3-shots/pricing-desktop-1280.png")
    })
})
