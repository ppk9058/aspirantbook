import { test, expect } from "@playwright/test"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

/**
 * /test-series must be a real server-rendered catalogue: cards and the
 * ItemList JSON-LD come from the ISR HTML, not from a client effect. This
 * guards the production regression where the page shipped an empty prerender
 * ("View Test Series" count 0, no ItemList) and served it from cache.
 *
 * Mobile-first: phones are the primary surface, so the check runs at 390px and
 * also asserts no horizontal overflow and that the existing filters still work.
 */
test.describe("test-series catalogue is server-rendered", () => {
  test.setTimeout(60_000)
  test.use({ viewport: { width: 390, height: 844 } })

  test("server HTML contains series cards and the ItemList JSON-LD", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/test-series`)
    expect(res.status()).toBe(200)

    const html = await res.text()
    expect(html).toContain("Test Series by Categories")

    const ctaCount = html.split("View Test Series").length - 1
    expect(ctaCount, "series cards must be in the served HTML").toBeGreaterThan(0)

    const cardLinks = html.match(/href="\/test-series\/[^"]+"/g) || []
    expect(cardLinks.length, "each card links to its series").toBeGreaterThan(0)

    expect(html, "ItemList JSON-LD must list the visible series").toContain('"numberOfItems"')
    expect(html).toContain('"@type":"ItemList"')
  })

  test("390px: cards render, no horizontal overflow, filters still work", async ({ page }) => {
    await page.goto(`${BASE_URL}/test-series`)

    const cards = page.locator('a:has-text("View Test Series")')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(0)

    // No horizontal page scroll on a phone.
    const overflows = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth > el.clientWidth + 1
    })
    expect(overflows, "the catalogue must not overflow horizontally at 390px").toBe(false)

    // Search filters the server-rendered list and can be cleared again.
    const search = page.getByPlaceholder("Search Test Series")
    await search.fill("zzz-no-such-series-zzz")
    await expect(page.getByText("No Test Series Found")).toBeVisible()
    await search.fill("")
    await expect(cards.first()).toBeVisible()

    // "Show all exam tests" / target toggle still works.
    const toggle = page.getByRole("button", { name: /Show all exam tests|Show only/i }).first()
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(cards.first()).toBeVisible()
  })
})
