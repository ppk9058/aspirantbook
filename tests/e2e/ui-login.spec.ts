import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import { createActor, prisma, PASSWORD } from "./test-series-e2e-helpers"

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Real UI Login Form Flow", () => {
  let user: any

  test.beforeAll(async () => {
    user = await createActor(`UI-LOGIN-${Date.now()}`, "FREE", "student")
  })

  test.afterAll(async () => {
    if (user?.id) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })

  test("UI form submits credentials, waits for hydration, and establishes session", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitBtn = page.locator('button[type="submit"]')

    await emailInput.waitFor({ state: "visible", timeout: 10_000 })
    await emailInput.pressSequentially(user.email, { delay: 30 })
    await passwordInput.pressSequentially(PASSWORD, { delay: 30 })

    await submitBtn.click()

    // Poll for session establishment
    let session: any = null
    for (let i = 0; i < 30; i++) {
      session = await page.evaluate(async () => {
        const res = await fetch("/api/auth/session")
        return res.ok ? await res.json() : null
      })
      if (session?.user?.email?.toLowerCase() === user.email.toLowerCase()) {
        break
      }
      await page.waitForTimeout(500)
    }

    expect(session?.user?.email?.toLowerCase()).toBe(user.email.toLowerCase())
  })
})
