import { test, expect } from "@playwright/test"

/**
 * M6 public question-answer pages against the 3045 test server.
 * Fixtures: scripts/seed-seo-responsive-fixtures.ts (TEST-RESP questions,
 * fixture 1 has a structured APPROVED solution, exam "UPSC CSE").
 */

test.describe("Public question-answer pages (M6)", () => {
  test("hub lists published questions with pagination and per-page selector", async ({ page }) => {
    // Topic filter unique to fixture 1 (bulk questions use other topics)
    await page.goto("/question-answer?topic=Geomorphology")
    await expect(page.getByRole("heading", { name: "Question Answers" })).toBeVisible()
    // Known fixture value: fixture 1 question text appears in the list
    await expect(
      page.getByText("Consider the following detailed hydrological and geological features", { exact: false }).first(),
    ).toBeVisible()
    // Pass banner present (right column)
    await expect(page.getByText("Unlock All Test Series of All Exams with Pass!")).toBeVisible()
    // Per-page selector with default 20
    const per = page.getByLabel("Questions per page")
    await expect(per).toBeVisible()
    await expect(per).toHaveValue("20")
    // Unfiltered hub paginates (109 published > 20 per page)
    await page.goto("/question-answer")
    await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible()
    // No horizontal scroll on the hub (mobile-first rule)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("detail page renders question, structured solution, pass banner and relevant test-series card", async ({ page }) => {
    await page.goto("/question-answer/test-resp-01-long-english-question-with-image")
    await expect(page.getByRole("heading", { name: "Question", exact: true })).toBeVisible()
    // Structured solution sections
    await expect(page.getByText("Detailed Solution")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Key Points" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Additional Information" })).toBeVisible()
    // Option analysis with the "because" part (user requirement)
    await expect(
      page.getByText("Incorrect because the Tarai is a wet, marshy re-emergence zone", { exact: false }),
    ).toBeVisible()
    // Correct answer line
    await expect(page.getByText("The correct answer is the", { exact: false })).toBeVisible()
    // Pass banner
    await expect(page.getByText("Unlock All Test Series of All Exams with Pass!")).toBeVisible()
    // Relevant test-series card matched on exam "UPSC CSE" -> UPSC series
    await expect(page.getByText("Test Series Responsive Benchmark 2026")).toBeVisible()
    await expect(page.getByRole("link", { name: /Start Now/ })).toBeVisible()
    // No horizontal scroll (360px is the primary target; 375 viewport here)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("unknown/non-published question is not indexable (404 UI + noindex)", async ({ page }) => {
    // Dev streaming may commit 200 before notFound(); the contract we need is
    // the 404 page UI + robots noindex (never rendered publicly).
    await page.goto("/question-answer/does-not-exist-anywhere")
    await expect(page.getByText("404", { exact: false }).first()).toBeVisible()
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()
    await expect(page.getByRole("heading", { name: "Question", exact: true })).toHaveCount(0)
  })
})
