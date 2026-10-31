#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 11: EXPANDED HOME / LOGO / BRAND NAVIGATION MATRIX ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

npx ts-node --compiler-options '{"module":"commonjs"}' << 'TS_EOF'
import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })()

interface NavTestItem {
  id: string
  persona: "GUEST" | "STUDENT"
  viewport: "desktop" | "mobile"
  startUrl: string
  elementTestId: string
  expectedTarget: string
}

const tests: NavTestItem[] = [
  // GUEST Tests
  { id: "T-01", persona: "GUEST", viewport: "desktop", startUrl: "/courses", elementTestId: "brand-logo", expectedTarget: "/" },
  { id: "T-02", persona: "GUEST", viewport: "desktop", startUrl: "/courses", elementTestId: "brand-name", expectedTarget: "/" },
  { id: "T-03", persona: "GUEST", viewport: "desktop", startUrl: "/courses", elementTestId: "sidebar-item-dashboard", expectedTarget: "/dashboard" },
  { id: "T-04", persona: "GUEST", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-header-logo", expectedTarget: "/" },
  { id: "T-05", persona: "GUEST", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-header-brand-name", expectedTarget: "/" },
  { id: "T-06", persona: "GUEST", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-bottom-tab-home", expectedTarget: "/dashboard" },
  { id: "T-07", persona: "GUEST", viewport: "desktop", startUrl: "/non-existent-page-404", elementTestId: "not-found-dashboard", expectedTarget: "/dashboard" },
  { id: "T-08", persona: "GUEST", viewport: "desktop", startUrl: "/non-existent-page-404", elementTestId: "not-found-courses", expectedTarget: "/courses" },
  { id: "T-09", persona: "GUEST", viewport: "desktop", startUrl: "/non-existent-page-404", elementTestId: "not-found-test-series", expectedTarget: "/test-series" },

  // LOGGED-IN Tests
  { id: "T-10", persona: "STUDENT", viewport: "desktop", startUrl: "/courses", elementTestId: "brand-logo", expectedTarget: "/dashboard" },
  { id: "T-11", persona: "STUDENT", viewport: "desktop", startUrl: "/courses", elementTestId: "brand-name", expectedTarget: "/dashboard" },
  { id: "T-12", persona: "STUDENT", viewport: "desktop", startUrl: "/courses", elementTestId: "sidebar-item-dashboard", expectedTarget: "/dashboard" },
  { id: "T-13", persona: "STUDENT", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-header-logo", expectedTarget: "/dashboard" },
  { id: "T-14", persona: "STUDENT", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-header-brand-name", expectedTarget: "/dashboard" },
  { id: "T-15", persona: "STUDENT", viewport: "mobile", startUrl: "/courses", elementTestId: "mobile-bottom-tab-home", expectedTarget: "/dashboard" },

  // Breadcrumbs / Home additions
  { id: "T-16", persona: "GUEST", viewport: "desktop", startUrl: "/courses", elementTestId: "breadcrumbs", expectedTarget: "/" },
  { id: "T-17", persona: "STUDENT", viewport: "desktop", startUrl: "/courses", elementTestId: "breadcrumbs", expectedTarget: "/dashboard" },
]

async function run() {
  const token = await encode({
    token: { id: "u_student_p10_8", role: "FREE", email: "student_p10_8@test.local", name: "Student P10.8" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  })

  const browser = await chromium.launch()
  let passCount = 0
  let failCount = 0

  for (const t of tests) {
    const isMobile = t.viewport === "mobile"
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile,
    })

    if (t.persona === "STUDENT") {
      await context.addCookies([
        { name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" },
      ])
    }

    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:3045${t.startUrl}`, { waitUntil: "domcontentloaded" })

    const loc = page.locator(`[data-testid="${t.elementTestId}"]`)
    const count = await loc.count()
    if (count === 0) {
      console.log(`TEST ${t.id} [${t.persona} | ${t.viewport} | ${t.elementTestId}]: FAIL (Element not found)`)
      failCount++
      await context.close()
      continue
    }

    let href = await loc.first().getAttribute("href")
    if (!href) {
      const parentAnchor = loc.locator("xpath=ancestor-or-self::a")
      if ((await parentAnchor.count()) > 0) {
        href = await parentAnchor.first().getAttribute("href")
      } else if (t.elementTestId === "breadcrumbs") {
        const homeAnchor = loc.locator('a[title="Home"]').first()
        if ((await homeAnchor.count()) > 0) {
          href = await homeAnchor.getAttribute("href")
        }
      }
    }

    const isMatch = href === t.expectedTarget
    if (isMatch) {
      passCount++
      console.log(`TEST ${t.id} [${t.persona} | ${t.viewport} | ${t.elementTestId}]: PASS (href=${href})`)
    } else {
      failCount++
      console.log(`TEST ${t.id} [${t.persona} | ${t.viewport} | ${t.elementTestId}]: FAIL (got ${href}, expected ${t.expectedTarget})`)
    }

    await context.close()
  }

  await browser.close()
  console.log(`\nHome/Logo Matrix Summary: ${passCount} PASS | ${failCount} FAIL | ${tests.length} TOTAL`)
}

run().catch(console.error)
TS_EOF

echo ""
echo "=== PART 11 AUDIT COMPLETE ==="
