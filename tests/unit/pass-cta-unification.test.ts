import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { mapActivePassCardData } from "@/lib/pass/pass-card-data"

const ROOT = path.resolve(__dirname, "../..")

describe("Pass CTA Unification Suite", () => {
  test("1. Redirect map: /subscription and /settings/subscription go to /pricing with 308", async () => {
    // Verify next.config.js redirects
    const nextConfig = require("../../next.config.js")
    assert.ok(typeof nextConfig.redirects === "function", "next.config.js must export redirects()")
    const redirects = await nextConfig.redirects()

    const subRedirect = redirects.find((r: any) => r.source === "/subscription")
    assert.ok(subRedirect, "Missing redirect rule for /subscription in next.config.js")
    assert.equal(subRedirect.destination, "/pricing", "/subscription must redirect to /pricing")
    assert.equal(subRedirect.permanent, true, "/subscription must use permanent 308 redirect")

    const settingsSubRedirect = redirects.find((r: any) => r.source === "/settings/subscription")
    assert.ok(settingsSubRedirect, "Missing redirect rule for /settings/subscription in next.config.js")
    assert.equal(settingsSubRedirect.destination, "/pricing", "/settings/subscription must redirect to /pricing")
    assert.equal(settingsSubRedirect.permanent, true, "/settings/subscription must use permanent 308 redirect")

    // Verify middleware.ts handles 308 redirects early
    const middlewareContent = fs.readFileSync(path.join(ROOT, "middleware.ts"), "utf8")
    assert.ok(
      middlewareContent.includes('toRequestUrl("/pricing"), 308'),
      "middleware.ts must contain 308 redirect to /pricing"
    )
    assert.ok(
      middlewareContent.includes('nextUrl.pathname === "/subscription"') &&
        middlewareContent.includes('nextUrl.pathname === "/settings/subscription"'),
      "middleware.ts must check /subscription and /settings/subscription"
    )
  })

  test("2. Repo scan test: fails if 'Renews on' or unapproved 'auto-renew' appears in app/, components/, apps/mobile/src", () => {
    const targetDirs = [
      path.join(ROOT, "app"),
      path.join(ROOT, "components"),
      path.join(ROOT, "apps/mobile/src"),
    ]

    const extensions = [".ts", ".tsx", ".js", ".jsx"]
    const violations: Array<{ file: string; line: number; match: string }> = []

    function walkDir(dir: string) {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walkDir(fullPath)
        } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, "utf8")
          const lines = content.split("\n")
          lines.forEach((lineText, idx) => {
            // Strict check: 'Renews on' is unconditionally forbidden
            if (/renews on/i.test(lineText)) {
              violations.push({
                file: path.relative(ROOT, fullPath),
                line: idx + 1,
                match: lineText.trim(),
              })
            }

            // 'auto-renew' is forbidden unless explicitly stating 'no auto-renew' / 'no auto-renewal' / in FAQ copy
            if (/auto-renew/i.test(lineText)) {
              const allowedPatterns = [
                /no auto-renew/i,
                /no auto-renewal/i,
                /\bNever displays auto-renewal/i,
                /\bDoes the subscription auto-renew/i,
              ]
              const isAllowed = allowedPatterns.some((pattern) => pattern.test(lineText))
              if (!isAllowed) {
                violations.push({
                  file: path.relative(ROOT, fullPath),
                  line: idx + 1,
                  match: lineText.trim(),
                })
              }
            }
          })
        }
      }
    }

    targetDirs.forEach((dir) => walkDir(dir))

    assert.equal(
      violations.length,
      0,
      `Found auto-renew violations:\n${violations.map((v) => `  ${v.file}:${v.line} -> ${v.match}`).join("\n")}`
    )
  })

  test("3. YourPassCard data mapper: validUntil formatting, no amount when DB has none, nothing rendered for non-holders", () => {
    // Case 1: Non-holder returns null
    const nonHolder = mapActivePassCardData({
      subscription: null,
      isAdmin: false,
      hasActive: false,
    })
    assert.equal(nonHolder, null, "Non-pass-holder must return null (nothing rendered)")

    const expiredSub = mapActivePassCardData({
      subscription: {
        status: "EXPIRED",
        plan: "YEARLY",
        endDate: new Date(Date.now() - 10000),
      },
      isAdmin: false,
      hasActive: false,
    })
    assert.equal(expiredSub, null, "Expired non-active subscription must return null")

    // Case 2: Active subscription without payment records -> no amount invented
    const testEndDate = new Date("2027-11-20T12:00:00Z")
    const activeNoPayment = mapActivePassCardData({
      subscription: {
        status: "ACTIVE",
        plan: "YEARLY",
        endDate: testEndDate,
        payments: [],
      },
      hasActive: true,
    })

    assert.ok(activeNoPayment, "Active pass holder must return mapped pass data")
    assert.equal(activeNoPayment.status, "Pass Active")
    assert.equal(activeNoPayment.planLabel, "Yearly Pass")
    assert.equal(activeNoPayment.amountPaid, null, "Must not invent amount when DB has none")
    assert.equal(activeNoPayment.formattedAmount, null, "Must not format amount when DB has none")
    assert.ok(
      activeNoPayment.validUntil.includes("2027"),
      `validUntil must format endDate accurately, got: ${activeNoPayment.validUntil}`
    )

    // Case 3: Active subscription with payment record -> shows verified amount
    const activeWithPayment = mapActivePassCardData({
      subscription: {
        status: "ACTIVE",
        plan: "YEARLY",
        endDate: testEndDate,
        payments: [{ amount: 499 }],
      },
      hasActive: true,
    })

    assert.ok(activeWithPayment)
    assert.equal(activeWithPayment.amountPaid, 499)
    assert.equal(activeWithPayment.formattedAmount, "₹499")

    // Case 4: Admin override without subscription row
    const adminPass = mapActivePassCardData({
      isAdmin: true,
      hasActive: true,
    })
    assert.ok(adminPass)
    assert.equal(adminPass.status, "Pass Active")
    assert.equal(adminPass.planLabel, "Admin All-Access Pass")
    assert.equal(adminPass.amountPaid, null)
  })

  test("4. Scan test that no remaining purchase CTA navigates to /subscription", () => {
    const scanPaths = [
      path.join(ROOT, "components/test-series/PassBanner.tsx"),
      path.join(ROOT, "components/landing/LandingPassSection.tsx"),
      path.join(ROOT, "components/landing/LandingStep4Section.tsx"),
      path.join(ROOT, "app/pricing/page.tsx"),
      path.join(ROOT, "apps/mobile/src/app/(tabs)/home.tsx"),
      path.join(ROOT, "apps/mobile/src/app/(tabs)/pass.tsx"),
      path.join(ROOT, "apps/mobile/src/app/tests/[id]/index.tsx"),
    ]

    for (const filePath of scanPaths) {
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, "utf8")
      assert.ok(
        !content.includes('href="/subscription"') &&
          !content.includes('href={\'/subscription\'}') &&
          !content.includes('router.push("/subscription"') &&
          !content.includes('route: "/subscription"'),
        `File ${path.relative(ROOT, filePath)} must not navigate to /subscription`
      )
    }

    // Deleted pages must not exist
    assert.equal(
      fs.existsSync(path.join(ROOT, "app/(dashboard)/subscription")),
      false,
      "app/(dashboard)/subscription must be deleted"
    )
    assert.equal(
      fs.existsSync(path.join(ROOT, "app/(dashboard)/settings/subscription")),
      false,
      "app/(dashboard)/settings/subscription must be deleted"
    )
    assert.equal(
      fs.existsSync(path.join(ROOT, "apps/mobile/src/app/subscription.tsx")),
      false,
      "apps/mobile/src/app/subscription.tsx must be deleted"
    )
  })
})
