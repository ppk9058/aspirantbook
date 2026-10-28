import { test, expect } from "@playwright/test"

test.describe("Admin AI Batch Jobs Studio", () => {
  test("loads studio page with admin context and shows key UI elements", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "ts_demo_role",
        value: "ADMIN",
        url: "http://127.0.0.1:3045",
      },
    ])

    await page.goto("/admin/ai-batch")

    // Check heading is visible
    await expect(page.getByRole("heading", { name: "AI Batch Jobs Studio" })).toBeVisible({
      timeout: 25000,
    })

    // Check tabs are visible
    await expect(page.getByRole("button", { name: /Batch Jobs/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Create Job/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Review & Approve Drafts/i })).toBeVisible()

    // Switch to create tab and check creation options
    await page.getByRole("button", { name: /Create Job/i }).click()
    await expect(page.getByText("Generate Question Explanations")).toBeVisible()
    await expect(page.getByText("Hindi Question Translation")).toBeVisible()
  })
})
