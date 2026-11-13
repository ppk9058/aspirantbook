import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  whatsappSupportHref,
  SUPPORT_WHATSAPP_NUMBER,
} from "../../components/layout/WhatsAppButton"

/**
 * Mobile UX pass 5 — owner-requested changes and fixes.
 *
 * 1. Bookstore: no exam/category chip row; the header carries the same profile
 *    features as every other page (hamburger + brand + profile menu).
 * 2. The floating AI launcher is replaced by a WhatsApp support deep link to
 *    8340665934 (web) and the same support channel in the native app.
 * 3. Course status categorisation (Enrolled / Completed / Bookmarked tabs and
 *    the Enrolled / % Completed status chip) is removed; fake progress eliminated.
 * 4. Post-test review layout no longer overlaps or clips option text on web or Expo.
 * 5. Landing mobile navigation renders via React portal to document.body, has
 *    full-viewport height, z-index above header, and body scroll locking.
 */

const ROOT = process.cwd()

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relPath), "utf-8")
}

function exists(relPath: string): boolean {
  return fs.existsSync(path.resolve(ROOT, relPath))
}

describe("Mobile UX pass 5 — bookstore header carries the profile features", () => {
  const header = readRepoFile("components/books/BookStoreHeader.tsx")
  const booksPage = readRepoFile("app/(dashboard)/books/page.tsx")

  it("the category chip row and its filtering logic are gone", () => {
    assert.doesNotMatch(booksPage, /BOOK_CHIP_CATEGORIES/)
    assert.doesNotMatch(booksPage, /bookMatchesChip/)
    assert.doesNotMatch(booksPage, /selectedChip/)
    assert.doesNotMatch(booksPage, /CHIP FILTER BAR/)
    // Search and sort must survive the removal.
    assert.match(booksPage, /sortBy/)
    assert.match(booksPage, /searchQuery/)
  })

  it("the title no longer depends on a selected category", () => {
    assert.match(booksPage, /All eBooks &amp; Study Material/)
    assert.doesNotMatch(booksPage, /selectedChip === "All" \?/)
  })

  it("phones get the hamburger + profile menu like every other page", () => {
    assert.match(header, /data-testid="books-header-hamburger"/)
    assert.match(header, /<MobileDrawer/)
    assert.match(header, /<ProfileDropdown/)
    assert.match(header, /aria-label="Open navigation menu"/)
    // Desktop keeps its original single row with the profile menu.
    assert.match(header, /hidden lg:flex/)
  })

  it("header controls are not duplicated across the two layouts", () => {
    // One instance of each shared block, composed into both rows.
    assert.equal((header.match(/const searchField =/g) || []).length, 1)
    assert.equal((header.match(/const wishlistLink =/g) || []).length, 1)
    assert.equal((header.match(/const cartButton =/g) || []).length, 1)
    assert.equal((header.match(/\{searchField\}/g) || []).length, 2)
  })

  it("BookStoreHeader portals MobileDrawer to document.body", () => {
    assert.match(header, /createPortal/)
    assert.match(header, /document\.body/)
  })
})

describe("Mobile UX pass 5 — WhatsApp replaces the floating AI launcher", () => {
  const launcher = readRepoFile("components/layout/WhatsAppButton.tsx")
  const shell = readRepoFile("components/layout/DashboardShell.tsx")

  it("the mock AI chat component is deleted and nothing imports it", () => {
    assert.equal(exists("components/layout/Chatbot.tsx"), false)
    assert.doesNotMatch(shell, /Chatbot/)
  })

  it("the launcher is a wa.me deep link to the support number", () => {
    assert.match(launcher, /export const SUPPORT_WHATSAPP_NUMBER = "8340665934"/)
    assert.match(launcher, /https:\/\/wa\.me\/\$\{SUPPORT_WHATSAPP_E164\}/)
    assert.match(launcher, /target="_blank"/)
    assert.match(launcher, /rel="noopener noreferrer"/)
    assert.match(launcher, /data-testid="whatsapp-fab"/)
    // Accessible name announces the channel and the number.
    assert.match(launcher, /aria-label=\{`Chat with AspirantBook support on WhatsApp/)
    // Focus visible styling exists
    assert.match(launcher, /focus-visible:ring-2/)
  })

  it("pure function whatsappSupportHref builds valid URLs with E.164 and encoded text", () => {
    assert.equal(SUPPORT_WHATSAPP_NUMBER, "8340665934")
    const defaultUrl = whatsappSupportHref()
    assert.equal(
      defaultUrl,
      "https://wa.me/918340665934?text=Hi%20AspirantBook%20team%2C%20I%20need%20help%20with%20my%20preparation."
    )
    const customUrl = whatsappSupportHref("Need batch help")
    assert.equal(customUrl, "https://wa.me/918340665934?text=Need%20batch%20help")
  })

  it("keeps the clearance slot the shared bottom padding was written for", () => {
    assert.match(
      launcher,
      /fixed bottom-\[calc\(4\.25rem\+env\(safe-area-inset-bottom,0px\)\)\] lg:bottom-6 right-3 sm:right-5 z-40 h-10 w-10 sm:h-12 sm:w-12/
    )
    assert.match(shell, /WhatsAppButton/)
  })

  it("is still hidden on full-screen examination flows", () => {
    for (const segment of ["/attempt", "/result", "/solutions", "/instructions", "/take"]) {
      assert.ok(
        launcher.includes(`pathname.includes("${segment}")`),
        `WhatsApp launcher must stay hidden on ${segment}`
      )
    }
  })

  it("the native app exposes the same number through one helper", () => {
    const webLinks = readRepoFile("apps/mobile/src/lib/web-links.ts")
    assert.match(webLinks, /export const SUPPORT_WHATSAPP_NUMBER = "8340665934"/)
    assert.match(webLinks, /https:\/\/wa\.me\/\$\{SUPPORT_WHATSAPP_E164\}/)

    const sheet = readRepoFile("apps/mobile/src/components/shell/MobileProfileSheet.tsx")
    assert.match(sheet, /buildWhatsAppSupportUrl/)
    assert.match(sheet, /testID="profile-sheet-whatsapp"/)
    // No silent failure: an unopenable link surfaces a visible message.
    assert.match(sheet, /setSupportError/)
    assert.match(sheet, /accessibilityLiveRegion="polite"/)
  })
})

describe("Mobile UX pass 5 — course status categorisation removed", () => {
  const courseClient = readRepoFile("components/courses/CourseClient.tsx")
  const myLearning = readRepoFile("components/learning/MyLearningClient.tsx")
  const courseCard = readRepoFile("components/courses/CourseCard.tsx")

  it("the courses page has no Enrolled / Completed / Bookmarked tabs", () => {
    assert.doesNotMatch(courseClient, /label: 'Enrolled'/)
    assert.doesNotMatch(courseClient, /label: 'Completed'/)
    assert.doesNotMatch(courseClient, /label: 'Bookmarked'/)
    assert.doesNotMatch(courseClient, /activeTab === 'my'/)
    // Topic category pills are not enrolment status and must stay.
    assert.match(courseClient, /categoryTabs/)
    assert.match(courseClient, /variant="pills"/)
  })

  it("the fake 35% progress on every enrolled card is gone and progress bar renders only when progress > 0", () => {
    assert.doesNotMatch(courseClient, /progress=\{enrolledCourseIds\.includes\(course\.id\) \? 35 : 0\}/)
    assert.match(courseClient, /progress=\{0\}/)
    assert.match(courseCard, /enrolled && typeof progress === "number" && progress > 0/)
  })

  it("My Learning shows one list with no status tabs or status chip", () => {
    assert.doesNotMatch(myLearning, /activeTab/)
    assert.doesNotMatch(myLearning, /inProgressCourses/)
    assert.doesNotMatch(myLearning, /completedCourses/)
    assert.doesNotMatch(myLearning, /Demo Watched/)
    assert.doesNotMatch(myLearning, /% Completed/)
    // Sorting survives.
    assert.match(myLearning, /sortBy/)
  })

  it("the shared toolbar still renders pages that have no tab row", () => {
    const toolbar = readRepoFile("components/layout/StudentPageToolbar.tsx")
    assert.match(toolbar, /tabs\?: ReactNode/)
    assert.match(toolbar, /\{tabs \?/)
  })
})

describe("Mobile UX pass 5 — post-test review layout", () => {
  const solutions = readRepoFile("app/(exam)/test-series/[id]/solutions/SolutionsClient.tsx")
  const resultPage = readRepoFile("app/(exam)/test-series/[id]/result/page.tsx")
  const reviewAll = readRepoFile("components/exam/ReviewAllQuestions.tsx")

  it("SolutionsClient: options stack the verdict under the text on phones so long options wrap fully", () => {
    assert.match(solutions, /flex flex-col gap-2 rounded-xl border-2 p-3\.5[^`]*sm:flex-row sm:items-center sm:justify-between/)
    assert.match(solutions, /min-w-0 break-words text-sm leading-snug/)
  })

  it("result/page.tsx: options stack the verdict under the text on phones and wrap words", () => {
    assert.match(resultPage, /flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-2\.5/)
    assert.match(resultPage, /whitespace-pre-line break-words/)
  })

  it("ReviewAllQuestions: options stack the verdict under the text on phones and wrap words", () => {
    assert.match(reviewAll, /flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-2\.5/)
    assert.match(reviewAll, /whitespace-pre-line break-words/)
  })

  it("the question meta row wraps instead of pushing the bookmark off-screen", () => {
    assert.match(solutions, /flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row/)
    assert.match(solutions, /aria-label="Bookmark question"/)
  })

  it("the filter chips scroll without clipping and the metrics ribbon wraps", () => {
    assert.match(solutions, /overflow-x-auto no-scrollbar snap-x/)
    assert.match(solutions, /shrink-0 snap-start/)
    assert.match(solutions, /flex shrink-0 flex-wrap items-center justify-between/)
  })

  it("the native review screen is safe-area aware and scrolls its filter chips", () => {
    const native = readRepoFile("apps/mobile/src/app/tests/[id]/solutions.tsx")
    assert.match(native, /useSafeAreaInsets/)
    assert.match(native, /56 \+ insets\.bottom/)
    assert.match(native, /paddingBottom: 80 \+ insets\.bottom/)
    assert.match(native, /horizontal\n\s+showsHorizontalScrollIndicator=\{false\}/)
    assert.match(native, /optionTextWrap: \{\n\s+flex: 1,\n\s+minWidth: 0,/)
  })
})

describe("Mobile UX pass 5 — landing hamburger drawer portal & scroll lock", () => {
  const landingNav = readRepoFile("components/home/LandingMobileNav.tsx")
  const drawer = readRepoFile("components/layout/MobileDrawer.tsx")

  it("LandingMobileNav renders MobileDrawer via createPortal to document.body", () => {
    assert.match(landingNav, /import \{ createPortal \} from "react-dom"/)
    assert.match(landingNav, /createPortal\(\s*<MobileDrawer/)
    assert.match(landingNav, /document\.body/)
    // Mount flag for SSR safety
    assert.match(landingNav, /const \[mounted, setMounted\] = useState\(false\)/)
  })

  it("MobileDrawer has full-viewport height, z-index above header, and solid background", () => {
    assert.match(drawer, /z-\[60\]/)
    assert.match(drawer, /h-dvh max-h-dvh/)
    assert.match(drawer, /bg-white dark:bg-slate-900/)
    assert.match(drawer, /bg-slate-950\/60 backdrop-blur-xs/)
  })

  it("MobileDrawer locks body scrolling while open and restores on close", () => {
    assert.match(drawer, /document\.body\.style\.overflow = "hidden"/)
    assert.match(drawer, /document\.body\.style\.overflow = originalOverflow/)
  })

  it("MobileDrawer handles Escape key, route changes, and initial focus", () => {
    assert.match(drawer, /e\.key === "Escape"/)
    assert.match(drawer, /pathname/)
    assert.match(drawer, /closeBtnRef\.current\?\.focus\(\)/)
  })
})
