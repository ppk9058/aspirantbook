#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 10: MOBILE DRAWER DASHBOARD / HOME BUTTON FIX AUDIT ==="
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
    console.log(`Mobile Header Logo href: ${logoHref}`)
    await logoLoc.click()
    await page.waitForTimeout(500)
    console.log(`URL after clicking Logo: ${page.url()}`)
    const logoVerdict = page.url() === "http://127.0.0.1:3045/" ? "PASS" : "FAIL"
    console.log(`Verdict Check 1 (Logo -> '/'): ${logoVerdict}`)

    // 2. Mobile Drawer Dashboard Check
    console.log(`\n[CHECK 2] Mobile Drawer Dashboard Item (Expected destination: '/dashboard')`)
    await page.goto("http://127.0.0.1:3045/courses", { waitUntil: "domcontentloaded" })
    const menuBtn = page.locator('button[aria-label="Open menu"]').or(page.locator('button:has(svg.lucide-menu)'))
    await menuBtn.click()
    await page.waitForTimeout(500)
    
    const drawerItem = page.locator('a:has-text("Dashboard")').first()
    const drawerHref = await drawerItem.getAttribute("href")
    console.log(`Drawer Dashboard Item href: ${drawerHref}`)
    await drawerItem.click()
    await page.waitForTimeout(500)
    console.log(`URL after clicking Drawer Dashboard item: ${page.url()}`)
    const drawerVerdict = page.url().endsWith("/dashboard") ? "PASS" : "FAIL"
    console.log(`Verdict Check 2 (Drawer Dashboard -> '/dashboard'): ${drawerVerdict}`)

    // 3. Mobile Bottom-Bar Home Check
    console.log(`\n[CHECK 3] Mobile Bottom-Bar Home Tab (Expected destination: '/dashboard')`)
    await page.goto("http://127.0.0.1:3045/courses", { waitUntil: "domcontentloaded" })
    const bottomHome = page.locator('[data-testid="mobile-bottom-tab-home"]').first()
    const bottomHref = await bottomHome.getAttribute("href")
    console.log(`Bottom Bar Home tab href: ${bottomHref}`)
    await bottomHome.click()
    await page.waitForTimeout(500)
    console.log(`URL after clicking Bottom Bar Home tab: ${page.url()}`)
    const bottomVerdict = page.url().endsWith("/dashboard") ? "PASS" : "FAIL"
    console.log(`Verdict Check 3 (Bottom Bar Home -> '/dashboard'): ${bottomVerdict}`)

    await context.close()
  }

  await browser.close()
}

runAudit().catch(console.error)
TS_EOF

echo ""
echo "=== PART 10 AUDIT COMPLETE ==="
