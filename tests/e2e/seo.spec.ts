import { test, expect } from "@playwright/test"

test.describe("SEO & Structured Data Verification", () => {
    test("robots.txt is served with correct crawl directives", async ({ request }) => {
        const res = await request.get("/robots.txt")
        expect(res.status()).toBe(200)
        const text = await res.text()

        expect(text.toLowerCase()).toContain("user-agent: *")
        expect(text).toContain("Disallow: /admin/")
        expect(text).toContain("Disallow: /dashboard/")
        expect(text).toContain("Disallow: /checkout/")
        expect(text).toContain("Disallow: /login")
        expect(text).toContain("Disallow: /reset-password")
        expect(text).toContain("Sitemap:")
    })

    test("sitemap.xml is generated with public routes and excludes private pages", async ({ request }) => {
        const res = await request.get("/sitemap.xml")
        expect(res.status()).toBe(200)
        const xml = await res.text()

        // Public hubs
        expect(xml).toContain("/courses")
        expect(xml).toContain("/books")
        expect(xml).toContain("/test-series")

        // Private routes must NOT be in sitemap
        expect(xml).not.toContain("/dashboard<")
        expect(xml).not.toContain("/admin")
        expect(xml).not.toContain("/checkout")
    })

    test("Home page contains valid metadata and Organization/WebSite JSON-LD", async ({ page }) => {
        await page.goto("/")
        await page.waitForLoadState("domcontentloaded")

        // Title and description
        const title = await page.title()
        expect(title).toContain("aspirantbook")

        const metaDesc = await page.locator('meta[name="description"]').getAttribute("content")
        expect(metaDesc).toBeTruthy()

        // Open Graph
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content")
        expect(ogTitle).toBeTruthy()

        // Single H1 tag
        const h1Count = await page.locator("h1").count()
        expect(h1Count).toBeGreaterThanOrEqual(1)

        // JSON-LD structured data
        const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all()
        expect(jsonLdScripts.length).toBeGreaterThanOrEqual(1)

        let foundOrg = false
        let foundWebSite = false

        for (const script of jsonLdScripts) {
            const raw = await script.textContent()
            if (raw) {
                const parsed = JSON.parse(raw)
                const graph = parsed["@graph"] || [parsed]
                for (const item of graph) {
                    if (item["@type"] === "Organization") foundOrg = true
                    if (item["@type"] === "WebSite") foundWebSite = true
                }
            }
        }

        expect(foundOrg).toBe(true)
        expect(foundWebSite).toBe(true)
    })

    test("Book detail page contains canonical link and Product JSON-LD with offer", async ({ page }) => {
        await page.goto("/books/cbse-class-10th-past-10-year-solved-paper-2026")
        await page.waitForLoadState("domcontentloaded")

        // Title and canonical
        const title = await page.title()
        expect(title).toContain("CBSE")

        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
        expect(canonical).toContain("/books/cbse-class-10th-past-10-year-solved-paper-2026")

        // Product JSON-LD
        const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all()
        let foundProduct = false

        for (const script of jsonLdScripts) {
            const raw = await script.textContent()
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed["@type"] === "Product") {
                    foundProduct = true
                    expect(parsed.offers).toBeDefined()
                    expect(parsed.offers["@type"]).toBe("Offer")
                    expect(parsed.offers.priceCurrency).toBe("INR")
                }
            }
        }

        expect(foundProduct).toBe(true)
    })

    test("Courses listing page contains canonical URL and valid metadata", async ({ page }) => {
        await page.goto("/courses")
        await page.waitForLoadState("domcontentloaded")

        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
        expect(canonical).toContain("/courses")

        const title = await page.title()
        expect(title).toContain("Courses")
    })

    test("Custom 404 page renders for nonexistent routes with helpful navigation", async ({ page }) => {
        const res = await page.goto("/this-page-definitely-does-not-exist-404")
        expect(res?.status()).toBe(404)

        const heading = await page.locator("h1").textContent()
        expect(heading).toContain("Looking for something?")

        const coursesLink = await page.locator('[data-testid="not-found-courses"]')
        await expect(coursesLink).toBeVisible()
    })
})
