import { test, expect } from "@playwright/test"
import { prisma } from "./test-series-e2e-helpers"

const scenario = process.env.CATALOGUE_CASE
const expectedSlug = "series-catalogue-real-only"
const expectedTitle = "Catalogue Real Series Fixture"

test("guest catalogue renders only published database series", async ({ page }) => {
  const rows = await prisma.examSeries.findMany({
    where: { isPublished: true },
    select: { slug: true, title: true },
    orderBy: { createdAt: "desc" },
  })

  if (scenario === "empty") {
    expect(rows).toEqual([])
  } else {
    expect(scenario).toBe("one")
    expect(rows).toEqual([{ slug: expectedSlug, title: expectedTitle }])
  }

  await page.addInitScript(() => localStorage.setItem("trillion_selected_goal", "bpsc"))
  const apiResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/exam/series/list") && response.status() === 200,
  )
  const response = await page.goto("/test-series", { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(200)
  const apiResponse = await apiResponsePromise
  const apiBody = await apiResponse.json()
  expect(apiBody.success).toBe(true)
  expect(apiBody.data.map(({ slug, title }: { slug: string; title: string }) => ({ slug, title }))).toEqual(rows)
  await expect(page.getByText("Test Series by Categories")).toBeVisible()

  const catalogueCards = page.getByRole("link", { name: "View Test Series" })
  if (scenario === "empty") {
    await expect(page.getByText(/No test series.*yet/i)).toBeVisible()
    await expect(catalogueCards).toHaveCount(0)
    return
  }

  await expect(page.getByText(expectedTitle, { exact: false })).toBeVisible()
  await expect(page.locator(`a[href="/test-series/${expectedSlug}"]`)).toHaveCount(1)
  await expect(catalogueCards).toHaveCount(1)
})

test("empty database renders no current affairs quiz cards", async ({ page }) => {
  const tests = await prisma.examTest.findMany({
    where: { isPublished: true },
    select: { id: true },
  })
  expect(tests).toEqual([])

  const apiResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/exam/test/list") && response.status() === 200,
  )
  const response = await page.goto("/current-affairs-quizzes", { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(200)
  const apiResponse = await apiResponsePromise
  const apiBody = await apiResponse.json()
  expect(apiBody.data).toEqual([])
  await expect(page.getByText("No quizzes available yet", { exact: true })).toBeVisible()
  await expect(page.getByTestId("current-affairs-quiz-card")).toHaveCount(0)
})

test.afterAll(async () => {
  await prisma.$disconnect()
})
