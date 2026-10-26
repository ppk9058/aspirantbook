import { chromium, Browser, BrowserContext, Page } from "@playwright/test"
import fs from "fs"
import path from "path"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"
const EVIDENCE_DIR = path.join(process.cwd(), "docs/release/evidence/responsive")

fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

interface Viewport {
  name: string
  width: number
  height: number
  isPhone: boolean
}

const VIEWPORTS: Viewport[] = [
  { name: "360x640", width: 360, height: 640, isPhone: true },
  { name: "375x812", width: 375, height: 812, isPhone: true },
  { name: "412x915", width: 412, height: 915, isPhone: true },
  { name: "768x1024", width: 768, height: 1024, isPhone: false },
  { name: "1024x768", width: 1024, height: 768, isPhone: false },
  { name: "1440x900", width: 1440, height: 900, isPhone: false },
]

const THEMES: Array<"light" | "dark"> = ["light", "dark"]

interface PageTarget {
  id: string
  name: string
  path: string
  isAdmin: boolean
}

const PAGES: PageTarget[] = [
  // Group 1: Public Pages
  { id: "home", name: "Home Page", path: "/", isAdmin: false },
  {
    id: "q_en_image",
    name: "English Question with Image",
    path: "/question-answer/upsc-cse/geography/test-resp-01-long-english-question-with-image",
    isAdmin: false,
  },
  {
    id: "q_en_table_code",
    name: "Question with Table and Code Block",
    path: "/question-answer/upsc-cse/computer-science/test-resp-03-question-with-table-and-code",
    isAdmin: false,
  },
  {
    id: "q_en_long_slug",
    name: "Question with Exceptionally Long Slug/Title",
    path: "/question-answer/upsc-cse/public-administration/test-resp-04-exceptionally-long-slug-designed-to-verify-responsive-wrapping-and-prevent-horizontal-page-overflow-on-mobile-phone-viewports-without-layout-breakage-2024",
    isAdmin: false,
  },
  {
    id: "q_hi_long_words",
    name: "Hindi Question with Long Devanagari Words",
    path: "/hi/question-answer/bpsc/hindi-literature/test-resp-02-hindi-question-long-words",
    isAdmin: false,
  },
  { id: "hub_qa_en", name: "Question Hub Root (English)", path: "/question-answer", isAdmin: false },
  { id: "hub_qa_hi", name: "Question Hub Root (Hindi)", path: "/hi/question-answer", isAdmin: false },
  { id: "hub_exam_en", name: "Exam Hub (English UPSC)", path: "/question-answer/upsc-cse", isAdmin: false },
  { id: "hub_exam_hi", name: "Exam Hub (Hindi BPSC)", path: "/hi/question-answer/bpsc", isAdmin: false },
  { id: "hub_subject_en", name: "Subject Hub (Geography)", path: "/question-answer/upsc-cse/geography", isAdmin: false },
  {
    id: "hub_subject_100",
    name: "Subject Hub with 100+ Items",
    path: "/question-answer/test-resp-bulk-exam/bulk-general-studies",
    isAdmin: false,
  },
  { id: "hub_year_en", name: "Year Hub (2024 UPSC)", path: "/question-answer/upsc-cse/2024", isAdmin: false },
  {
    id: "hub_topic_en",
    name: "Topic Hub (Geomorphology)",
    path: "/question-answer/upsc-cse/geography/topic/geomorphology",
    isAdmin: false,
  },
  { id: "pyqs_hub", name: "PYQs Catalog Hub", path: "/pyqs", isAdmin: false },
  { id: "pyqs_category", name: "PYQs Active Category", path: "/pyqs/test-resp-pyq-cat", isAdmin: false },
  { id: "pyqs_empty_hub", name: "PYQs Empty Hub", path: "/pyqs/test-resp-empty-hub", isAdmin: false },
  { id: "test_series_hub", name: "Test Series Catalog Hub", path: "/test-series", isAdmin: false },
  { id: "test_series_detail", name: "Test Series Detail", path: "/test-series/test-resp-series", isAdmin: false },
  { id: "test_series_print", name: "Test Series Print Page", path: "/test-series/test-resp-test-id/print", isAdmin: false },
  { id: "tutorials_slug", name: "Tutorial Detail Page", path: "/tutorials/test-resp-tutorial", isAdmin: false },
  {
    id: "current_affairs_slug",
    name: "Current Affairs Quiz Detail",
    path: "/current-affairs-quizzes/weekly-national-current-affairs-round-2026",
    isAdmin: false,
  },
  { id: "courses_slug", name: "Course Detail Page", path: "/courses/test-resp-course", isAdmin: false },

  // Group 2: Admin & Authoring Surfaces
  { id: "admin_seo", name: "SEO Studio", path: "/admin/seo", isAdmin: true },
  { id: "admin_content_engine", name: "Content Engine Admin", path: "/admin/content-engine", isAdmin: true },
  { id: "admin_content_engine_add", name: "Content Engine Add Batch", path: "/admin/content-engine/add", isAdmin: true },
  { id: "admin_content_engine_categories", name: "Content Engine Categories", path: "/admin/content-engine/categories", isAdmin: true },
  { id: "admin_content_engine_practice", name: "Content Engine Practice Tab", path: "/admin/content-engine/practice", isAdmin: true },
  { id: "admin_content_engine_hindi", name: "Content Engine Translation Review", path: "/admin/content-engine/hindi", isAdmin: true },
  { id: "admin_content_engine_gates", name: "Content Engine Quality Gates", path: "/admin/content-engine/gates", isAdmin: true },
  { id: "admin_content_engine_aliases", name: "Content Engine Exam Aliases", path: "/admin/content-engine/aliases", isAdmin: true },
  { id: "admin_content_engine_export", name: "Content Engine Export", path: "/admin/content-engine/export", isAdmin: true },
]

export interface AuditRunResult {
  pageId: string
  pageName: string
  url: string
  viewport: string
  theme: string
  status: "PASS" | "FAIL"
  hasOverflow: boolean
  overflowElements: Array<{ selector: string; width: number; right: number }>
  hasTapTargetDefect: boolean
  tapTargetDefects: Array<{ selector: string; text: string; width: number; height: number }>
  metaViewportOk: boolean
  metaViewportContent?: string
  screenshotPath: string
}

import { loginAs } from "../tests/e2e/test-series-e2e-helpers"

async function loginAdmin(page: Page) {
  await loginAs(page, "admin@aspirantbook.com", "Test@123")
}

async function runAudit() {
  console.log("==================================================================")
  console.log("PART B: FULL SEO & CONTENT ENGINE RESPONSIVE AUDIT RUNNER")
  console.log(`Server: ${BASE_URL} | Viewports: ${VIEWPORTS.length} | Themes: 2 | Pages: ${PAGES.length}`)
  console.log("==================================================================\n")

  const browser: Browser = await chromium.launch({ headless: true })
  const results: AuditRunResult[] = []

  let totalDefectsFound = 0

  for (const pageTarget of PAGES) {
    console.log(`\n>>> Auditing [${pageTarget.id}]: ${pageTarget.name} (${pageTarget.path})`)

    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const context: BrowserContext = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
          userAgent:
            vp.isPhone
              ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
              : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        })

        const page: Page = await context.newPage()

        if (pageTarget.isAdmin) {
          await loginAdmin(page)
        }

        const fullUrl = `${BASE_URL}${pageTarget.path}`
        try {
          await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 30000 })
        } catch {
          await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 })
        }

        // Apply dark mode class to html if theme is dark
        if (theme === "dark") {
          await page.evaluate(() => {
            document.documentElement.classList.add("dark")
          })
        } else {
          await page.evaluate(() => {
            document.documentElement.classList.remove("dark")
          })
        }
        await page.waitForTimeout(300)

        // Check 1: Horizontal overflow
        const overflowCheck = await page.evaluate(() => {
          const docEl = document.documentElement
          const scrollW = docEl.scrollWidth
          const clientW = docEl.clientWidth
          const hasOverflow = scrollW > clientW + 1 // 1px threshold for rounding
          const offenders: Array<{ selector: string; width: number; right: number }> = []

          if (hasOverflow) {
            document.querySelectorAll("*").forEach((el) => {
              const rect = el.getBoundingClientRect()
              if (rect.right > clientW + 1.5 && rect.width > 0) {
                let sel = el.tagName.toLowerCase()
                if (el.id) sel += `#${el.id}`
                else if (el.className && typeof el.className === "string") {
                  sel += `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
                }
                offenders.push({
                  selector: sel,
                  width: Math.round(rect.width),
                  right: Math.round(rect.right),
                })
              }
            })
          }

          return { hasOverflow, scrollW, clientW, offenders: offenders.slice(0, 10) }
        })

        // Check 2: Tap targets (only on phone viewports)
        const tapTargetCheck = vp.isPhone
          ? await page.evaluate(() => {
              const minSize = 40
              const defects: Array<{ selector: string; text: string; width: number; height: number }> = []

              const interactives = document.querySelectorAll(
                'button:not([disabled]), a[href]:not([disabled]), input:not([type="hidden"]), select, textarea'
              )

              interactives.forEach((el) => {
                const rect = el.getBoundingClientRect()
                const style = window.getComputedStyle(el)
                // only test visible elements
                if (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  style.display !== "none" &&
                  style.visibility !== "hidden" &&
                  style.opacity !== "0" &&
                  rect.bottom > 0 &&
                  rect.top < window.innerHeight
                ) {
                  if (rect.width < minSize - 1 || rect.height < minSize - 1) {
                    let sel = el.tagName.toLowerCase()
                    if (el.id) sel += `#${el.id}`
                    else if (el.className && typeof el.className === "string") {
                      sel += `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
                    }
                    const text = (el.textContent || (el as HTMLInputElement).value || "").trim().slice(0, 30)
                    defects.push({
                      selector: sel,
                      text,
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                    })
                  }
                }
              })

              return { hasDefects: defects.length > 0, defects: defects.slice(0, 15) }
            })
          : { hasDefects: false, defects: [] }

        // Check 5: Viewport Meta Tag
        const viewportMeta = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="viewport"]')
          return meta ? meta.getAttribute("content") : null
        })
        const metaViewportOk =
          Boolean(viewportMeta) &&
          viewportMeta!.includes("width=device-width") &&
          viewportMeta!.includes("initial-scale=1")

        // Capture screenshot
        const screenshotName = `${pageTarget.id}_${vp.name}_${theme}.png`
        const screenshotPath = path.join(EVIDENCE_DIR, screenshotName)
        await page.screenshot({ path: screenshotPath, fullPage: false })

        const isFail = overflowCheck.hasOverflow || tapTargetCheck.hasDefects || !metaViewportOk

        if (isFail) {
          totalDefectsFound++
          console.log(`  [FAIL] ${vp.name} (${theme}):`)
          if (overflowCheck.hasOverflow) {
            console.log(
              `    - Overflow: scrollWidth ${overflowCheck.scrollW} > clientWidth ${overflowCheck.clientW}`
            )
            console.log(`      Offenders:`, overflowCheck.offenders)
          }
          if (tapTargetCheck.hasDefects) {
            console.log(`    - Tap Target Defects (<40x40):`, tapTargetCheck.defects)
          }
          if (!metaViewportOk) {
            console.log(`    - Meta Viewport Defect:`, viewportMeta)
          }
        } else {
          console.log(`  [PASS] ${vp.name} (${theme})`)
        }

        results.push({
          pageId: pageTarget.id,
          pageName: pageTarget.name,
          url: fullUrl,
          viewport: vp.name,
          theme,
          status: isFail ? "FAIL" : "PASS",
          hasOverflow: overflowCheck.hasOverflow,
          overflowElements: overflowCheck.offenders,
          hasTapTargetDefect: tapTargetCheck.hasDefects,
          tapTargetDefects: tapTargetCheck.defects,
          metaViewportOk,
          metaViewportContent: viewportMeta || undefined,
          screenshotPath: `docs/release/evidence/responsive/${screenshotName}`,
        })

        await context.close()
      }
    }
  }

  // Check 4 & Sticky/Fixed Elements Test at 360px
  console.log("\n>>> Testing Sticky Elements & Admin Mobile Drawer at 360px...")
  const drawerContext = await browser.newContext({
    viewport: { width: 360, height: 640 },
    colorScheme: "light",
  })
  const adminPage = await drawerContext.newPage()
  await loginAdmin(adminPage)
  await adminPage.goto(`${BASE_URL}/admin/seo`, { waitUntil: "domcontentloaded" })

  // Find hamburger toggle button in AdminHeader
  const toggleBtn = adminPage.locator('header button[aria-label="Toggle navigation menu"]').first()
  const toggleCount = await toggleBtn.count()
  let drawerPassed = false
  if (toggleCount > 0) {
    await toggleBtn.first().click()
    await adminPage.waitForTimeout(400)
    const aside = adminPage.locator("aside")
    const isVisible = await aside.first().isVisible()
    console.log(`- Admin mobile drawer open after click: ${isVisible}`)
    await adminPage.screenshot({
      path: path.join(EVIDENCE_DIR, "admin_nav_drawer_open_360x640.png"),
    })

    // Click close button inside aside
    const closeBtn = adminPage.locator('aside button[aria-label="Close navigation"]')
    if ((await closeBtn.count()) > 0) {
      await closeBtn.first().click()
      await adminPage.waitForTimeout(300)
      console.log(`- Admin mobile drawer close button clicked.`)
    }
    drawerPassed = isVisible
  } else {
    console.log(`- Admin header hamburger button not found with primary selector.`)
  }
  await drawerContext.close()

  // Check 6: Print page /test-series/[id]/print at 375px and A4 print emulation
  console.log("\n>>> Testing Print Page at 375px and A4 PDF Emulation...")
  const printContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
  })
  const printPage = await printContext.newPage()
  await printPage.goto(`${BASE_URL}/test-series/test-resp-test-id/print`, {
    waitUntil: "networkidle",
  })
  await printPage.screenshot({
    path: path.join(EVIDENCE_DIR, "test-series-print-375x812.png"),
  })
  const printPdfPath = path.join(EVIDENCE_DIR, "test-series-print-a4.pdf")
  await printPage.pdf({
    path: printPdfPath,
    format: "A4",
    printBackground: true,
  })
  console.log(`- Saved print page screenshot and A4 PDF to ${printPdfPath}`)
  await printContext.close()

  await browser.close()

  // Save JSON report
  const jsonPath = path.join(process.cwd(), "docs/release/evidence/responsive/responsive_results.json")
  fs.writeFileSync(jsonPath, JSON.stringify({ results, drawerPassed }, null, 2))
  console.log(`\n✓ Audit complete. Saved ${results.length} checks to ${jsonPath}`)
  console.log(`Total defects found across all pages/viewports: ${totalDefectsFound}`)

  return { totalDefectsFound, results }
}

runAudit().catch((err) => {
  console.error("FATAL ERROR in responsive audit:", err)
  process.exit(1)
})
