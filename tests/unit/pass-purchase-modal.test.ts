import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"
import { PASS_INCLUDED_FEATURES } from "@/lib/payments/pass-marketing"

const ROOT = path.resolve(__dirname, "../..")
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8")

test("Pass Purchase Modal: uses PASS_PRICE_INR, PASS_INCLUDED_FEATURES, and existing checkout flow", () => {
  assert.equal(PASS_PRICE_INR, 499, "PASS_PRICE_INR must be 499")
  assert.ok(Array.isArray(PASS_INCLUDED_FEATURES) && PASS_INCLUDED_FEATURES.length > 0)

  const modal = read("components/pass/PassPurchaseModal.tsx")
  assert.ok(modal.includes("PASS_PRICE_INR"), "Modal must use PASS_PRICE_INR constant")
  assert.ok(modal.includes("PASS_INCLUDED_FEATURES"), "Modal must use PASS_INCLUDED_FEATURES constant")
  assert.ok(modal.includes("useSamePageBuyNow"), "Modal must reuse useSamePageBuyNow hook")
  assert.ok(modal.includes("PYQ_PASS_BUY_ITEM"), "Modal must reuse PYQ_PASS_BUY_ITEM subscription item")
})

test("Pass Purchase Modal: no forbidden strings (no strike price, no Recommended, no renews/recurring, no coupon, no fake numbers)", () => {
  const modal = read("components/pass/PassPurchaseModal.tsx")

  // No fake MRP / strike prices
  assert.ok(!modal.includes("1199"), "Modal must not contain fake MRP 1199")
  assert.ok(!modal.includes("line-through"), "Modal must not render strike-through price")

  // No 'Recommended' ribbon
  assert.ok(!modal.includes("Recommended"), "Modal must not contain 'Recommended' badge/ribbon")

  // No renews / recurring claims
  assert.ok(!/renews/i.test(modal), "Modal must not contain 'renews'")
  assert.ok(!/recurring/i.test(modal), "Modal must not contain 'recurring'")

  // No coupon box
  assert.ok(!/coupon/i.test(modal), "Modal must not contain coupon input or text")

  // No fake counts
  assert.ok(!modal.includes("150,000+"), "Modal must not claim 150,000+ tests")
  assert.ok(!modal.includes("30,000+"), "Modal must not claim 30,000+ papers")
  assert.ok(!modal.includes("10,000+"), "Modal must not claim 10,000+ notes")
})

test("Pass Purchase Modal: stable test IDs exist", () => {
  const modal = read("components/pass/PassPurchaseModal.tsx")
  assert.ok(modal.includes('data-testid="pass-modal"'), "Modal container must have data-testid='pass-modal'")
  assert.ok(modal.includes('data-testid="pass-modal-close"'), "Close button must have data-testid='pass-modal-close'")
  assert.ok(modal.includes('data-testid="pass-modal-pay-btn"'), "Pay button must have data-testid='pass-modal-pay-btn'")
})

test("Pass Purchase Modal: accessibility attributes and keyboard/backdrop handling exist", () => {
  const modal = read("components/pass/PassPurchaseModal.tsx")
  assert.ok(modal.includes('role="dialog"'), "Modal must have role='dialog'")
  assert.ok(modal.includes('aria-modal="true"'), "Modal must have aria-modal='true'")
  assert.ok(modal.includes('aria-labelledby="pass-modal-heading"'), "Modal must have aria-labelledby")
  assert.ok(modal.includes('document.body.style.overflow = "hidden"'), "Modal must lock body scroll while open")
  assert.ok(modal.includes('"Escape"'), "Modal must handle Escape key to close")
  assert.ok(modal.includes("createPortal"), "Modal must render in a portal")
  assert.ok(modal.includes("z-[70]"), "Modal must sit at z-[70] above drawer and bottom nav")
})

test("Shared Hook: usePassPurchaseModal controls state, guest redirection, auto-open, and active pass guard", () => {
  const hook = read("lib/payments/usePassPurchaseModal.ts")
  assert.ok(hook.includes("buildPassLoginHref"), "Hook must use buildPassLoginHref for guest clicks")
  assert.ok(hook.includes("consumePassPopupParam"), "Hook must consume passPopup query param")
  assert.ok(hook.includes("hasPendingPassPopup"), "Hook must guard auto-open once")
  assert.ok(hook.includes("hasActivePass"), "Hook must not open if user already has an active pass")
})

test("Wiring: test-series list & detail surfaces wire to PassPurchaseModal", () => {
  const listPage = read("app/(dashboard)/test-series/page.tsx")
  assert.ok(listPage.includes("PassPurchaseModal"), "Test series page must include PassPurchaseModal")
  assert.ok(listPage.includes("usePassPurchaseModal"), "Test series page must use usePassPurchaseModal")
  assert.ok(!listPage.includes('href="/subscription"'), "Test series page must not link to /subscription for Get Pass")

  const detailPage = read("app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx")
  assert.ok(detailPage.includes("PassPurchaseModal"), "Test series detail must include PassPurchaseModal")
  assert.ok(detailPage.includes("usePassPurchaseModal"), "Test series detail must use usePassPurchaseModal")
  assert.ok(!detailPage.includes('href="/subscription"'), "Test series detail must not link to /subscription for Get Pass")
})

test("Wiring: EnrollButton paid series path opens PassPurchaseModal and removes package/499 path", () => {
  const enrollBtn = read("components/test-series/EnrollButton.tsx")
  assert.ok(enrollBtn.includes("PassPurchaseModal"), "EnrollButton must include PassPurchaseModal")
  assert.ok(enrollBtn.includes("usePassPurchaseModal"), "EnrollButton must use usePassPurchaseModal")
  assert.ok(!enrollBtn.includes('title: `Test Series Pass (${seriesId})`'), "EnrollButton must remove package/499 path")
})

test("Wiring: PYQ locked CTAs & viewer wire to PassPurchaseModal", () => {
  const pyqListing = read("components/pyqs/PyqStudentListingClient.tsx")
  assert.ok(pyqListing.includes("PassPurchaseModal"), "PYQ listing must include PassPurchaseModal")
  assert.ok(pyqListing.includes("isPassModalOpen"), "PYQ listing must pass isPassModalOpen to modal")

  const pyqPdfView = read("app/(dashboard)/pyqs/pdf-view/page.tsx")
  assert.ok(pyqPdfView.includes("PassPurchaseModal"), "PYQ PDF view must include PassPurchaseModal")
  assert.ok(pyqPdfView.includes("isPassModalOpen"), "PYQ PDF view must pass isPassModalOpen to modal")
})

test("/pricing page is untouched and maintains exactly one [data-testid='pass-buy-now-btn']", () => {
  const pricingPage = read("app/pricing/page.tsx")
  const pricingBtn = read("components/pricing/PassBuyNowButton.tsx")
  assert.ok(pricingBtn.includes('data-testid="pass-buy-now-btn"'), "PassBuyNowButton must retain data-testid='pass-buy-now-btn'")
  assert.ok(pricingPage.includes("PassBuyNowButton"), "Pricing page must render PassBuyNowButton")
})
