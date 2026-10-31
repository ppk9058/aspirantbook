import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  getPaymentMode,
  getRazorpayClient,
  resetRazorpayClientForTests,
} from "@/lib/payments/razorpay-config";
import { getHealthPayload } from "@/lib/health/health-service";
import { handleRazorpayWebhook } from "@/lib/payments/razorpay-webhook";

const env = process.env as Record<string, string | undefined>;

describe("R12-L: Payment mode safety and credentials validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRazorpayClientForTests();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    resetRazorpayClientForTests();
  });

  it("L-R12-01: getPaymentMode returns 'unconfigured' when keys are missing", () => {
    delete env.RAZORPAY_KEY_ID;
    delete env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    assert.equal(getPaymentMode(), "unconfigured");
  });

  it("L-R12-02: getPaymentMode returns 'test' when RAZORPAY_KEY_ID starts with rzp_test_", () => {
    env.RAZORPAY_KEY_ID = "rzp_test_secret123456";
    delete env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    assert.equal(getPaymentMode(), "test");
  });

  it("L-R12-03: getPaymentMode returns 'live' when RAZORPAY_KEY_ID starts with rzp_live_", () => {
    env.RAZORPAY_KEY_ID = "rzp_live_secret123456";
    delete env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    assert.equal(getPaymentMode(), "live");
  });

  it("L-R12-04: getPaymentMode returns 'unconfigured' for invalid key prefix", () => {
    env.RAZORPAY_KEY_ID = "invalid_prefix_key";
    delete env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    assert.equal(getPaymentMode(), "unconfigured");
  });

  it("L-R12-05: getHealthPayload includes paymentMode without leaking key values", async () => {
    env.RAZORPAY_KEY_ID = "rzp_test_sampleKeyId789";
    env.RAZORPAY_KEY_SECRET = "superSecretSecretXYZ";
    const payload = await getHealthPayload();
    assert.ok("paymentMode" in payload, "health payload must include paymentMode");
    assert.equal(payload.paymentMode, "test");

    const payloadJson = JSON.stringify(payload);
    assert.ok(
      !payloadJson.includes("sampleKeyId789"),
      "health payload must not leak key id"
    );
    assert.ok(
      !payloadJson.includes("superSecretSecretXYZ"),
      "health payload must not leak key secret"
    );
  });

  it("L-R12-06: Razorpay webhook fails closed (500) without RAZORPAY_WEBHOOK_SECRET", async () => {
    delete env.RAZORPAY_WEBHOOK_SECRET;
    const body = JSON.stringify({ event: "order.paid" });
    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": "any_signature",
      },
      body,
    });
    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 500);
    const json = await res.json();
    assert.equal(json.error, "Webhook secret not configured");
  });

  it("L-R12-07: getRazorpayClient refuses mismatched test server key and live public key", () => {
    env.RAZORPAY_KEY_ID = "rzp_test_123456";
    env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_live_654321";
    env.RAZORPAY_KEY_SECRET = "sample_secret_key_val";
    assert.throws(
      () => getRazorpayClient(),
      /Razorpay credential mismatch/
    );
  });

  it("L-R12-08: getRazorpayClient refuses mismatched live server key and test public key", () => {
    env.RAZORPAY_KEY_ID = "rzp_live_123456";
    env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_654321";
    env.RAZORPAY_KEY_SECRET = "sample_secret_key_val";
    assert.throws(
      () => getRazorpayClient(),
      /Razorpay credential mismatch/
    );
  });

  it("L-R12-09: getRazorpayClient refuses test key ID paired with live secret", () => {
    env.RAZORPAY_KEY_ID = "rzp_test_123456";
    delete env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    env.RAZORPAY_KEY_SECRET = "rzp_live_secret_val";
    assert.throws(
      () => getRazorpayClient(),
      /Razorpay credential mismatch/
    );
  });

  it("L-R12-10: getRazorpayClient succeeds with valid matching test credentials", () => {
    env.RAZORPAY_KEY_ID = "rzp_test_123456";
    env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_123456";
    env.RAZORPAY_KEY_SECRET = "sample_secret_test_val";
    const client = getRazorpayClient();
    assert.ok(client);
  });

  it("L-R12-11: getRazorpayClient succeeds with valid matching live credentials", () => {
    env.RAZORPAY_KEY_ID = "rzp_live_123456";
    env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_live_123456";
    env.RAZORPAY_KEY_SECRET = "sample_secret_live_val";
    const client = getRazorpayClient();
    assert.ok(client);
  });
});
