import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect, type Page } from "@playwright/test"
import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
} from "./test-series-e2e-helpers"

/**
 * M7 Hindi translation pipeline (Phase 2.8): admin logs in, imports pasted
 * Format v1 Hindi blocks (LANG: hi + REF), then reviews them in the queue.
 * Runs against the 3045 test server + Docker test DB only.
 */

const PASTED_HINDI = [
  "====",
  "NO: 1",
  "REF: resp01img",
  "LANG: hi",
  "SUBJECT: Geography",
  "Q: तराई-भाबर संक्रमण क्षेत्र के बारे में निम्नलिखित में से कौन-सा कथन सही है?",
  "a) भाबर मोटे बोल्डरों का क्षेत्र है जहाँ धाराएँ भूमिगत हो जाती हैं।",
  "b) तराई अत्यधिक शुष्क ऊँचा क्षेत्र है।",
  "ANSWER: A",
  "KEY POINTS:",
  "- भाबर = बोल्डर पट्टी, धाराएँ भूमिगत।",
  "ADDITIONAL INFO:",
  "# भाबर बनाम तराई",
  "- तराई में धाराएँ पुनः प्रकट होती हैं।",
  "OPTION ANALYSIS:",
  "a) Correct - भाबर की सही परिभाषा है।",
  "b) Incorrect - तराई आर्द्र क्षेत्र है।",
  "MEMORY TIP: भाबर = बोल्डर, तराई = धाराएँ लौटती हैं।",
  "CONCEPTS: भाबर पट्टी",
].join("\n")

async function cleanupHindi(questionShortId: string) {
  const q = await prisma.contentEngineQuestion.findFirst({
    where: { shortId: questionShortId },
    select: { id: true },
  })
  if (q) {
    await prisma.contentEngineTranslation.deleteMany({ where: { questionId: q.id, lang: "hi" } })
  }
}

test.describe("Hindi translation import + review (M7)", () => {
  test.setTimeout(180_000)

  let nonce: string
  let adminEmail: string

  test.beforeAll(async () => {
    nonce = newNonce()
    const admin = await createActor(nonce, "ADMIN", "hindi-import")
    adminEmail = admin.email
    await prisma.user.update({ where: { id: admin.id }, data: { emailVerified: new Date() } })
    await cleanupHindi("resp01img")
  })

  test.afterAll(async () => {
    await cleanupHindi("resp01img")
    await prisma.user.deleteMany({ where: { email: adminEmail } })
    await prisma.$disconnect()
  })

  async function login(page: Page) {
    await page.goto("/login")
    await loginThroughUi(page, adminEmail)
  }

  test("import-hindi creates translation (NEEDS_REVIEW), review queue approves it", async ({ page }) => {
    await login(page)

    // 1. Import pasted Hindi blocks via the batch API (admin session).
    const importRes = await page.request.post("/api/admin/content-engine/batch", {
      data: { action: "import-hindi", text: PASTED_HINDI },
    })
    expect(importRes.status()).toBe(200)
    const importData = await importRes.json()
    expect(importData.imported).toBe(1)
    expect(importData.skipped).toEqual([])

    // Translation row exists, unreviewed, NEEDS_REVIEW solution.
    const question = await prisma.contentEngineQuestion.findFirst({
      where: { shortId: "resp01img" },
      select: { id: true },
    })
    const translation = await prisma.contentEngineTranslation.findFirst({
      where: { questionId: question!.id, lang: "hi" },
    })
    expect(translation).toBeTruthy()
    expect(translation!.isReviewed).toBe(false)
    const sol = (translation!.solution || {}) as { status?: string }
    expect(sol.status).toBe("NEEDS_REVIEW")

    // 2. Hindi review queue lists it as pending.
    const listRes = await page.request.get("/api/admin/content-engine/translations?lang=hi&reviewed=false&take=50")
    expect(listRes.status()).toBe(200)
    const listData = await listRes.json()
    expect(listData.pendingCount).toBeGreaterThanOrEqual(1)
    const queued = listData.translations.find((t: { id: string }) => t.id === translation!.id)
    expect(queued).toBeTruthy()

    // 3. Approve it via the review route.
    const approveRes = await page.request.post(`/api/admin/content-engine/translations/${translation!.id}/review`, {
      data: { action: "approve" },
    })
    expect(approveRes.status()).toBe(200)
    const after = await prisma.contentEngineTranslation.findUnique({ where: { id: translation!.id } })
    expect(after!.isReviewed).toBe(true)
    const approvedSol = (after!.solution || {}) as { status?: string }
    expect(approvedSol.status).toBe("APPROVED")

    // 4. Studio page shows the Hindi Review entry point.
    await page.goto("/admin/content-engine")
    await expect(page.getByText("Hindi Review").first()).toBeVisible()
  })

  test("non-admin cannot import hindi translations", async ({ page }) => {
    const res = await page.request.post("/api/admin/content-engine/batch", {
      data: { action: "import-hindi", text: "====\nNO: 1\nREF: resp01img\nLANG: hi\nQ: x" },
    })
    expect([401, 403]).toContain(res.status())
  })
})
