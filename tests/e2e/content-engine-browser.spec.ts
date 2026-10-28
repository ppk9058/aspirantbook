import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import {
  prisma,
  newNonce,
  createActor,
  loginAs,
} from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"
import { execSync } from "node:child_process"
import { qaPath } from "../../lib/modules/content-engine/paths"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Browser E2E — Real Browser Verification Suite", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "browser-admin")

    // Ensure Setting.exportBaseUrl is empty for primary mode block test
    await prisma.contentEngineSetting.upsert({
      where: { key: "exportBaseUrl" },
      update: { value: "" },
      create: { key: "exportBaseUrl", value: "" },
    })

    // Ensure mirror mode default
    await prisma.contentEngineSetting.upsert({
      where: { key: "exportMode" },
      update: { value: "mirror" },
      create: { key: "exportMode", value: "mirror" },
    })
  })

  test.afterAll(async () => {
    if (adminUser?.email) {
      await prisma.user.delete({ where: { email: adminUser.email } }).catch(() => {})
    }
  })

  test("Browser E2E 1: Admin Workflow (Login -> Ingest 3 Questions -> Publish -> Public 200 -> Unpublish -> Public 404)", async ({
    page,
  }) => {
    // 1. Login as real admin
    await loginAs(page, adminUser.email)

    // 2. Navigate to /admin/content-engine/add
    await page.goto(`${BASE_URL}/admin/content-engine/add`)
    await expect(page.locator("h1")).toContainText("Add Question Batch")

    // 3. Paste 3 clean questions
    const uniqueStem = `What was the ancient dockyard city of the Indus Valley Civilization? (${nonce})`
    const testBatchText = `[UPSC CSE 2023] Q1. ${uniqueStem}
(A) Harappa
(B) Mohenjodaro
(C) Lothal
(D) Kalibangan
Ans: (C)
Explanation: Lothal was the prominent dockyard port city in Gujarat. Detailed explanation text exceeding eighty characters for quality gate requirements.

[UPSC CSE 2023] Q2. Who was the first President of Independent India? (${nonce})
(A) Dr. Rajendra Prasad
(B) Dr. S. Radhakrishnan
(C) Jawaharlal Nehru
(D) Sardar Vallabhbhai Patel
Ans: (A)
Explanation: Dr. Rajendra Prasad served as the first President of the Republic of India from 1950 to 1962. Detailed explanation text exceeding eighty characters.

[UPSC CSE 2023] Q3. Which fundamental right was removed by the 44th Constitutional Amendment? (${nonce})
(A) Right to Equality
(B) Right to Property
(C) Right to Freedom
(D) Right to Religion
Ans: (B)
Explanation: The Right to Property was removed from the list of Fundamental Rights by the 44th Amendment Act in 1978. Detailed explanation text exceeding eighty characters.`

    const textarea = page.locator("textarea")
    await textarea.fill(testBatchText)

    // Select Default Exam & Year to ensure clean source attribution
    const examSelect = page.locator("select").nth(2)
    await examSelect.selectOption("UPSC")
    const yearInput = page.locator("input[placeholder*='2023']")
    await yearInput.fill("2023")

    // Submit batch
    const submitBtn = page.locator("button[type='submit']")
    await submitBtn.click()

    // Assert batch ingestion success toast or UI card
    await expect(page.locator("text=Batch parsed!")).toBeVisible({ timeout: 15_000 })

    // 4. Query the ingested question from DB
    const batchQuestions = await prisma.contentEngineQuestion.findMany({
      where: {
        q: { contains: uniqueStem },
      },
      orderBy: { createdAt: "desc" },
    })
    expect(batchQuestions.length).toBeGreaterThan(0)
    const targetQ = batchQuestions[0]

    // 5. Publish the question via admin publish API (evaluates quality gates and generates canonical slug)
    const publishRes = await page.request.post(`${BASE_URL}/api/admin/content-engine/publish`, {
      data: {
        questionIds: [targetQ.id],
        isPublished: true,
      },
    })
    expect(publishRes.status()).toBe(200)

    const publishedQ = await prisma.contentEngineQuestion.findUnique({
      where: { id: targetQ.id },
    })
    expect(publishedQ?.isPublished).toBe(true)
    expect(publishedQ?.slug).toBeTruthy()

    // 6. Navigate to the public URL in the same browser session
    const publicUrl = `${BASE_URL}${qaPath("en", publishedQ!.exam, publishedQ!.sub, publishedQ!.slug!)}`
    const pubRes = await page.goto(publicUrl)
    expect(pubRes?.status()).toBe(200)

    // Assert rendered content in real browser DOM
    await expect(page.locator("h1")).toContainText("ancient dockyard city")
    await expect(page.locator("text=Lothal")).toBeVisible()
    await expect(page.locator("text=UPSC").first()).toBeVisible()

    // 7. Unpublish the question via admin publish API (with admin credentials)
    const unpublishRes = await page.request.post(`${BASE_URL}/api/admin/content-engine/publish`, {
      data: {
        questionIds: [publishedQ!.id],
        isPublished: false,
      },
    })
    expect(unpublishRes.status()).toBe(200)

    // 8. Re-navigate to the public URL -> assert 404
    const notFoundRes = await page.goto(publicUrl)
    expect(notFoundRes?.status()).toBe(404)
    await expect(page.locator("text=Page Not Found")).toBeVisible()
  })

  test("Browser E2E 2: Practice UI (Interactive Answer Feedback, Hindi Translation Toggle, and Mobile 375px Layout)", async ({
    page,
  }) => {
    // 1. Create a bilingual question in DB with valid 8-char shortId
    const shortId = "pr" + Math.random().toString(36).substring(2, 8)
    const slug = `q-${shortId}-primary-function-reserve-bank-india`
    const practiceQ = await prisma.contentEngineQuestion.create({
      data: {
        shortId,
        textHash: "hash-practice-" + Date.now(),
        q: "What is the primary function of the Reserve Bank of India?",
        options: [
          "Regulating monetary policy and currency issuance",
          "Conducting national parliamentary elections",
          "Directly administering income tax collection",
          "Regulating international cricket tournaments",
        ],
        answer: "Regulating monetary policy and currency issuance",
        answerIndex: 0,
        explanation:
          "The Reserve Bank of India is the central bank of India, responsible for the issue and supply of the Indian rupee and regulation of the Indian banking system.",
        sub: "Economy",
        top: "Banking",
        exam: "UPSC CSE",
        year: "2023",
        status: "PUBLISHED",
        isPublished: true,
        isVerified: true,
        slug,
        publishedAt: new Date(),
        translations: {
          create: {
            lang: "hi",
            q: "भारतीय रिजर्व बैंक का प्राथमिक कार्य क्या है?",
            options: [
              "मौद्रिक नीति और मुद्रा जारी करने का नियमन",
              "राष्ट्रीय संसदीय चुनावों का संचालन",
              "आयकर संग्रह का प्रत्यक्ष प्रशासन",
              "अंतर्राष्ट्रीय क्रिकेट टूर्नामेंटों का नियमन",
            ],
            answer: "मौद्रिक नीति और मुद्रा जारी करने का नियमन",
            explanation:
              "भारतीय रिजर्व बैंक भारत का केंद्रीय बैंक है, जो भारतीय रुपये के जारी करने और आपूर्ति तथा भारतीय बैंकिंग प्रणाली के नियमन के लिए उत्तरदायी है।",
            top: "बैंकिंग",
            isReviewed: true,
          },
        },
      },
    })

    const enUrl = `${BASE_URL}${qaPath("en", practiceQ.exam, practiceQ.sub, practiceQ.slug!)}`
    await page.goto(enUrl)

    // 2. Verify instant feedback on option click
    // Click option 0 (correct answer)
    const firstOption = page.locator("article button").filter({ hasText: "Regulating monetary policy" })
    await firstOption.click()

    // Explanation must become visible
    await expect(page.locator("text=Detailed Explanation")).toBeVisible()
    await expect(page.locator("text=The Reserve Bank of India is the central bank")).toBeVisible()

    // 3. Toggle Hindi via language switch button
    const langBtn = page.locator("[data-testid='lang-toggle-btn']")
    await expect(langBtn).toBeVisible()
    await langBtn.click()

    // Assert navigated to Hindi route
    await page.waitForURL(/.*\/hi\/question-answer\/.*/)
    await expect(page.locator("h1")).toContainText("भारतीय रिजर्व बैंक का प्राथमिक कार्य क्या है?")
    await expect(page.locator("text=मौद्रिक नीति और मुद्रा जारी करने का नियमन")).toBeVisible()

    // 4. Mobile Viewport Verification (375x667)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)

    // Assert NO horizontal scroll
    const noHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth
    })
    expect(noHorizontalScroll).toBe(true)

    // Assert all interactive option touch targets >= 44px
    const optionButtons = page.locator("article button[type='button']")
    const count = await optionButtons.count()
    expect(count).toBeGreaterThanOrEqual(4)
    for (let i = 0; i < count; i++) {
      const box = await optionButtons.nth(i).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }

    // Also check /admin/content-engine/practice in mobile viewport
    await page.goto(`${BASE_URL}/admin/content-engine/practice`)
    await page.waitForTimeout(500)

    const practiceScrollSafe = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth
    })
    expect(practiceScrollSafe).toBe(true)

    // Check nav buttons touch target >= 44px
    const prevBtn = page.locator("button:has-text('Previous')")
    const nextBtn = page.locator("button:has-text('Next')")
    if ((await prevBtn.count()) > 0) {
      const prevBox = await prevBtn.boundingBox()
      if (prevBox) expect(prevBox.height).toBeGreaterThanOrEqual(44)
    }
    if ((await nextBtn.count()) > 0) {
      const nextBox = await nextBtn.boundingBox()
      if (nextBox) expect(nextBox.height).toBeGreaterThanOrEqual(44)
    }
  })

  test("Browser E2E 3: Static Export (Download ZIP Integrity and Primary Mode Block Warning)", async ({
    page,
  }) => {
    // 1. Login as admin
    await loginAs(page, adminUser.email)

    // 2. Navigate to /admin/content-engine/export
    await page.goto(`${BASE_URL}/admin/content-engine/export`)
    await expect(page.locator("h1")).toContainText("Static Cloudflare Pages ZIP Export")
    await page.waitForTimeout(800) // Wait for initial client-side settings fetch

    // 3. Test Primary Mode Block when exportBaseUrl is unset
    await page.locator("[data-testid='primary-mode-card']").click()

    // Assert warning is displayed
    await expect(page.locator("text=Missing Export Base URL")).toBeVisible()
    await expect(
      page.locator("text=Primary export mode host is not configured. Please set exportBaseUrl in settings before exporting.")
    ).toBeVisible()

    // Assert download button is disabled
    const downloadBtn = page.locator("button:has-text('Download Static Site ZIP')")
    await expect(downloadBtn).toBeDisabled()

    // 4. Switch back to Mirror CDN Mode
    await page.locator("[data-testid='mirror-mode-card']").click()

    // Assert warning is gone and button is enabled
    await expect(page.locator("text=Missing Export Base URL")).not.toBeVisible()
    await expect(downloadBtn).toBeEnabled()

    // 5. Test real browser ZIP download
    const downloadPromise = page.waitForEvent("download")
    await downloadBtn.click()
    const download = await downloadPromise

    const tempZipPath = path.join("/tmp", `ce-browser-test-${Date.now()}.zip`)
    await download.saveAs(tempZipPath)

    expect(fs.existsSync(tempZipPath)).toBe(true)
    const fileStat = fs.statSync(tempZipPath)
    expect(fileStat.size).toBeGreaterThan(500)

    // Inspect ZIP entries using unzip -l
    const zipListing = execSync(`unzip -l "${tempZipPath}"`).toString()
    expect(zipListing).toContain("index.html")
    expect(zipListing).toContain("_headers")
    expect(zipListing).toContain("sitemap.xml")

    // Clean up temp file
    fs.unlinkSync(tempZipPath)
  })
})
