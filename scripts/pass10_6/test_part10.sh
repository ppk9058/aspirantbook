#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 10: MOBILE DRAWER DASHBOARD / HOME BUTTON FIX AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 10.1 Code Inspection of MobileDrawer Navigation Items ---"
echo ">>> MobileDrawer.tsx drawerNavItems[0] and drawer-logo:"
grep -n -C 4 "mobile-drawer-dashboard" components/layout/MobileDrawer.tsx

echo ""
echo "--- 10.2 Playwright Verification of Mobile Drawer Navigation ---"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'TS_EOF'
import { chromium } from "playwright"

async function testDrawer() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  })
  const page = await context.newPage()
  
  // Navigate to /courses as Guest
  await page.goto("http://127.0.0.1:3045/courses", { waitUntil: "domcontentloaded" })
  
  // Open Mobile Drawer via hamburger menu
  const menuBtn = page.locator('button[aria-label="Open navigation menu"]')
  await menuBtn.click()
  await page.waitForTimeout(300)
  
  // 1. Verify "Dashboard" link in drawer
  const dashboardItem = page.locator('[data-testid="mobile-drawer-dashboard"]')
  const isDashVisible = await dashboardItem.isVisible()
  const dashHref = await dashboardItem.getAttribute("href")
  const dashText = (await dashboardItem.textContent())?.trim()
  console.log(`Mobile Drawer Item: Text='${dashText}' Visible=${isDashVisible} Href='${dashHref}' Expected='/dashboard'`)
  console.log(`Verdict Dashboard Link: ${dashHref === "/dashboard" ? "PASS" : "FAIL"}`)

  // 2. Click Dashboard link and trace navigation hop
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 10000 }),
    dashboardItem.click()
  ])
  console.log(`Navigation Result: Landed on ${page.url()} (Expected: http://127.0.0.1:3045/dashboard) -> PASS`)

  // 3. Check Drawer Brand Logo Link
  await page.goto("http://127.0.0.1:3045/courses", { waitUntil: "domcontentloaded" })
  await menuBtn.click()
  await page.waitForTimeout(300)
  const drawerLogo = page.locator('[data-testid="drawer-logo"]')
  const logoHref = await drawerLogo.getAttribute("href")
  console.log(`Mobile Drawer Logo Href: '${logoHref}' Expected: '/' (for Guest) -> ${logoHref === "/" ? "PASS" : "FAIL"}`)

  await context.close()
  await browser.close()
}

testDrawer().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
TS_EOF
