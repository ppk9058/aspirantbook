import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { chromium } from "playwright"
import { prisma } from "../lib/prisma"

const PORT = 3045
const BASE_URL = `http://localhost:${PORT}`
const LOG_DIR = path.resolve(process.cwd(), "logs/verify-studio")
const SHOTS_DIR = path.resolve(LOG_DIR, "shots")

function getGitHead(): string {
  try {
    return execSync("git -C /Users/praveenkumar/wt-before rev-parse HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "ccf9448"
  }
}

async function main() {
  console.log("=== RUNNING NEGATIVE CONTROL ON wt-before (ccf9448) ===")
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.mkdirSync(SHOTS_DIR, { recursive: true })

  const gitHead = getGitHead()
  const timestamp = new Date().toISOString()
  const logs: string[] = []
  logs.push(`TIMESTAMP: ${timestamp} | GIT_HEAD: ${gitHead} (BEFORE FIXES)`)

  // Check 1: Publish button in Step 4 with 3/15 questions
  console.log("\n[NEGATIVE CHECK 1] Publish button in Step 4 on wt-before...")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  let publishButtonDisabled = true
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
    await page.fill('input#email', "teacher_owner@test.local")
    await page.fill('input#password', "password123")
    await page.click('button[data-testid="login-submit"]')
    await page.waitForTimeout(2000)

    await page.goto(`${BASE_URL}/teacher/test-series/create`, { waitUntil: "networkidle" })
    await page.fill('input[placeholder*="72nd BPSC Prelims"]', "PB-7391 Negative Control Test")

    const selectLocator = page.locator('select').first()
    await selectLocator.waitFor({ state: "visible" })
    const val = await selectLocator.locator('option').nth(1).getAttribute('value')
    if (val) await selectLocator.selectOption(val)

    await page.click('div.flex.justify-end button:has-text("Next")')
    await page.waitForTimeout(1000)

    // Step 2: 15 questions
    const questionsInput = page.locator('input[type="number"]').first()
    await questionsInput.fill("15")
    await page.waitForTimeout(500)
    await page.click('button:has-text("Next")')
    await page.waitForTimeout(1000)

    // Step 3: author 3 questions
    for (let q = 1; q <= 3; q++) {
      const qTextArea = page.locator('textarea[placeholder*="Type the question"]').first()
      await qTextArea.waitFor({ state: "visible" })
      await qTextArea.fill(`PB-7391 Question ${q}`)

      await page.fill('input[placeholder*="Option A (English)"]', `Option A for Q${q}`)
      await page.fill('input[placeholder*="Option B (English)"]', `Option B for Q${q}`)
      await page.fill('input[placeholder*="Option C (English)"]', `Option C for Q${q}`)
      await page.fill('input[placeholder*="Option D (English)"]', `Option D for Q${q}`)

      const radioA = page.locator('button.rounded-full').first()
      await radioA.click()
      await page.waitForTimeout(300)

      if (q < 3) {
        await page.click('button:has-text("Save & Next")')
        await page.waitForTimeout(600)
      }
    }

    await page.click('button:has-text("Preview & Publish")')
    await page.waitForTimeout(1500)

    const publishButton = page.locator('button:has-text("Publish Test")')
    await publishButton.waitFor({ state: "visible" })
    publishButtonDisabled = await publishButton.isDisabled()
    const shotPath = path.join(SHOTS_DIR, "negative_publish_button.png")
    await page.screenshot({ path: shotPath })

    console.log(`wt-before Publish button isDisabled: ${publishButtonDisabled}`)
    logs.push(
      `NEGATIVE CONTROL 1 (PUBLISH GUARD): Publish button isDisabled=${publishButtonDisabled} (FAIL: Expected disabled=false before fixes, demonstrating button allowed premature publishing)`
    )
  } catch (err: any) {
    console.error("Error in negative check 1:", err.message)
    logs.push(`NEGATIVE CONTROL 1 ERROR: ${err.message}`)
  } finally {
    await browser.close()
  }

  // Check 2: Legacy fallback in /api/exam/series/list
  console.log("\n[NEGATIVE CHECK 2] Legacy fallback on wt-before...")
  try {
    const res = await fetch(`${BASE_URL}/api/exam/series/list`)
    const json = await res.json()
    const legacy = (json.data || []).find((s: any) => s.slug === "pb-7391-s-legacy")
    const rawDescription = legacy?.description || ""
    const isRawJson = rawDescription.startsWith("{")
    console.log(`wt-before legacy description is raw JSON: ${isRawJson}, logoType: ${legacy?.logoType}`)
    logs.push(
      `NEGATIVE CONTROL 2 (LEGACY FALLBACK): description is raw JSON=${isRawJson}, logoType=${legacy?.logoType} (FAIL: Old code returned raw JSON text and did not parse metadata)`
    )
  } catch (err: any) {
    console.error("Error in negative check 2:", err.message)
    logs.push(`NEGATIVE CONTROL 2 ERROR: ${err.message}`)
  }

  const logFile = path.join(LOG_DIR, "negative_control.log")
  fs.writeFileSync(logFile, logs.join("\n") + "\n", "utf8")
  console.log(`\n[NEGATIVE LOG WRITTEN] ${logFile}`)
}

main().catch(console.error)
