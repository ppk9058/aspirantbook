#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 10: MOBILE DRAWER DASHBOARD / HOME BUTTON FIX AUDIT (ADDENDUM) ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 10.1 Label and Href Historical Inspection ---"
echo "Label in 8748475 MobileDrawer.tsx:"
git show 8748475:components/layout/MobileDrawer.tsx | grep -n -C 2 "Dashboard / Home"

echo ""
echo "Desktop LeftSidebar.tsx label at HEAD:"
grep -n -C 2 '"Dashboard"' components/layout/LeftSidebar.tsx

echo ""
echo "Bottom bar Home tab change in MobileNativeBottomBar.tsx:"
echo "Old value at 8748475/early 10.6: href = homeHref (resolving to \"/\" for guests)"
echo "New value at HEAD: href = \"/dashboard\" (resolving to \"/dashboard\" for everyone inside dashboard area)"
grep -n -C 3 'name: "Home"' components/layout/MobileNativeBottomBar.tsx

echo ""
echo "--- 10.2 Playwright Regression Matrix: Guest Across Viewports (390x844 & 768x1024) ---"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'TS_EOF'
import { chromium } from "playwright"

interface ViewportCheck {
  name: string
  width: number
  height: number
  isMobile: boolean
}

const viewports: ViewportCheck[] = [
  { name: "390x844 (Mobile Phone)", width: 390, height: 844, isMobile: true },
  { name: "768x1024 (Tablet)", width: 768, height: 1024, isMobile: true },
]

async function runAudit() {
  const browser = await chromium.launch()

  for (const vp of viewports) {
    console.log(`\n======================================================`)
    console.log(`>>> Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) as GUEST`)
    console.log(`======================================================`)

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
    })
    const page = await context.newPage()

    // 1. Mobile Header Logo Check
    console.log(`\n[CHECK 1] Mobile Header Brand Logo (Expected destination: '/')`)
    await page.goto("http://127.0.0.1:3045/courses", { waitUntil: "domcontentloaded" })
    const logoLoc = page.locator('[data-testid="mobile-header-logo"]')
    const logoHref = await logoLoc.getAttribute("href")
    console.log(`  Raw href attribute: '${logoHref}'`)
    await Promise.all([
      page.waitForURL("http://127.0.0.1:3045/", { timeout: 10000 }),
      logoLoc.click()
    ])
    console.log(`  Navigation landing: ${page.url()}`)
    const logoPass = page.url() === "http://127.0.0.1:3045/"
    console.log(`  Verdict: ${logoPass ? "PASS" : "FAIL"}`)

    // 2. Mobile Bottom-Bar Home Tab Check
    console.log(`\n[CHECK 2] Mobile Bottom-Bar Home Tab (Expected destination: '/dashboard')`)
    await page.goto("http://127.0.0.1:3045/courses", { waitUntil: "domcontentloaded" })
    const bottomHome = page.locator('[data-testid="mobile-bottom-tab-home"]')
    const bottomHomeHref = await bottomHome.getAttribute("href")
    console.log(`  Raw href attribute: '${bottomHomeHref}'`)
    await Promise.all([
      page.waitForURL("**/dashboard", { timeout: 10000 }),
      bottomHome.click()
    ])
    console.log(`  Navigation landing: ${page.url()}`)
    const bottomPass = page.url().endsWith("/dashboard")
    console.log(`  Verdict: ${bottomPass ? "PASS" : "FAIL"}`)

    // 3. Mobile Drawer "Dashboard" Item Check
    console.log(`\n[CHECK 3] Mobile Drawer Dashboard Item (Expected destination: '/dashboard')`)
    await page.goto("http://127.0.0.1:3045/courses", { waitUntil: "domcontentloaded" })
    const menuBtn = page.locator('button[aria-label="Open navigation menu"]')
    await menuBtn.click()
    await page.waitForTimeout(300)

    const drawerDash = page.locator('[data-testid="mobile-drawer-dashboard"]')
    const drawerLabel = (await drawerDash.textContent())?.trim()
    const drawerHref = await drawerDash.getAttribute("href")
    console.log(`  Drawer item label: '${drawerLabel}' (Matches desktop sidebar: ${drawerLabel === "Dashboard"})`)
    console.log(`  Raw href attribute: '${drawerHref}'`)
    await Promise.all([
      page.waitForURL("**/dashboard", { timeout: 10000 }),
      drawerDash.click()
    ])
    console.log(`  Navigation landing: ${page.url()}`)
    const drawerPass = page.url().endsWith("/dashboard") && drawerLabel === "Dashboard"
    console.log(`  Verdict: ${drawerPass ? "PASS" : "FAIL"}`)

    await context.close()
  }

  await browser.close()
}

runAudit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
TS_EOF
