import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Task A4: Stripe Lazy Initialization & Health Checks", () => {
  const origStripeKey = process.env.STRIPE_SECRET_KEY;
  const origNodeEnv = process.env.NODE_ENV;
  const origNextPhase = process.env.NEXT_PHASE;
  const origRazorpayKey = process.env.RAZORPAY_KEY_ID;
  const origRazorpaySecret = process.env.RAZORPAY_KEY_SECRET;

  test("1. Module import succeeds with no key during NEXT_PHASE=phase-production-build", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.NEXT_PHASE = "phase-production-build";

    const { stripe, isStripeConfigured } = await import("../../lib/payments/stripe");
    assert.ok(stripe, "Proxy export must exist");
    assert.equal(isStripeConfigured(), false, "isStripeConfigured must be false");
  });

  test("2. Runtime without key fails closed on first payment call with clear error", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXT_PHASE;

    const { createCheckoutSession, stripe } = await import("../../lib/payments/stripe");

    // Must throw at first payment call
    await assert.rejects(
      async () => {
        await createCheckoutSession({
          userId: "u123",
          userEmail: "test@example.com",
          priceId: "price_123",
          successUrl: "http://localhost/success",
          cancelUrl: "http://localhost/cancel",
        });
      },
      {
        name: "Error",
        message: /Stripe is not configured: STRIPE_SECRET_KEY is missing/,
      }
    );

    // Direct proxy access must also throw fail-closed
    assert.throws(
      () => {
        // Accessing any property/method should fail closed when invoking
        void stripe.checkout;
      },
      {
        name: "Error",
        message: /Stripe is not configured: STRIPE_SECRET_KEY is missing/,
      }
    );
  });

  test("3. /api/health returns 'payments: not configured' without leaking secrets", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const { GET } = await import("../../app/api/health/route");
    const res = await GET();
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.payments, "not configured");

    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("secret"), false, "Must not leak secret keys");
    assert.equal(serialized.includes("sk_"), false, "Must not leak stripe keys");
  });

  test("4. /api/health returns 'payments: configured' when key is present", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_mock_configured_key_for_test";

    const { GET } = await import("../../app/api/health/route");
    const res = await GET();
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.payments, "configured");

    delete process.env.STRIPE_SECRET_KEY;
  });

  test("5. No placeholder string remains anywhere in code files", () => {
    const rootDir = path.resolve(__dirname, "../..");
    const targets = ["app", "lib", "tests"];

    const searchTarget = ["sk_test", "placeholder", "for", "build"].join("_");
    function scanDir(dir: string): string[] {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...scanDir(full));
        } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
          if (full.endsWith("stripe-lazy-init.test.ts")) continue;
          const content = fs.readFileSync(full, "utf8");
          if (content.includes(searchTarget)) {
            results.push(full);
          }
        }
      }
      return results;
    }

    const hits: string[] = [];
    for (const t of targets) {
      hits.push(...scanDir(path.join(rootDir, t)));
    }

    assert.equal(hits.length, 0, `Found placeholder in: ${hits.join(", ")}`);
  });

  // Restore env
  process.env.STRIPE_SECRET_KEY = origStripeKey;
  (process.env as any).NODE_ENV = origNodeEnv;
  process.env.NEXT_PHASE = origNextPhase;
  process.env.RAZORPAY_KEY_ID = origRazorpayKey;
  process.env.RAZORPAY_KEY_SECRET = origRazorpaySecret;
});
