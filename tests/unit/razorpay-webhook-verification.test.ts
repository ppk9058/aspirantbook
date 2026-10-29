import test, { describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRazorpayWebhook } from "@/lib/payments/razorpay-webhook";

const TEST_SECRET = "whsec_test_secret_for_unit_tests_12345";

function signBody(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("Task B5: Razorpay Webhook Verification & Idempotency", () => {
  const originalEnv = { ...process.env };

  before(async () => {
    // Clean up any test webhook events from previous runs
    await prisma.razorpayWebhookEvent.deleteMany({
      where: { eventId: { startsWith: "test_evt_" } },
    });
  });

  after(async () => {
    await prisma.razorpayWebhookEvent.deleteMany({
      where: { eventId: { startsWith: "test_evt_" } },
    });
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("1. Missing signature header fails closed with 400", async () => {
    const body = JSON.stringify({ event: "order.paid" });
    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, "No signature");
  });

  test("2. Missing RAZORPAY_WEBHOOK_SECRET fails closed with 500", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const body = JSON.stringify({ event: "order.paid" });
    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": "some_sig",
      },
      body,
    });

    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 500);
    const json = await res.json();
    assert.equal(json.error, "Webhook secret not configured");
  });

  test("3. Wrong signature fails closed with 400", async () => {
    const body = JSON.stringify({ event: "order.paid" });
    const wrongSignature = "0".repeat(64);
    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": wrongSignature,
      },
      body,
    });

    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, "Invalid signature");
  });

  test("4. Tampered body (signature for body A, sent body B) fails closed with 400", async () => {
    const originalBody = JSON.stringify({ event: "order.paid", amount: 1000 });
    const signature = signBody(originalBody, TEST_SECRET);
    const tamperedBody = JSON.stringify({ event: "order.paid", amount: 10 });

    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: tamperedBody,
    });

    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, "Invalid signature");
  });

  test("5. Replay attack: event timestamp older than 5 minutes rejected with 400", async () => {
    const tenMinutesAgoSec = Math.floor((Date.now() - 10 * 60 * 1000) / 1000);
    const body = JSON.stringify({
      id: `test_evt_replay_${Date.now()}`,
      event: "payment.captured",
      created_at: tenMinutesAgoSec,
      payload: {
        payment: { entity: { id: "pay_test_replay", order_id: "order_test_replay", amount: 50000 } },
      },
    });
    const signature = signBody(body, TEST_SECRET);

    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body,
    });

    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error, /replay window/i);
  });

  test("6. Event timestamp far in the future (>60s clock skew) rejected with 400", async () => {
    const futureSec = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);
    const body = JSON.stringify({
      id: `test_evt_future_${Date.now()}`,
      event: "payment.captured",
      created_at: futureSec,
      payload: {
        payment: { entity: { id: "pay_test_future", order_id: "order_test_future", amount: 50000 } },
      },
    });
    const signature = signBody(body, TEST_SECRET);

    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body,
    });

    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error, /replay window/i);
  });

  test("7. Valid webhook with recent timestamp persists event and processes successfully", async () => {
    const eventId = `test_evt_valid_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const nowSec = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: eventId,
      event: "payment.failed",
      created_at: nowSec,
      payload: {
        payment: { entity: { id: "pay_test_failed_1", order_id: "nonexistent_order_id" } },
      },
    });
    const signature = signBody(body, TEST_SECRET);

    const req = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body,
    });

    const res = await handleRazorpayWebhook(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.received, true);

    // Verify persisted in RazorpayWebhookEvent table
    const stored = await prisma.razorpayWebhookEvent.findUnique({
      where: { eventId },
    });
    assert.ok(stored, "Event should be stored in RazorpayWebhookEvent");
    assert.equal(stored.eventId, eventId);
    assert.equal(stored.eventType, "payment.failed");
  });

  test("8. Idempotency: duplicate event ID returns 200 without reprocessing", async () => {
    const eventId = `test_evt_idempotent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const nowSec = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: eventId,
      event: "payment.failed",
      created_at: nowSec,
      payload: {
        payment: { entity: { id: "pay_test_failed_2", order_id: "nonexistent_order_id" } },
      },
    });
    const signature = signBody(body, TEST_SECRET);

    // First request
    const req1 = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body,
    });
    const res1 = await handleRazorpayWebhook(req1);
    assert.equal(res1.status, 200);
    const json1 = await res1.json();
    assert.equal(json1.received, true);
    assert.notEqual(json1.duplicate, true);

    // Second request (duplicate webhook replay)
    const req2 = new NextRequest("http://127.0.0.1:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body,
    });
    const res2 = await handleRazorpayWebhook(req2);
    assert.equal(res2.status, 200);
    const json2 = await res2.json();
    assert.equal(json2.received, true);
    assert.equal(json2.duplicate, true);
    assert.equal(json2.eventId, eventId);
  });
});
