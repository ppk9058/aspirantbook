import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"
import { PASS_INCLUDED_FEATURES, PASS_SCOPE_SUMMARY } from "@/lib/payments/pass-marketing"
import {
  PASS_POPUP_QUERY_PARAM,
  PYQ_PASS_FALLBACK_PATH,
  buildPassLoginHref,
  buildPassReturnPath,
  consumePassPopupParam,
  evaluatePyqLockState,
  hasPendingPassPopup,
} from "@/lib/pyqs/pass-popup"

const ROOT = path.resolve(__dirname, "../..")
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8")

test("Pass popup: Rs 499 yearly only, price constant reused", () => {
  assert.equal(PASS_PRICE_INR, 499, "PASS_PRICE_INR must be 499")

  const hook = read("lib/pyqs/usePyqPassUnlock.ts")
  assert.ok(hook.includes("price: PASS_PRICE_INR"), "Pass popup item must use PASS_PRICE_INR")
  assert.ok(hook.includes('id: "YEARLY"'), "Pass popup item must request the YEARLY plan")
  assert.ok(hook.includes('type: "subscription"'), "Pass popup must use the subscription checkout flow")
  assert.ok(
    hook.includes("useSamePageBuyNow"),
    "Pass popup must reuse the existing same-page Razorpay hook, not a second integration"
  )
  assert.ok(!hook.includes("createCheckoutSession"), "Pass popup must not use Stripe checkout")
  assert.ok(!hook.includes("couponCode"), "Pass popup must not send a coupon")
  assert.ok(hook.includes("router.refresh()"), "After verified payment the same page must refresh")
  assert.ok(!hook.includes("router.push("), "The Pass popup must not navigate away after payment")
})

test("Pass return path: keeps the same PYQ page and adds the one-shot trigger", () => {
  assert.equal(buildPassReturnPath("/pyqs"), `${PYQ_PASS_FALLBACK_PATH}?${PASS_POPUP_QUERY_PARAM}=1`)
  assert.equal(
    buildPassReturnPath("/pyqs/pdf-view?paperId=paper_123"),
    "/pyqs/pdf-view?paperId=paper_123&passPopup=1"
  )
  assert.equal(
    buildPassReturnPath("/pyqs/bpsc?passPopup=1"),
    "/pyqs/bpsc?passPopup=1",
    "Trigger must never be duplicated"
  )
  assert.equal(
    buildPassReturnPath("/pyqs?passPopup=0"),
    "/pyqs?passPopup=1",
    "Trigger must be normalised to the single accepted value"
  )
})

test("Pass return path: unsafe/external values fall back to the PYQ listing", () => {
  const fallback = `${PYQ_PASS_FALLBACK_PATH}?passPopup=1`
  for (const unsafe of [
    "https://attacker.example.com/pyqs",
    "//attacker.example.com",
    "javascript:alert(1)",
    "/\\evil.com",
    "/pyqs\r\nSet-Cookie: evil=true",
  ]) {
    assert.equal(buildPassReturnPath(unsafe), fallback, `Unsafe path must fall back: ${unsafe}`)
  }
  assert.equal(buildPassReturnPath(null), fallback)
  assert.equal(buildPassReturnPath(undefined), fallback)
})

test("Pass login href: /login with an encoded, sanitized callbackUrl to the same page", () => {
  const href = buildPassLoginHref("/pyqs/pdf-view?paperId=paper_123")
  assert.ok(href.startsWith("/login?callbackUrl="), "Guest must be sent to /login")

  const callbackUrl = decodeURIComponent(href.slice("/login?callbackUrl=".length))
  assert.equal(callbackUrl, "/pyqs/pdf-view?paperId=paper_123&passPopup=1")

  const unsafeHref = buildPassLoginHref("https://attacker.example.com/steal")
  const unsafeCallback = decodeURIComponent(unsafeHref.slice("/login?callbackUrl=".length))
  assert.equal(unsafeCallback, "/pyqs?passPopup=1", "External return path must be dropped")
})

test("Pass popup trigger: consumed once and stripped from the URL", () => {
  assert.deepEqual(consumePassPopupParam("/pyqs?passPopup=1"), {
    requested: true,
    cleanPath: "/pyqs",
  })
  assert.deepEqual(consumePassPopupParam("/pyqs/pdf-view?paperId=p1&passPopup=1"), {
    requested: true,
    cleanPath: "/pyqs/pdf-view?paperId=p1",
  })
  assert.deepEqual(consumePassPopupParam("/pyqs"), { requested: false, cleanPath: "/pyqs" })

  // Once cleaned, a refresh or a Back navigation no longer asks for the popup.
  const first = consumePassPopupParam("/pyqs?passPopup=1")
  assert.deepEqual(consumePassPopupParam(first.cleanPath), {
    requested: false,
    cleanPath: "/pyqs",
  })
})

test("Open-popup-once guard", () => {
  assert.equal(hasPendingPassPopup({ requested: true, alreadyHandled: false, passUnlockRequired: true }), true)
  assert.equal(hasPendingPassPopup({ requested: false, alreadyHandled: false, passUnlockRequired: true }), false)
  assert.equal(hasPendingPassPopup({ requested: true, alreadyHandled: true, passUnlockRequired: true }), false)
  assert.equal(hasPendingPassPopup({ requested: true, alreadyHandled: false, passUnlockRequired: false }), false)

  // A Back navigation hits /login -> middleware -> the trigger URL again; the
  // per-tab marker must stop the popup from reopening.
  assert.equal(
    hasPendingPassPopup({ requested: true, alreadyHandled: true, passUnlockRequired: true }),
    false,
    "Back navigation into the callback must not reopen the popup"
  )

  const hook = read("lib/payments/usePassPurchaseModal.ts")
  assert.ok(
    hook.includes("PASS_POPUP_HANDLED_STORAGE_KEY"),
    "Auto-open must remember that this tab already opened the popup"
  )
  assert.ok(
    hook.includes("router.replace(cleanPath"),
    "The trigger must be consumed from the URL before opening"
  )
  // One shared open-state hook: the PYQ surfaces must not re-implement the
  // return-path / once-per-tab guard themselves.
  const pyqHook = read("lib/pyqs/usePyqPassUnlock.ts")
  assert.ok(pyqHook.includes("usePassPurchaseModal"), "PYQ surfaces must reuse the shared Pass hook")
  assert.ok(
    !pyqHook.includes("PASS_POPUP_HANDLED_STORAGE_KEY"),
    "PYQ surfaces must not duplicate the popup guard"
  )
})

test("Locked-state decision: paid/PASS_ONLY and canAccess", () => {
  assert.equal(evaluatePyqLockState({ accessType: "PAID", canAccess: false }), "locked")
  assert.equal(evaluatePyqLockState({ accessType: "PASS_ONLY", canAccess: false }), "locked")
  assert.equal(evaluatePyqLockState({ accessType: "PAID", canAccess: true }), "unlocked")
  assert.equal(evaluatePyqLockState({ accessType: "PASS_ONLY", canAccess: true }), "unlocked")
  assert.equal(evaluatePyqLockState({ accessType: "FREE", canAccess: true }), "unlocked")
  // Payloads without canAccess fall back to accessType
  assert.equal(evaluatePyqLockState({ accessType: "PASS_ONLY" }), "locked")
  assert.equal(evaluatePyqLockState({ accessType: "paid" }), "locked")
  assert.equal(evaluatePyqLockState({ accessType: "FREE" }), "free")
  assert.equal(evaluatePyqLockState({}), "free")
})

test("Wiring: locked PYQ surfaces open the Pass popup instead of linking to /pricing", () => {
  const listing = read("components/pyqs/PyqStudentListingClient.tsx")
  assert.ok(listing.includes("usePyqPassUnlock"), "Listing must reuse the shared Pass popup hook")
  assert.ok(listing.includes("buildPassLoginHref"), "Guests must get a /login return path")
  assert.ok(listing.includes('data-testid="pyq-pass-unlock-cta"'), "Locked CTA must be identifiable")
  assert.ok(!listing.includes('href="/pricing"'), "Locked PYQ buttons must not navigate to /pricing")

  const pdfView = read("app/(dashboard)/pyqs/pdf-view/page.tsx")
  assert.ok(pdfView.includes("usePyqPassUnlock"), "PDF view Pass card must reuse the shared hook")
  assert.ok(pdfView.includes("buildPassLoginHref"), "PDF view login card must carry a return path")
  assert.ok(pdfView.includes('data-testid="pyq-pass-unlock-cta"'), "PDF view Pass CTA must be identifiable")
  assert.ok(!pdfView.includes('href="/pricing"'), "PDF view Pass card must not navigate to /pricing")
})

test("Copy: Pass marketing no longer claims video courses / all courses", () => {
  assert.ok(
    PASS_INCLUDED_FEATURES.some((feature) => /PYQ/i.test(feature)),
    "Included list must mention PYQs"
  )
  assert.ok(/test series/i.test(PASS_SCOPE_SUMMARY), "Scope summary must mention test series")
  assert.ok(/not|separately/i.test(PASS_SCOPE_SUMMARY), "Scope summary must state what is excluded")
  assert.ok(!/all courses/i.test(PASS_SCOPE_SUMMARY), "Scope summary must not claim all courses")

  const checkout = read("app/checkout/page.tsx")
  assert.ok(!checkout.includes("Full unlimited access to all courses"), "Checkout Pass card copy must be fixed")
  assert.ok(checkout.includes("PASS_SCOPE_SUMMARY"), "Checkout Pass card must use the shared scope copy")

  for (const surface of ["app/pricing/page.tsx", "app/(dashboard)/subscription/page.tsx"]) {
    const file = read(surface)
    assert.ok(!file.includes("Access to all courses"), `${surface} must not claim all courses`)
    assert.ok(file.includes("PASS_INCLUDED_FEATURES"), `${surface} must use the shared Pass features`)
  }

  const pricingButton = read("components/pricing/PricingPlanButton.tsx")
  assert.ok(!pricingButton.includes("Access to all courses"), "Pass order summary must not claim all courses")
  assert.ok(pricingButton.includes("PASS_INCLUDED_FEATURES"), "Pass order summary must use the shared features")
})
