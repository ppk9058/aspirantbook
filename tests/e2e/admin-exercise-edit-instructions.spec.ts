import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, newNonce, createActor, loginThroughUi, slugFor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

// B-014: the exercise column is `instructions`, the admin form/action speak
// `description`. The edit page used to pass the raw row through, so the form
// rendered an empty description and saving overwrote the instructions with "".
const INSTRUCTIONS =
  "B-014 fixture instructions: implement `add(a, b)` and return the sum. This text must survive an edit."

test.describe("Admin exercise edit keeps stored instructions (B-014)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: { id: string; email: string } | undefined
  let exerciseId: string | undefined

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "b014-admin")
    const exercise = await prisma.exercise.create({
      data: {
        title: `${nonce} Sum Fixture`,
        slug: slugFor(`${nonce}-sum-fixture`),
        instructions: INSTRUCTIONS,
        language: "python",
        difficulty: "BEGINNER",
        testCases: {
          create: [{ input: "1 2", expectedOutput: "3", isHidden: false }],
        },
      },
    })
    exerciseId = exercise.id
  })

  test.afterAll(async () => {
    if (exerciseId) {
      await prisma.testCase.deleteMany({ where: { exerciseId } }).catch(() => {})
      await prisma.exercise.delete({ where: { id: exerciseId } }).catch(() => {})
    }
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
  })

  test("edit form shows the stored instructions in the description field", async ({ page }) => {
    await loginThroughUi(page, adminUser!.email)

    const response = await page.goto(`/admin/exercises/${exerciseId}/edit`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole("heading", { name: "Edit Exercise" })).toBeVisible()

    const description = page.locator('textarea[placeholder="Describe the problem..."]')
    await expect(description).toBeVisible()
    await expect(description).toHaveValue(INSTRUCTIONS)
  })
})
