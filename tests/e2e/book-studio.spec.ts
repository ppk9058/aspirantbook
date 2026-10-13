import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"

test.describe("Book Studio & eBook Storefront", () => {
  test.setTimeout(45_000)

  test("BS-01: /books storefront loads cleanly, shows books, heart icon, and price information", async ({ page }) => {
    const res = await page.goto("/books", { waitUntil: "domcontentloaded" })
    expect(res?.status()).toBe(200)

    // Check header and core titles
    await expect(page.locator("h1")).toContainText(/eBooks/i)
    const cards = page.locator("div.group.relative")
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })

    // Check first card has Heart button in top right
    const heartBtn = cards.first().locator('button[aria-label="Wishlist toggle"]')
    await expect(heartBtn).toBeVisible()

    // Check pricing and Add to cart
    await expect(cards.first().locator("text=Add to Cart").or(cards.first().locator("text=ADD"))).toBeVisible()
    await expect(cards.first().locator("text=Buy Now")).toBeVisible()
  })

  test("BS-02: Book details page /books/[slug] loads with Flipkart gallery, details table, and sample buttons", async ({ page }) => {
    const res = await page.goto("/books/cbse-class-10th-past-10-year-solved-paper-2026", { waitUntil: "domcontentloaded" })
    expect(res?.status()).toBe(200)

    // Check Title
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 })

    // Check Flipkart gallery stage
    const galleryImage = page.locator('img[alt*="PW CBSE Class 10 PYQs"]').first()
    await expect(galleryImage).toBeVisible()

    // Check Read Free Sample button
    const sampleBtn = page.locator("button:has-text('Read Free Sample')")
    await expect(sampleBtn).toBeVisible()

    // Check Product details tab
    const detailsTab = page.locator('[data-testid="tab-product-details"]')
    await expect(detailsTab).toBeVisible()
    await detailsTab.click()
    // In case click occurred right before hydration completed, retry click if table not immediately visible
    try {
      await expect(page.locator("table")).toBeVisible({ timeout: 3_000 })
    } catch {
      await detailsTab.click()
      await expect(page.locator("table")).toBeVisible({ timeout: 5_000 })
    }
  })

  test("BS-03: Wishlist page /books/wishlist loads cleanly", async ({ page }) => {
    const res = await page.goto("/books/wishlist", { waitUntil: "domcontentloaded" })
    expect(res?.status()).toBe(200)
    await expect(page.locator("h1")).toContainText(/Wishlist/i)
  })

  test("BS-04: Secure PDF download route blocks unauthorized access", async ({ page }) => {
    // Attempt to download without purchase/auth should return 403 Forbidden
    const res = await page.request.get("/api/books/cbse-10-pyqs-past-10-years-2027/download?download=true")
    expect(res.status()).toBe(403)
    const json = await res.json()
    expect(json.error).toContain("Access Denied")
  })
})
