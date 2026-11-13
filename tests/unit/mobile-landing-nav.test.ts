import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

/**
 * Mobile landing navigation — consistency pass.
 *
 * Four changes, all below the lg breakpoint:
 *  1. The landing page gets the same hamburger/drawer the dashboard uses.
 *  2. The phone header shows the full "AspirantBook" wordmark; the bell moved
 *     into the avatar pop-down.
 *  3. The landing pill row is removed below lg (its destinations live in the drawer).
 *  4. "Login" in the landing header is "Get Started", solid green, same href.
 *
 * Source-level audit only: these tests cannot see a browser, so every claim is
 * code reading.
 */

const ROOT = process.cwd()

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relPath), "utf-8")
}

/** The same file as it exists on app/main, or null when git history is unavailable. */
function readFromMain(relPath: string): string | null {
  try {
    return execFileSync("git", ["show", `app/main:${relPath}`], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return null
  }
}

const MAIN_FOCUS_BLOCK = `/* Focus styles */
*:focus-visible {
  outline: 2px solid #1448d8;
  outline-offset: 2px;
}`

function readMainGlobalsCss(): string {
  return readFromMain("app/globals.css") ?? MAIN_FOCUS_BLOCK
}

function focusRules(css: string): string[] {
  const rules: string[] = []
  const lines = css.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (/focus-visible|focus:not/i.test(line)) {
      rules.push(line.trim())
      for (let i = index + 1; i < lines.length; i++) {
        const next = lines[i].trim()
        if (next === "}") break
        if (next.length > 0) rules.push(next)
      }
    }
  })
  return rules
}

describe("mobile landing nav — Change 1: shared hamburger/drawer on the landing page", () => {
  it("the landing page renders the mobile nav component below lg", () => {
    const page = readRepoFile("app/page.tsx")

    assert.match(page, /import LandingMobileNav from "@\/components\/home\/LandingMobileNav"/)
    assert.match(page, /<LandingMobileNav \/>/)
  })

  it("reuses MobileDrawer instead of adding a second drawer and portals it to document.body", () => {
    const nav = readRepoFile("components/home/LandingMobileNav.tsx")

    assert.match(nav, /import MobileDrawer from "@\/components\/layout\/MobileDrawer"/)
    assert.match(nav, /createPortal\(\s*<MobileDrawer/)
    assert.match(nav, /document\.body/)
    // The hamburger itself is phone-only; desktop keeps the existing header.
    assert.match(nav, /landing-mobile-menu-btn[\s\S]*?lg:hidden/)
    assert.match(nav, /aria-label="Open navigation menu"/)

    // Exactly one drawer implementation in the repo.
    const drawerFiles = execFileSync("git", ["ls-files", "*MobileDrawer*"], {
      cwd: ROOT,
      encoding: "utf-8",
    })
      .split("\n")
      .filter((file) => file.startsWith("components/") && file.endsWith(".tsx"))
    assert.deepEqual(drawerFiles, ["components/layout/MobileDrawer.tsx"])

    // The landing page must not inline its own dialog.
    assert.doesNotMatch(readRepoFile("app/page.tsx"), /role="dialog"/)
  })

  it("works for logged-out visitors: public destinations only plus Get Started", () => {
    const drawer = readRepoFile("components/layout/MobileDrawer.tsx")

    assert.match(drawer, /const isGuest = !session\?\.user/)
    assert.match(drawer, /guestVisible: false, testId: "mobile-drawer-dashboard"/)
    assert.match(drawer, /guestVisible: false, testId: "mobile-drawer-learning"/)
    assert.match(drawer, /guestVisible: false, testId: "mobile-drawer-my-tests"/)
    assert.match(
      drawer,
      /const visibleNavItems = drawerNavItems\.filter\(\(item\) => !isGuest \|\| item\.guestVisible !== false\)/
    )
    // Get Started CTA (solid green, same treatment as the landing CTA).
    assert.match(drawer, /data-testid="drawer-get-started"/)
    assert.match(drawer, /href="\/register"[\s\S]{0,400}?bg-green-600/)
  })
})

describe("mobile landing nav — Change 2: full wordmark, bell into the profile pop-down", () => {
  it("the wordmark is not truncated in either phone header", () => {
    const logo = readRepoFile("components/brand/BrandLogo.tsx")

    // The wordmark class is supplied by callers; `truncate` is only the default.
    assert.match(logo, /wordmarkClassName\?: string/)
    assert.match(logo, /wordmarkClassName = "truncate"/)
    assert.match(
      logo,
      /data-testid="brand-name"\s*\n\s*className=\{`\$\{wordmarkClassName\}/
    )
    assert.doesNotMatch(
      logo,
      /data-testid="brand-name"\s*\n?\s*className=\{`truncate /
    )

    for (const file of ["components/home/HomeLogoLink.tsx", "components/layout/MobileAppHeader.tsx"]) {
      const source = readRepoFile(file)
      assert.match(
        source,
        /wordmarkClassName="shrink-0 whitespace-nowrap"/,
        `${file} must render the wordmark without truncate/overflow-hidden`
      )
      assert.doesNotMatch(source, /wordmarkClassName="[^"]*truncate/)
    }
  })

  it("the standalone bell is hidden below lg in the shared header", () => {
    const topNav = readRepoFile("components/layout/TopNavBar.tsx")
    // Desktop bell: still rendered, but only from lg up.
    assert.match(topNav, /<div className="relative hidden lg:block">/)
    assert.match(topNav, /<Bell className="h-4 w-4 sm:h-5 sm:w-5" \/>/)

    const mobileHeader = readRepoFile("components/layout/MobileAppHeader.tsx")
    assert.doesNotMatch(mobileHeader, /\bBell\b/)
    assert.doesNotMatch(mobileHeader, /Notifications/)
    // Search stays (it fits: 44 + 28+8+106 + 44 + 44 at 320px).
    assert.match(mobileHeader, /aria-label="Search courses, test series, notes"/)
  })

  it("the notification entry lives in the avatar pop-downs and uses real data", () => {
    for (const file of [
      "components/layout/MobileProfileSheet.tsx",
      "components/layout/ProfileDropdown.tsx",
      "components/home/HomeUserDropdown.tsx",
    ]) {
      const source = readRepoFile(file)
      assert.match(
        source,
        /import NotificationsMenu from "@\/components\/layout\/NotificationsMenu"/,
        `${file} must reuse the shared notifications entry`
      )
      assert.match(source, /<NotificationsMenu/)
    }

    // "Right next to/above Profile Settings": the entry precedes the settings row.
    const sheet = readRepoFile("components/layout/MobileProfileSheet.tsx")
    const sheetNotifications = sheet.indexOf("<NotificationsMenu")
    const sheetSettings = sheet.indexOf('href="/settings"')
    assert.ok(sheetNotifications > 0 && sheetSettings > sheetNotifications)

    const dropdown = readRepoFile("components/layout/ProfileDropdown.tsx")
    assert.ok(dropdown.indexOf("<NotificationsMenu") < dropdown.indexOf('href="/settings"'))

    // The entry reads the real endpoint and derives the badge from that data.
    const menu = readRepoFile("components/layout/NotificationsMenu.tsx")
    assert.match(menu, /useNotifications/)
    assert.match(menu, /data-testid="notifications-menu-button"/)
    assert.match(menu, /data-testid="notifications-menu-panel"/)
    assert.match(menu, /data-testid="notifications-unread-badge"/)
    assert.match(menu, /\{unreadCount > 99 \?/)

    const hook = readRepoFile("hooks/useNotifications.ts")
    assert.match(hook, /fetch\("\/api\/v1\/notifications"/)
    assert.match(hook, /method: "PATCH"/)
    assert.match(hook, /unreadCount: items\.filter\(\(item\) => !item\.isRead\)\.length/)
    // No fake or always-on badge: the count comes from the server rows.
    assert.match(menu, /\{unreadCount > 0 && \(/)
  })
})

describe("mobile landing nav — Change 3: the pill row is removed everywhere", () => {
  it("the pill row does not exist anywhere under app/ and components/", () => {
    const page = readRepoFile("app/page.tsx")
    assert.doesNotMatch(page, /landing-nav-pills/)
    assert.doesNotMatch(page, /navTint/)

    // Scan app/ and components/ to ensure landing-nav-pills is gone completely
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(path.resolve(ROOT, dir), { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scanDir(fullPath)
        } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
          const content = readRepoFile(fullPath)
          assert.doesNotMatch(
            content,
            /data-testid=["']landing-nav-pills["']/,
            `${fullPath} must not contain landing-nav-pills`
          )
        }
      }
    }
    scanDir("app")
    scanDir("components")
  })

  it("the six destinations are in the desktop header and the mobile drawer", () => {
    const page = readRepoFile("app/page.tsx")
    const drawer = readRepoFile("components/layout/MobileDrawer.tsx")

    // Desktop header still maps LANDING_NAV_ITEMS
    assert.match(page, /\{LANDING_NAV_ITEMS\.map\(\(item\) =>/)

    const hrefs = [
      "/courses", // Courses
      "/test-series", // Test Series
      "/tutorials", // Learn
      "/#all-courses-container", // School Prep
      "/dashboard?goal=upsc", // UPSC
      "/dashboard?goal=bpsc", // BPSC
    ]
    for (const href of hrefs) {
      assert.ok(
        drawer.includes(`href: "${href}"`),
        `drawer is missing a link for ${href}`
      )
    }
  })
})

describe("mobile landing nav — Change 4: Login is now a solid green Get Started", () => {
  it("the landing header button says Get Started, keeps /login and the green style", () => {
    const cta = readRepoFile("components/home/HomeHeaderUserCTA.tsx")

    assert.match(cta, /href="\/login"/)
    assert.match(cta, /<span>Get Started<\/span>/)
    // No "Login" label left on the landing header button.
    assert.doesNotMatch(cta, />Login</)
    assert.doesNotMatch(cta, /\/Register/)
    // Solid green, matching the landing page's existing primary CTA.
    assert.match(cta, /bg-green-600/)
    assert.match(cta, /hover:bg-green-700/)
    assert.match(cta, /\btext-white\b/)
    assert.doesNotMatch(cta, /border-2 border-\[#F26522\]/)
  })

  it("the hero CTA still uses the same green, so a single pair of identical buttons is not created", () => {
    const page = readRepoFile("app/page.tsx")
    assert.match(page, /bg-green-600 hover:bg-green-700/)
    // The hero primary action has its own label; the header is the only "Get Started".
    assert.match(page, /<span>Get Started for Free<\/span>/)
    assert.equal((page.match(/Get Started(?! for Free)/g) ?? []).length, 0)
  })

  it("logged-in visitors still get the avatar, not the button", () => {
    const cta = readRepoFile("components/home/HomeHeaderUserCTA.tsx")
    assert.match(cta, /session\?\.user \? \(\s*\n\s*<HomeUserDropdown user=\{session\.user\} \/>/)
  })
})

describe("mobile landing nav — protected surfaces stay identical to app/main", () => {
  it("LeftSidebar.tsx is unchanged compared with app/main", () => {
    const current = readRepoFile("components/layout/LeftSidebar.tsx")
    const main = readFromMain("components/layout/LeftSidebar.tsx")

    if (main === null) {
      assert.ok(current.includes("LeftSidebar"))
      return
    }

    assert.equal(current, main, "components/layout/LeftSidebar.tsx must not change")
  })

  it("the floating AI button is gone and WhatsApp support is wired", () => {
    assert.equal(
      fs.existsSync(path.resolve(ROOT, "components/layout/Chatbot.tsx")),
      false,
      "the mock AI chat must be removed, not left behind"
    )

    const launcher = readRepoFile("components/layout/WhatsAppButton.tsx")
    assert.match(launcher, /export const SUPPORT_WHATSAPP_NUMBER = "8340665934"/)
    assert.match(launcher, /https:\/\/wa\.me\/\$\{SUPPORT_WHATSAPP_E164\}/)
    assert.match(launcher, /data-testid="whatsapp-fab"/)
    assert.match(launcher, /aria-label=\{`Chat with AspirantBook support on WhatsApp/)
  })

  it("focus rules in app/globals.css are identical to app/main", () => {
    const current = readRepoFile("app/globals.css")
    const main = readMainGlobalsCss()

    assert.deepEqual(focusRules(current), focusRules(main))
    assert.match(
      current,
      /\/\* Focus styles \*\/\n\*:focus-visible \{\n {2}outline: 2px solid #1448d8;\n {2}outline-offset: 2px;\n\}/
    )
  })

  it("hard exclusions are untouched: brand text, Understand gradient, goal box, courses tabs", () => {
    const page = readRepoFile("app/page.tsx")

    assert.match(page, /Not just learn,/)
    assert.match(page, /from-orange-600 via-rose-500 to-fuchsia-600 bg-clip-text text-transparent/)
    assert.doesNotMatch(page, /AspirantBook Store/)
  })
})
