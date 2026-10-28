import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";

/**
 * A4: Stripe webhook idempotency.
 *  - invoice.payment_failed must not block the later payment_succeeded.
 *  - replaying an event must not write a second payment or re-upgrade.
 *  - failed followed by succeeded upgrades the user exactly once.
 */
describe("A4 Stripe webhook idempotency", () => {
  let postRoute: (req: NextRequest) => Promise<Response>;
  let stripe: any;
  const secret = "whsec_audit2_test_secret";
  let userId = "";
  let subscriptionId = "";
  const providerId = `sub_a4_${Date.now()}`;
  const invoiceId = `in_a4_${Date.now()}`;
  const failedEventId = `evt_a4_failed_${Date.now()}`;
  const succeededEventId = `evt_a4_succeeded_${Date.now()}`;

  async function send(event: any) {
    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const req = new NextRequest("http://127.0.0.1:3045/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": header, "content-type": "application/json" },
      body: payload,
    });
    return postRoute(req);
  }

  function invoiceEvent(id: string, type: string) {
    return {
      id,
      object: "event",
      type,
      data: {
        object: {
          id: invoiceId,
          object: "invoice",
          subscription: providerId,
          amount_paid: 999,
          amount_due: 999,
          currency: "usd",
          hosted_invoice_url: "https://example.test/invoice",
        },
      },
    };
  }

  before(async () => {
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_audit2_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = secret;

    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any });
    postRoute = (await import("../app/api/webhooks/stripe/route")).POST as any;

    const email = `a4_stripe_${Date.now()}@example.com`;
    const reg = await registerUser({
      name: "Stripe Subscriber",
      email,
      password: "StripePassword123!",
      consent: true,
      platform: "android",
    });
    userId = reg.user.id;

    const sub = await prisma.subscription.create({
      data: {
        userId,
        plan: "MONTHLY",
        status: "PAST_DUE",
        provider: "STRIPE",
        providerId,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
      },
    });
    subscriptionId = sub.id;

    await prisma.user.update({ where: { id: userId }, data: { role: "FREE" } });
  });

  after(async () => {
    if (userId) {
      await prisma.payment.deleteMany({ where: { userId } });
      await prisma.subscription.deleteMany({ where: { userId } });
      await prisma.stripeWebhookEvent.deleteMany({
        where: { eventId: { in: [failedEventId, succeededEventId] } },
      });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("failed then succeeded upgrades exactly once and keeps both audit rows", async () => {
    const failedRes = await send(invoiceEvent(failedEventId, "invoice.payment_failed"));
    assert.equal(failedRes.status, 200);
    const replayFailed = await send(invoiceEvent(failedEventId, "invoice.payment_failed"));
    assert.equal(replayFailed.status, 200);

    let payments = await prisma.payment.findMany({ where: { userId } });
    assert.equal(payments.length, 1, "failed invoice writes exactly one payment");
    assert.equal(payments[0].status, "FAILED");
    assert.equal(payments[0].externalId, `${invoiceId}:failed`);

    const okRes = await send(invoiceEvent(succeededEventId, "invoice.payment_succeeded"));
    assert.equal(okRes.status, 200);
    const replayOk = await send(invoiceEvent(succeededEventId, "invoice.payment_succeeded"));
    assert.equal(replayOk.status, 200);

    payments = await prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    const completed = payments.filter((p) => p.status === "COMPLETED");
    const failed = payments.filter((p) => p.status === "FAILED");
    assert.equal(completed.length, 1, "exactly one completed payment");
    assert.equal(failed.length, 1, "the failed audit row is preserved");
    assert.equal(completed[0].externalId, invoiceId);
    assert.equal(completed[0].amountMinor, 999);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    assert.equal(user?.role, "PREMIUM");

    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { status: true } });
    assert.equal(sub?.status, "ACTIVE");
  });

  it("the unique index makes a duplicate providerId impossible", async () => {
    await assert.rejects(
      prisma.subscription.create({
        data: {
          userId,
          plan: "MONTHLY",
          status: "ACTIVE",
          provider: "STRIPE",
          providerId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
      }),
      (err: any) => err?.code === "P2002"
    );
  });
});
