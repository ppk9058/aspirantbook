#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 8: HOME / LOGO / BRAND NAVIGATION MATRIX ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

npx ts-node --compiler-options '{"module":"commonjs"}' << 'TS_EOF'
import { chromium } from "playwright"

interface NavTestItem {
  id: string
  persona: "GUEST" | "STUDENT" | "TEACHER" | "ADMIN"
  viewport: "desktop" | "mobile"
  startUrl: string
  elementTestId: string
  expectedTarget: string
}

const tests: NavTestItem[] = [
  // Desktop TopNavBar Brand Logo & Brand Name
  { id: "T-01", persona: "GUEST", viewport: "desktop", startUrl: "/courses", elementTestId: "brand-logo", expectedTarget: "/" },
  { id: "T-02", persona: "GUEST", viewport: "desktop", startUrl: "/courses", elementTestId: "brand-name", expectedTarget: "/" },
  // Desktop LeftSidebar Dashboard Item
  { id: "T-03", persona: "GUEST", viewport: "desktop", startUrl: "/courses", elementTestId: "sidebar-item-dashboard", expectedTarget: "/dashboard" },
  // Mobile App Header Logo & Brand Name
  { id: "T-04", persona: "GUEST", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-header-logo", expectedTarget: "/" },
  { id: "T-05", persona: "GUEST", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-header-brand-name", expectedTarget: "/" },
  // Mobile Bottom Tab Home
  { id: "T-06", persona: "GUEST", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-bottom-tab-home", expectedTarget: "/" },
  // 404 Page Cards
  { id: "T-07", persona: "GUEST", viewport: "desktop", startUrl: "/non-existent-page-404", elementTestId: "not-found-dashboard", expectedTarget: "/dashboard" },
  { id: "T-08", persona: "GUEST", viewport: "desktop", startUrl: "/non-existent-page-404", elementTestId: "not-found-courses", expectedTarget: "/courses" },
  { id: "T-09", persona: "GUEST", viewport: "desktop", startUrl: "/non-existent-page-404", elementTestId: "not-found-test-series", expectedTarget: "/test-series" },
]

async function run() {
  const browser = await chromium.launch()

  for (const t of tests) {
    const isMobile = t.viewport === "mobile"
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile,
    })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:3045${t.startUrl}`, { waitUntil: "domcontentloaded" })

    const loc = page.locator(`[data-testid="${t.elementTestId}"]`)
    const count = await loc.count()
    if (count === 0) {
      console.log(`TEST ${t.id} [${t.persona} | ${t.viewport} | ${t.elementTestId}]: FAIL (Element not found)`)
      await context.close()
      continue
    }

    // Check href on element or closest anchor
    let href = await loc.first().getAttribute("href")
    if (!href) {
      href = await loc.first().locator("xpath=ancestor-or-self::a").getAttribute("href").catch(() => null)
    }
    const pass = href === t.expectedTarget
    console.log(`TEST ${t.id} [${t.persona} | ${t.viewport} | ${t.elementTestId}]: href='${href}' expected='${t.expectedTarget}' -> ${pass ? "PASS" : "FAIL"}`)
    await context.close()
  }

  await browser.close()
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
TS_EOF
