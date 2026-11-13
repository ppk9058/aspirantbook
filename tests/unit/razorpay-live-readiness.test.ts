import test, { describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

/**
 * Razorpay live-mode readiness guards (source-level, no DB required).
 *
 * 1. A Pass order must be rejected server-side when the user already holds a Pass.
 * 2. Refund webhooks must mark the Payment REFUNDED and revoke Pass entitlement.
 */

const ROOT = process.cwd()

function readRepoFile(relPath: string): string {
    return fs.readFileSync(path.resolve(ROOT, relPath), "utf-8")
}

describe("createRazorpayOrder — duplicate Pass purchase guard", () => {
    const source = readRepoFile("lib/actions/payment/razorpay.ts")

    test("imports hasActivePass from the canonical entitlement module", () => {
        assert.match(source, /import \{ hasActivePass \} from "@\/lib\/auth\/entitlements"/)
    })

    test("rejects a second Pass order with the canonical message", () => {
        assert.match(
            source,
            /if \(!courseId\) \{\s*const alreadyHasPass = await hasActivePass\(userId\)\s*if \(alreadyHasPass\) \{\s*throw new Error\("You already have an active AspirantBook Pass"\)/,
            "Pass order must be rejected when the user already has an active Pass"
        )
    })

    test("the guard runs before any Razorpay order is created", () => {
        const guardIdx = source.indexOf("You already have an active AspirantBook Pass")
        const orderCallIdx = source.indexOf("orders.create")
        assert.ok(guardIdx > 0, "guard missing")
        assert.ok(orderCallIdx > 0, "orders.create missing")
        assert.ok(guardIdx < orderCallIdx, "guard must run before orders.create")
    })

    test("course orders are not blocked by the Pass guard", () => {
        assert.match(source, /if \(!courseId\) \{[\s\S]{0,400}hasActivePass\(userId\)/)
    })
})

describe("Razorpay refund webhook handling", () => {
    const source = readRepoFile("lib/payments/razorpay-webhook.ts")

    test("handles both refund.created and refund.processed", () => {
        assert.match(
            source,
            /event\.event === "refund\.created" \|\| event\.event === "refund\.processed"/,
            "refund events must be handled after signature verification"
        )
    })

    test("looks the Payment up by razorpayPaymentId / externalId", () => {
        assert.match(source, /\{ razorpayPaymentId \}/)
        assert.match(source, /\{ externalId: razorpayPaymentId \}/)
    })

    test("marks the payment REFUNDED and stores the refundId in metadata", () => {
        assert.match(source, /status: "REFUNDED"/)
        assert.match(source, /refundId: refundId \?\? null/)
    })

    test("cancels the linked subscription so Pass access is revoked", () => {
        assert.match(source, /if \(refundedPayment\.subscriptionId\)/)
        assert.match(source, /status: "CANCELED"/)
    })

    test("refund handling sits after the signature + replay checks", () => {
        const verifyIdx = source.indexOf("verifyRazorpayWebhookSignature(body, signature)")
        const refundIdx = source.indexOf('event.event === "refund.created"')
        assert.ok(verifyIdx > 0, "signature verification missing")
        assert.ok(refundIdx > verifyIdx, "refund handling must follow signature verification")
    })
})

describe("Guarantee copy alignment", () => {
    test("batch detail page no longer claims an unqualified 100% satisfaction guarantee", () => {
        const source = readRepoFile("app/batches/[slug]/BatchDetailClient.tsx")
        assert.doesNotMatch(source, /100% Satisfaction Guarantee/i)
        assert.match(source, /SSL Encrypted &bull; Verified Digital Content &bull; Instant Access/)
    })

    test("checkout page uses the same trust line", () => {
        const source = readRepoFile("app/checkout/page.tsx")
        assert.doesNotMatch(source, /100% Satisfaction Guarantee/i)
        assert.match(source, /SSL Encrypted &bull; Verified Digital Content &bull; Instant Access/)
    })
})

describe("Policy reachability on mobile and site footers", () => {
    const drawer = readRepoFile("components/layout/MobileDrawer.tsx")

    for (const href of ["/about", "/pricing", "/terms", "/privacy", "/refund", "/shipping", "/contact"]) {
        test(`mobile drawer links to ${href}`, () => {
            assert.ok(drawer.includes(`href: "${href}"`), `drawer must link to ${href}`)
        })
    }

    test("drawer closes on policy navigation", () => {
        assert.match(drawer, /data-testid=\{item\.testId\}/)
        assert.ok(drawer.includes("Policies &amp; Help"), "drawer needs a policies section")
    })

    test("pricing page renders the shared Footer", () => {
        const pricing = readRepoFile("app/pricing/page.tsx")
        assert.match(pricing, /import Footer from "@\/components\/layout\/Footer"/)
        assert.match(pricing, /<Footer \/>/)
        // Fixed mobile buy bar must not cover the footer links
        assert.match(pricing, /pb-\[calc\(11\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]/)
    })

    test("courses page renders the shared Footer", () => {
        const courses = readRepoFile("app/(dashboard)/courses/page.tsx")
        assert.match(courses, /import Footer from "@\/components\/layout\/Footer"/)
        assert.match(courses, /<Footer \/>/)
    })

    test("sitemap includes every public policy route exactly once", () => {
        const sitemap = readRepoFile("app/sitemap.ts")
        for (const route of ["/about", "/shipping", "/terms", "/privacy", "/refund", "/contact", "/pricing"]) {
            const matches = sitemap.split(`\${baseUrl}${route}\``).length - 1
            assert.equal(matches, 1, `${route} must appear exactly once in the sitemap`)
        }
    })
})
