import { test, expect } from "@playwright/test"

/**
 * Razorpay live-readiness: public legal pages must be reachable and expose the
 * digital-delivery (shipping) policy, and checkout/pricing must link all three
 * consent policies. Runs against the isolated test server on 3045.
 */

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"
const OFFICE_ADDRESS =
    "Pawar Shop, Ber Sarai Market, Near IIT Delhi, Hauz Khash, New Delhi-110016"

test.describe("Shipping & Digital Delivery policy page", () => {
    test("loads with digital-delivery content and the office address", async ({ page }) => {
        const response = await page.goto(`${BASE_URL}/shipping`)
        expect(response?.status()).toBeLessThan(400)

        await expect(
            page.getByRole("heading", { name: "Shipping & Digital Delivery Policy", level: 1 })
        ).toBeVisible()

        // Known fixture value: the configured office address
        await expect(page.getByText(OFFICE_ADDRESS).first()).toBeVisible()

        // Core promise: strictly digital, nothing physically shipped
        await expect(page.getByText(/No physical goods are shipped/i).first()).toBeVisible()
        await expect(page.getByText(/Office:/).first()).toBeVisible()

        // Legal footer links
        for (const href of ["/terms", "/privacy", "/refund", "/contact"]) {
            await expect(page.locator(`footer a[href="${href}"], main a[href="${href}"]`).first()).toBeVisible()
        }
    })

    test("site footer exposes the shipping link", async ({ page }) => {
        await page.goto(`${BASE_URL}/about`)
        await expect(page.locator('footer a[href="/shipping"]').first()).toBeVisible()
    })
})

test.describe("Consent policy links", () => {
    test("pricing page shows terms, refund and shipping links", async ({ page }) => {
        await page.goto(`${BASE_URL}/pricing`)
        await expect(page.locator('a[href="/terms"]').first()).toBeVisible()
        await expect(page.locator('a[href="/refund"]').first()).toBeVisible()
        await expect(page.locator('a[href="/shipping"]').first()).toBeVisible()
    })

    test("checkout page shows terms, refund and shipping links", async ({ page }) => {
        await page.goto(`${BASE_URL}/checkout?plan=YEARLY`)
        await expect(page.locator('a[href="/terms"]').first()).toBeVisible()
        await expect(page.locator('a[href="/refund"]').first()).toBeVisible()
        await expect(page.locator('a[href="/shipping"]').first()).toBeVisible()
    })
})
