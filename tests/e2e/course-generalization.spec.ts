import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect, type Page } from "@playwright/test"
import {
  beginArtifacts,
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  saveArtifacts,
  slugFor,
} from "./test-series-e2e-helpers"

const FORBIDDEN_LEAK_WORDS = [
  "BPSC",
  "बीपीएससी",
  "72nd",
  "72वीं",
  "Abhimanyu",
  "अभिमन्यु",
  "5,499",
  "Demolish",
  "GS 1",
  "NaN",
  "undefined",
  "null",
]

async function assertNoLeaks(page: Page, courseName: string, mode: string) {
  const fullBodyText = await page.innerText("body")
  for (const word of FORBIDDEN_LEAK_WORDS) {
    if (fullBodyText.includes(word)) {
      throw new Error(`[LEAK DETECTED] in ${courseName} (${mode}): found forbidden word "${word}"`)
    }
    expect(fullBodyText).not.toContain(word)
  }
  console.log(`[LEAK CHECK PASS] ${courseName} | ${mode} | Checked ${FORBIDDEN_LEAK_WORDS.length} forbidden words on full body (${fullBodyText.length} chars)`)
}

function visible(page: Page, text: string | RegExp) {
  return page.getByText(text).locator("visible=true").first()
}

test.describe("Course Studio Generalization & Public Detail Proof Tests", () => {
  test.setTimeout(240_000)

  let nonce: string
  let adminUser: any

  test.beforeAll(async () => {
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-generalization")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { selectedGoal: "general" },
    })
  })

  test.afterAll(async () => {
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
  })

  test.beforeEach(async ({ context }) => beginArtifacts(context))
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo))

  test("1. Blank new course form starts empty, verifies zero-leakage defaults & validation blocks", async ({
    page,
  }) => {
    test.setTimeout(15_000)
    page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()))
    page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message))

    await loginThroughUi(page, adminUser.email)

    await page.goto("/admin/courses/new")
    console.log("PAGE URL AFTER GOTO:", page.url())
    await expect(page.getByText("Guided Studio Wizard")).toBeVisible()
    await expect(page.getByText("Create ANY Course • Zero Leakage • Real Form Inputs")).toBeVisible()

    // Step 1: Default template is Blank
    const blankCard = page.locator('[data-testid="template-card-blank"]')
    await expect(blankCard).toBeVisible()
    await expect(blankCard.getByText("Selected ✓")).toBeVisible()

    // Continue to Basics
    await page.locator('[data-testid="wizard-next-btn"]').click()

    // Step 2: Verify inputs start empty and clean
    const titleInput = page.locator('[data-testid="input-course-title"]')
    await expect(titleInput).toHaveValue("")
    await expect(page.locator('[data-testid="input-course-title-hi"]')).toHaveValue("")
    await expect(page.locator('[data-testid="input-course-slug"]')).toHaveValue("")

    // Navigate to Review step without entering a title
    await page.locator('[data-testid="step-nav-9"]').click()

    // Verify Zero Lectures Warning in Review step
    await expect(page.getByText("Zero Lectures Warning")).toBeVisible()

    // Required-field validation blocks publish / save when title is empty
    await expect(page.locator('[data-testid="btn-save-draft"]')).toBeDisabled()
    await expect(page.locator('[data-testid="btn-publish-course"]')).toBeDisabled()

    // Enter title, return to Review step, verify publish button enables but zero lectures warning persists
    await page.locator('[data-testid="step-nav-2"]').click()
    await page.locator('[data-testid="input-course-title"]').fill("Temporary Validation Test")
    await page.locator('[data-testid="step-nav-9"]').click()
    await expect(page.locator('[data-testid="btn-publish-course"]')).toBeEnabled()
    await expect(page.getByText("Zero Lectures Warning")).toBeVisible()
  })

  test("2. Create Course 1: 'Railway NTPC CBT-1 Crash Course' (English, 1 teacher, 3 units, ₹999/₹1,999, no syllabus)", async ({
    page,
  }) => {
    await loginThroughUi(page, adminUser.email)
    const railwaySlug = `railway-ntpc-${slugFor(nonce)}`

    await page.goto("/admin/courses/new")
    await page.locator('[data-testid="template-card-blank"]').click()
    await page.locator('[data-testid="wizard-next-btn"]').click()

    // Section A: Basics
    await page.locator('[data-testid="select-course-category"]').selectOption("Railways")
    await page.locator('[data-testid="select-course-language"]').selectOption("English")
    await page.locator('[data-testid="select-course-status"]').selectOption("PUBLISHED")
    await page.locator('[data-testid="input-course-title"]').fill("Railway NTPC CBT-1 Crash Course")
    await page.locator('[data-testid="input-course-title-hi"]').fill("रेलवे एनटीपीसी सीबीटी-1 क्रैश कोर्स")
    await page.locator('[data-testid="input-course-subtitle"]').fill("Targeted 60-day intensive crash course with live speed drills and formulas")
    await page.locator('[data-testid="input-course-slug"]').fill(railwaySlug)
    await page.locator('[data-testid="input-course-description"]').fill("Comprehensive 60-day syllabus for RRB NTPC covering Mathematics, Reasoning, and General Awareness.")
    await page.locator('[data-testid="btn-generate-cover"]').click()
    await page.waitForTimeout(500)

    // Section B: Pricing
    await page.locator('[data-testid="step-nav-3"]').click()
    const isFreeCheckbox = page.locator('[data-testid="checkbox-course-free"]')
    if (await isFreeCheckbox.isChecked()) {
      await isFreeCheckbox.uncheck()
    }
    await page.locator('[data-testid="input-course-price"]').fill("999")
    await page.locator('[data-testid="input-course-mrp"]').fill("1999")
    await page.locator('[data-testid="input-course-cta-label"]').fill("Join Railway NTPC Batch")
    await page.locator('[data-testid="input-course-cta-helper"]').fill("One-time payment for 60 days complete access.")

    // Section C: Teachers (1 teacher)
    await page.locator('[data-testid="step-nav-4"]').click()
    await page.locator('[data-testid="btn-add-teacher"]').click()
    await page.locator('[data-testid="input-teacher-name-0"]').fill("Vikramaditya Sharma")
    await page.locator('[data-testid="input-teacher-role-0"]').fill("Lead Railway Mathematics Faculty")

    // Section D: Hero & About (Stats, Badges, Late Join Note)
    await page.locator('[data-testid="step-nav-5"]').click()
    // 4 Stats
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-0"]').fill("15 Nov")
    await page.locator('[data-testid="input-stat-caption-0"]').fill("Batch Starts")

    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-1"]').fill("120+ Hours")
    await page.locator('[data-testid="input-stat-caption-1"]').fill("Live & Recorded")

    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-2"]').fill("50+ Tests")
    await page.locator('[data-testid="input-stat-caption-2"]').fill("Mock Practice")

    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-3"]').fill("Hinglish")
    await page.locator('[data-testid="input-stat-caption-3"]').fill("Teaching Language")

    // Badges
    await page.locator('[data-testid="btn-add-badge"]').click()
    await page.locator('[data-testid="input-badge-label-0"]').fill("CBT-1 Targeted")
    await page.locator('[data-testid="btn-add-badge"]').click()
    await page.locator('[data-testid="input-badge-label-1"]').fill("Live Batch")

    // Late Join
    await page.locator('[data-testid="checkbox-late-join"]').check()
    await page.locator('[data-testid="input-late-join-text"]').fill("All past recorded classes are accessible from day 1.")

    // Section E: Course Plan (3 units)
    await page.locator('[data-testid="step-nav-6"]').click()

    // Unit 1
    await page.locator('[data-testid="btn-add-unit"]').click()
    await page.locator('[data-testid="input-unit-title-0"]').fill("Mathematics & Numerical Ability")
    await page.locator('[data-testid="input-unit-tag-0"]').fill("CBT-1 Section A")
    await page.locator('[data-testid="input-theme-title-0-0"]').fill("Arithmetic Foundations")
    await page.locator('[data-testid="input-theme-subtopics-0-0"]').fill("Number Systems, Percentages, Ratio & Proportion")
    await page.locator('[data-testid="btn-add-lecture-0-0"]').click()
    await page.locator('[data-testid="input-lecture-title-0-0-0"]').fill("Number Systems & Divisibility Rules")

    // Unit 2
    await page.locator('[data-testid="btn-add-unit"]').click()
    await page.locator('[data-testid="input-unit-title-1"]').fill("General Intelligence & Reasoning")
    await page.locator('[data-testid="input-unit-tag-1"]').fill("CBT-1 Section B")

    // Unit 3
    await page.locator('[data-testid="btn-add-unit"]').click()
    await page.locator('[data-testid="input-unit-title-2"]').fill("General Awareness & Science")
    await page.locator('[data-testid="input-unit-tag-2"]').fill("CBT-1 Section C")

    // Section F: Syllabus remains OFF
    await page.locator('[data-testid="step-nav-7"]').click()
    await expect(page.getByText("Exam syllabus is currently toggled OFF")).toBeVisible()

    // Section H: Review & Publish
    await page.locator('[data-testid="step-nav-9"]').click()
    await expect(page.getByText("Railway NTPC CBT-1 Crash Course")).toBeVisible()

    // Publish Course via UI
    const [createRes1] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/admin/courses") &&
          res.request().method() === "POST" &&
          (res.status() === 200 || res.status() === 201)
      ),
      page.locator('[data-testid="btn-publish-course"]').click(),
    ])
    const resData1 = await createRes1.json()
    expect(resData1.id).toBeTruthy()
    await page.waitForURL((url) => url.pathname.includes(`/admin/courses/${resData1.id}/edit`), { timeout: 15_000 })

    // Now visit public student course page
    await page.goto(`/courses/${resData1.slug || railwaySlug}`)
    await expect(page.getByRole("heading", { name: "Railway NTPC CBT-1 Crash Course", level: 1 })).toBeVisible()

    // Assert Pricing
    await expect(visible(page, "₹999")).toBeVisible()
    await expect(visible(page, "₹1,999")).toBeVisible()
    await expect(visible(page, "50% OFF")).toBeVisible()
    await expect(visible(page, "Join Railway NTPC Batch")).toBeVisible()

    // Assert Stats, Badges, and Late Join Note
    await expect(visible(page, "15 Nov")).toBeVisible()
    await expect(visible(page, "120+ Hours")).toBeVisible()
    await expect(visible(page, "CBT-1 Targeted")).toBeVisible()
    await expect(visible(page, "All past recorded classes are accessible from day 1.")).toBeVisible()

    // Assert Teacher
    await expect(visible(page, "Vikramaditya Sharma")).toBeVisible()
    await expect(visible(page, "Lead Railway Mathematics Faculty")).toBeVisible()

    // Assert Units & Content
    await expect(visible(page, "Mathematics & Numerical Ability")).toBeVisible()
    await expect(visible(page, "General Intelligence & Reasoning")).toBeVisible()
    await expect(visible(page, "General Awareness & Science")).toBeVisible()
    // Expand theme accordion to verify subtopics
    const themeBtn = page.getByRole("button", { name: /Arithmetic Foundations/i }).locator("visible=true").first()
    if (await themeBtn.isVisible()) {
      await themeBtn.click()
    }
    await expect(visible(page, /Number Systems.*Percentages/i)).toBeVisible()

    // Assert NO Syllabus block renders (empty optional block absent)
    await expect(page.locator('[data-testid="syllabus-section"]')).toHaveCount(0)

    // Leak Test: verify the ENTIRE public page body contains zero BPSC or seed course markers in EN, HI, and mobile 360
    await assertNoLeaks(page, "Course 1: Railway NTPC", "Desktop EN")

    // Switch to Hindi and assert
    const hindiToggle = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" }).locator("visible=true").first()
    if (await hindiToggle.isVisible()) {
      await hindiToggle.click()
      await assertNoLeaks(page, "Course 1: Railway NTPC", "Desktop HI")
    }

    // Mobile render
    await page.setViewportSize({ width: 360, height: 740 })
    await assertNoLeaks(page, "Course 1: Railway NTPC", "Mobile 360")
    await page.setViewportSize({ width: 1280, height: 800 })
  })

  test("3. Create Course 2: 'UPSC Prelims 2027 GS Foundation' (Bilingual, 2 teachers, Free preview, Syllabus linked)", async ({
    page,
  }) => {
    await loginThroughUi(page, adminUser.email)
    const upscSlug = `upsc-prelims-2027-${slugFor(nonce)}`

    await page.goto("/admin/courses/new")
    await page.locator('[data-testid="template-card-blank"]').click()
    await page.locator('[data-testid="wizard-next-btn"]').click()

    // Basics: Bilingual with Hindi Twin
    await page.locator('[data-testid="select-course-category"]').selectOption("UPSC")
    await page.locator('[data-testid="select-course-language"]').selectOption("Bilingual")
    await page.locator('[data-testid="select-course-status"]').selectOption("PUBLISHED")
    await page.locator('[data-testid="input-course-title"]').fill("UPSC Prelims 2027 GS Foundation")
    await page.locator('[data-testid="input-course-title-hi"]').fill("यूपीएससी सिविल सेवा प्रारंभिक 2027 फाउंडेशन")
    await page.locator('[data-testid="input-course-subtitle"]').fill("Comprehensive foundation batch covering General Studies and CSAT")
    await page.locator('[data-testid="input-course-subtitle-hi"]').fill("सामान्य अध्ययन एवं सीसैट का संपूर्ण प्रारंभिक फाउंडेशन बैच")
    await page.locator('[data-testid="input-course-slug"]').fill(upscSlug)
    await page.locator('[data-testid="input-course-description"]').fill("Detailed coverage for UPSC Prelims 2027 with topic tests, NCERT coverage, and PYQ breakdown.")
    await page.locator('[data-testid="btn-generate-cover"]').click()
    await page.waitForTimeout(500)

    // Pricing
    await page.locator('[data-testid="step-nav-3"]').click()
    const isFreeCheckbox = page.locator('[data-testid="checkbox-course-free"]')
    if (await isFreeCheckbox.isChecked()) {
      await isFreeCheckbox.uncheck()
    }
    await page.locator('[data-testid="input-course-price"]').fill("4999")
    await page.locator('[data-testid="input-course-mrp"]').fill("9999")
    await page.locator('[data-testid="input-course-cta-label"]').fill("Enroll in UPSC Foundation")
    await page.locator('[data-testid="input-course-cta-label-hi"]').fill("यूपीएससी बैच में प्रवेश लें")

    // Teachers (2 teachers)
    await page.locator('[data-testid="step-nav-4"]').click()
    await page.locator('[data-testid="btn-add-teacher"]').click()
    await page.locator('[data-testid="input-teacher-name-0"]').fill("Dr. Arvind Mishra")
    await page.locator('[data-testid="input-teacher-name-hi-0"]').fill("डॉ. अरविंद मिश्रा")
    await page.locator('[data-testid="input-teacher-role-0"]').fill("Senior Polity & Governance Mentor")
    await page.locator('[data-testid="input-teacher-role-hi-0"]').fill("वरिष्ठ राजव्यवस्था एवं शासन विशेषज्ञ")

    await page.locator('[data-testid="btn-add-teacher"]').click()
    await page.locator('[data-testid="input-teacher-name-1"]').fill("Prof. Sunita Reddy")
    await page.locator('[data-testid="input-teacher-name-hi-1"]').fill("प्रो. सुनीता रेड्डी")
    await page.locator('[data-testid="input-teacher-role-1"]').fill("Indian Economy & Budget Faculty")
    await page.locator('[data-testid="input-teacher-role-hi-1"]').fill("भारतीय अर्थव्यवस्था एवं बजट विशेषज्ञ")

    // Section D: Hero & About (Stats, Badges, Late Join Note)
    await page.locator('[data-testid="step-nav-5"]').click()
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-0"]').fill("01 Dec")
    await page.locator('[data-testid="input-stat-caption-0"]').fill("Batch Starts")
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-1"]').fill("400+ Hours")
    await page.locator('[data-testid="input-stat-caption-1"]').fill("Complete GS")
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-2"]').fill("24 Months")
    await page.locator('[data-testid="input-stat-caption-2"]').fill("Course Validity")
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-3"]').fill("Bilingual")
    await page.locator('[data-testid="input-stat-caption-3"]').fill("Medium of Study")

    await page.locator('[data-testid="btn-add-badge"]').click()
    await page.locator('[data-testid="input-badge-label-0"]').fill("Prelims 2027")
    await page.locator('[data-testid="btn-add-badge"]').click()
    await page.locator('[data-testid="input-badge-label-1"]').fill("Foundation")

    await page.locator('[data-testid="checkbox-late-join"]').check()
    await page.locator('[data-testid="input-late-join-text"]').fill("Missed classes can be rewatched anytime with PDF study notes.")

    // Course Plan: 2 Units with Free Preview Lecture
    await page.locator('[data-testid="step-nav-6"]').click()
    await page.locator('[data-testid="btn-add-unit"]').click()
    await page.locator('[data-testid="input-unit-title-0"]').fill("Indian Polity & Constitution")
    await page.locator('[data-testid="input-unit-tag-0"]').fill("Paper 1 Core")
    await page.locator('[data-testid="input-theme-title-0-0"]').fill("Constitutional Framework")
    await page.locator('[data-testid="input-theme-subtopics-0-0"]').fill("Preamble, Fundamental Rights, Directive Principles")
    await page.locator('[data-testid="btn-add-lecture-0-0"]').click()
    await page.locator('[data-testid="input-lecture-title-0-0-0"]').fill("Preamble & Fundamental Rights Masterclass")
    await page.locator('[data-testid="checkbox-lecture-trial-0-0-0"]').check()

    await page.locator('[data-testid="btn-add-unit"]').click()
    await page.locator('[data-testid="input-unit-title-1"]').fill("Indian Economy & Macro Development")
    await page.locator('[data-testid="input-unit-tag-1"]').fill("Paper 1 Economy")

    // Syllabus: Toggled ON with 2 Papers
    await page.locator('[data-testid="step-nav-7"]').click()
    await page.locator('[data-testid="checkbox-syllabus-enable"]').check()
    await page.locator('[data-testid="btn-add-paper"]').click()
    await page.locator('[data-testid="input-paper-title-0"]').fill("General Studies Paper I")
    await page.locator('[data-testid="btn-add-section-0"]').click()
    await page.locator('[data-testid="input-section-title-0-0"]').fill("Constitutional Foundations & Governance")

    await page.locator('[data-testid="btn-add-paper"]').click()
    await page.locator('[data-testid="input-paper-title-1"]').fill("CSAT Paper II (Aptitude)")

    // Review & Publish
    await page.locator('[data-testid="step-nav-9"]').click()
    const [createRes2] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/admin/courses") &&
          res.request().method() === "POST" &&
          (res.status() === 200 || res.status() === 201)
      ),
      page.locator('[data-testid="btn-publish-course"]').click(),
    ])
    const resData2 = await createRes2.json()
    expect(resData2.id).toBeTruthy()
    await page.waitForURL((url) => url.pathname.includes(`/admin/courses/${resData2.id}/edit`), { timeout: 15_000 })

    // Visit public page
    await page.goto(`/courses/${resData2.slug || upscSlug}`)
    await expect(page.getByRole("heading", { name: "UPSC Prelims 2027 GS Foundation", level: 1 })).toBeVisible()

    // Assert Both Teachers
    await expect(visible(page, "Dr. Arvind Mishra")).toBeVisible()
    await expect(visible(page, "Prof. Sunita Reddy")).toBeVisible()

    // Assert Stats, Badges, and Late Join Note
    await expect(visible(page, "01 Dec")).toBeVisible()
    await expect(visible(page, "400+ Hours")).toBeVisible()
    await expect(visible(page, "Prelims 2027")).toBeVisible()
    await expect(visible(page, "Missed classes can be rewatched anytime with PDF study notes.")).toBeVisible()

    // Assert Pricing & CTA
    await expect(visible(page, "₹4,999")).toBeVisible()
    await expect(visible(page, "₹9,999")).toBeVisible()
    await expect(visible(page, "Enroll in UPSC Foundation")).toBeVisible()

    // Assert Free Preview Chip on Lecture
    await expect(visible(page, "Free Preview")).toBeVisible()

    // Assert Syllabus Papers Rendered
    await expect(visible(page, "General Studies Paper I")).toBeVisible()
    await expect(visible(page, "CSAT Paper II (Aptitude)")).toBeVisible()

    // Assert Hindi Twin Toggle
    const hindiToggle = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" }).locator("visible=true").first()
    if (await hindiToggle.isVisible()) {
      await hindiToggle.click()
      await expect(page.getByRole("heading", { name: "यूपीएससी सिविल सेवा प्रारंभिक 2027 फाउंडेशन", level: 1 }).locator("visible=true").first()).toBeVisible()
      await expect(visible(page, "डॉ. Arvind Mishra डॉ. अरविंद मिश्रा").or(visible(page, "डॉ. अरविंद मिश्रा"))).toBeVisible()
    }

    // Leak Test: verify the ENTIRE public page body contains zero BPSC or seed course markers in HI, EN, and mobile 360
    await assertNoLeaks(page, "Course 2: UPSC Prelims", "Desktop HI")

    // Switch back to English and assert
    const enToggle = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "English" }).locator("visible=true").first()
    if (await enToggle.isVisible()) {
      await enToggle.click()
      await assertNoLeaks(page, "Course 2: UPSC Prelims", "Desktop EN")
    }

    // Mobile render
    await page.setViewportSize({ width: 360, height: 740 })
    await assertNoLeaks(page, "Course 2: UPSC Prelims", "Mobile 360")
    await page.setViewportSize({ width: 1280, height: 800 })
  })

  test("4. Create Course 3: 'IBPS PO Mains Banking Awareness' (Hindi-first, 6 units, custom theme)", async ({
    page,
  }) => {
    await loginThroughUi(page, adminUser.email)
    const bankingSlug = `ibps-po-mains-${slugFor(nonce)}`

    await page.goto("/admin/courses/new")
    await page.locator('[data-testid="template-card-blank"]').click()
    await page.locator('[data-testid="wizard-next-btn"]').click()

    // Basics: Hindi-first delivery
    await page.locator('[data-testid="select-course-category"]').selectOption("Banking")
    await page.locator('[data-testid="select-course-language"]').selectOption("Hindi")
    await page.locator('[data-testid="select-course-status"]').selectOption("PUBLISHED")
    await page.locator('[data-testid="input-course-title"]').fill("IBPS PO Mains Banking Awareness")
    await page.locator('[data-testid="input-course-title-hi"]').fill("आईबीपीएस पीओ मेन्स बैंकिंग जागरूकता")
    await page.locator('[data-testid="input-course-subtitle"]').fill("Complete Financial & Banking Awareness for IBPS and SBI PO Mains")
    await page.locator('[data-testid="input-course-slug"]').fill(bankingSlug)
    await page.locator('[data-testid="input-course-description"]').fill("Detailed 6-unit coverage of RBI monetary policy, financial terms, and current banking trends.")
    await page.locator('[data-testid="btn-generate-cover"]').click()
    await page.waitForTimeout(500)

    // Pricing: Paid course (₹1,499 / ₹2,999)
    await page.locator('[data-testid="step-nav-3"]').click()
    const freeCheckbox = page.locator('[data-testid="checkbox-course-free"]')
    if (await freeCheckbox.isChecked()) {
      await freeCheckbox.uncheck()
    }
    await page.locator('[data-testid="input-course-price"]').fill("1499")
    await page.locator('[data-testid="input-course-mrp"]').fill("2999")
    await page.locator('[data-testid="input-course-cta-label"]').fill("Join Banking Awareness Batch")
    await page.locator('[data-testid="input-course-cta-label-hi"]').fill("बैंकिंग बैच में प्रवेश लें")

    // Teachers
    await page.locator('[data-testid="step-nav-4"]').click()
    await page.locator('[data-testid="btn-add-teacher"]').click()
    await page.locator('[data-testid="input-teacher-name-0"]').fill("Ananya Sen")
    await page.locator('[data-testid="input-teacher-role-0"]').fill("Chief Banking Awareness Mentor")

    // Section D: Hero & About (Stats, Badges, Late Join Note)
    await page.locator('[data-testid="step-nav-5"]').click()
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-0"]').fill("20 Nov")
    await page.locator('[data-testid="input-stat-caption-0"]').fill("Batch Starts")
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-1"]').fill("80+ Hours")
    await page.locator('[data-testid="input-stat-caption-1"]').fill("Banking Awareness")
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-2"]').fill("6 Modules")
    await page.locator('[data-testid="input-stat-caption-2"]').fill("Curriculum")
    await page.locator('[data-testid="btn-add-stat"]').click()
    await page.locator('[data-testid="input-stat-value-3"]').fill("Hindi First")
    await page.locator('[data-testid="input-stat-caption-3"]').fill("Delivery Medium")

    await page.locator('[data-testid="btn-add-badge"]').click()
    await page.locator('[data-testid="input-badge-label-0"]').fill("IBPS PO Mains")
    await page.locator('[data-testid="btn-add-badge"]').click()
    await page.locator('[data-testid="input-badge-label-1"]').fill("Speed Batch")

    await page.locator('[data-testid="checkbox-late-join"]').check()
    await page.locator('[data-testid="input-late-join-text"]').fill("Recordings and banking awareness capsules available upon joining.")

    // Course Plan: 6 Units
    await page.locator('[data-testid="step-nav-6"]').click()
    const unitTitles = [
      "RBI & Monetary Policy Framework",
      "Banking Terminology & Financial Instruments",
      "Government Financial Schemes",
      "Priority Sector Lending & NPA Management",
      "Digital Banking, UPI & Cyber Security",
      "Current Financial Affairs Drills",
    ]

    for (let i = 0; i < unitTitles.length; i++) {
      await page.locator('[data-testid="btn-add-unit"]').click()
      await page.locator(`[data-testid="input-unit-title-${i}"]`).fill(unitTitles[i])
      await page.locator(`[data-testid="input-unit-tag-${i}"]`).fill(`Module ${i + 1}`)
    }

    // Add 1 lecture to unit 1
    await page.locator('[data-testid="btn-add-lecture-0-0"]').click()
    await page.locator('[data-testid="input-lecture-title-0-0-0"]').fill("Monetary Policy Committee & Repo Rate Mechanics")

    // Theme & Tabs: Custom theme colors
    await page.locator('[data-testid="step-nav-8"]').click()
    const navyInput = page.locator('input[value*="#"]').first()
    if (await navyInput.isVisible()) {
      await navyInput.fill("#0a2540")
    }

    // Review & Publish
    await page.locator('[data-testid="step-nav-9"]').click()
    const [createRes3] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/admin/courses") &&
          res.request().method() === "POST" &&
          (res.status() === 200 || res.status() === 201)
      ),
      page.locator('[data-testid="btn-publish-course"]').click(),
    ])
    const resData3 = await createRes3.json()
    expect(resData3.id).toBeTruthy()
    await page.waitForURL((url) => url.pathname.includes(`/admin/courses/${resData3.id}/edit`), { timeout: 15_000 })

    // Visit public page
    await page.goto(`/courses/${resData3.slug || bankingSlug}`)
    await expect(page.getByRole("heading", { name: "IBPS PO Mains Banking Awareness", level: 1 })).toBeVisible()

    // Assert All 6 Units Rendered
    for (const title of unitTitles) {
      await expect(visible(page, title)).toBeVisible()
    }

    // Assert Pricing (Paid, NOT free)
    await expect(visible(page, "₹1,499")).toBeVisible()
    await expect(visible(page, "₹2,999")).toBeVisible()
    await expect(visible(page, "Join Banking Awareness Batch")).toBeVisible()

    // Assert Stats, Badges, and Late Join Note
    await expect(visible(page, "20 Nov")).toBeVisible()
    await expect(visible(page, "80+ Hours")).toBeVisible()
    await expect(visible(page, "IBPS PO Mains")).toBeVisible()
    await expect(visible(page, "Recordings and banking awareness capsules available upon joining.")).toBeVisible()

    // Assert Teacher
    await expect(visible(page, "Ananya Sen")).toBeVisible()

    // Leak Test: verify the ENTIRE public page body contains zero BPSC or seed course markers in HI, EN, and mobile 360
    await assertNoLeaks(page, "Course 3: IBPS PO", "Desktop HI")

    // Switch to English and assert
    const enToggle = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "English" }).locator("visible=true").first()
    if (await enToggle.isVisible()) {
      await enToggle.click()
      await assertNoLeaks(page, "Course 3: IBPS PO", "Desktop EN")
    }

    // Mobile render
    await page.setViewportSize({ width: 360, height: 740 })
    await assertNoLeaks(page, "Course 3: IBPS PO", "Mobile 360")
    await page.setViewportSize({ width: 1280, height: 800 })
  })
})
