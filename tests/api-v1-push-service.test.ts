import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";
import { POST as registerDeviceRoute, DELETE as deleteDeviceRoute } from "../app/api/v1/devices/route";
import { POST as logoutRoute } from "../app/api/v1/auth/logout/route";
import {
  sendPushNotificationBatch,
  pruneUnregisteredTokens,
  processExpoReceipts,
  isMobilePushEnabled,
} from "../lib/services/push-dispatcher.service";

describe("R6 - Mobile Push Service & Feature Flag Suite", () => {
  let studentId: string;
  let studentToken: string;
  let testPushToken: string;

  before(async () => {
    const u = await registerUser({
      name: "Push Test Student",
      email: `push_test_${Date.now()}@example.com`,
      password: "PushPassword123!",
      consent: true,
      platform: "android",
    });
    studentId = u.user.id;
    studentToken = u.tokens.accessToken;
    testPushToken = `ExponentPushToken[r6-test-${Date.now()}]`;
  });

  after(async () => {
    await prisma.devicePushToken.deleteMany({
      where: { userId: studentId },
    });
    await prisma.user.delete({
      where: { id: studentId },
    }).catch(() => {});
  });

  // ─── Test 1: Idempotent Device Registration ──────────────────────────────
  it("Device Registration: Multiple calls with same token update record without duplication", async () => {
    // 1st Registration
    const req1 = new NextRequest("http://127.0.0.1:3045/api/v1/devices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        token: testPushToken,
        platform: "android",
        deviceModel: "Samsung Galaxy S24",
        appVersion: "1.0.0",
      }),
    });
    const res1 = await registerDeviceRoute(req1);
    assert.equal(res1.status, 200);

    const count1 = await prisma.devicePushToken.count({
      where: { token: testPushToken },
    });
    assert.equal(count1, 1);

    // 2nd Registration (Idempotent update)
    const req2 = new NextRequest("http://127.0.0.1:3045/api/v1/devices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        token: testPushToken,
        platform: "android",
        deviceModel: "Samsung Galaxy S24 Ultra",
        appVersion: "1.0.1",
      }),
    });
    const res2 = await registerDeviceRoute(req2);
    assert.equal(res2.status, 200);

    const count2 = await prisma.devicePushToken.count({
      where: { token: testPushToken },
    });
    assert.equal(count2, 1, "Token must not be duplicated");

    const record = await prisma.devicePushToken.findUnique({
      where: { token: testPushToken },
    });
    assert.equal(record?.deviceModel, "Samsung Galaxy S24 Ultra");
    assert.equal(record?.appVersion, "1.0.1");
  });

  // ─── Test 2: Feature Flag Guard (Hard Rule 6 - Safety First) ───────────────
  it("Feature Flag: With ENABLE_MOBILE_PUSH=false, dispatch does NOT fetch external push network", async () => {
    // Ensure flag is false
    const originalEnv = process.env.ENABLE_MOBILE_PUSH;
    process.env.ENABLE_MOBILE_PUSH = "false";

    let networkCallOccurred = false;
    const mockFetch = async () => {
      networkCallOccurred = true;
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    };

    const result = await sendPushNotificationBatch(
      [
        {
          to: testPushToken,
          title: "New Test Series Live",
          body: "Check out the latest UPSC 2026 test series",
        },
      ],
      mockFetch as any
    );

    assert.equal(result.sent, false);
    assert.equal(result.status, "DISABLED");
    assert.equal(networkCallOccurred, false, "External push endpoint must NOT be called when flag is false");

    // Restore original env
    process.env.ENABLE_MOBILE_PUSH = originalEnv;
  });

  // ─── Test 3: Active Dispatch When Flag Enabled ───────────────────────────
  it("Dispatch: When ENABLE_MOBILE_PUSH=true, sends batch to configured endpoint", async () => {
    const originalEnv = process.env.ENABLE_MOBILE_PUSH;
    process.env.ENABLE_MOBILE_PUSH = "true";

    let requestedUrl = "";
    let requestPayload: any = null;

    const mockFetch = async (url: any, init: any) => {
      requestedUrl = url.toString();
      requestPayload = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          data: [{ status: "ok", id: "ticket-123" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await sendPushNotificationBatch(
      [
        {
          to: testPushToken,
          title: "Exam Alert",
          body: "Exam starts in 15 minutes",
        },
      ],
      mockFetch as any
    );

    assert.equal(result.sent, true);
    assert.equal(result.status, "SENT");
    assert.ok(requestedUrl.includes("push/send"));
    assert.equal(requestPayload[0].to, testPushToken);

    process.env.ENABLE_MOBILE_PUSH = originalEnv;
  });

  // ─── Test 4: Pruning on DeviceNotRegistered Receipt / Ticket ─────────────
  it("Receipt Processing: DeviceNotRegistered error automatically prunes DB token", async () => {
    // 1. Create a transient token in DB
    const unregisteredToken = `ExponentPushToken[unregistered-${Date.now()}]`;
    await prisma.devicePushToken.create({
      data: {
        userId: studentId,
        token: unregisteredToken,
        platform: "ios",
      },
    });

    const beforeCount = await prisma.devicePushToken.count({
      where: { token: unregisteredToken },
    });
    assert.equal(beforeCount, 1);

    // 2. Process receipt indicating DeviceNotRegistered
    const receiptMap = {
      "rcpt-1": {
        status: "error",
        message: "The device is not registered to receive push notifications.",
        details: { error: "DeviceNotRegistered" },
      },
      "rcpt-2": {
        status: "ok",
      },
    };
    const tokenMap = {
      "rcpt-1": unregisteredToken,
      "rcpt-2": testPushToken,
    };

    const processResult = await processExpoReceipts(receiptMap, tokenMap);
    assert.equal(processResult.prunedTokens.length, 1);
    assert.equal(processResult.prunedTokens[0], unregisteredToken);

    // 3. Verify DB record was deleted
    const afterCount = await prisma.devicePushToken.count({
      where: { token: unregisteredToken },
    });
    assert.equal(afterCount, 0, "Unregistered token must be pruned from database");
  });

  // ─── Test 5: Revocation on Logout / Delete Route ──────────────────────────
  it("Revocation: DELETE /api/v1/devices unregisters token; logout prunes token if provided", async () => {
    // Token currently in DB
    const check1 = await prisma.devicePushToken.count({
      where: { token: testPushToken },
    });
    assert.equal(check1, 1);

    // 1. Unregister via DELETE /api/v1/devices?token=...
    const delReq = new NextRequest(`http://127.0.0.1:3045/api/v1/devices?token=${encodeURIComponent(testPushToken)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const delRes = await deleteDeviceRoute(delReq);
    assert.equal(delRes.status, 200);

    const check2 = await prisma.devicePushToken.count({
      where: { token: testPushToken },
    });
    assert.equal(check2, 0, "Token must be deleted after unregister call");

    // 2. Re-create token and test logout prune
    await prisma.devicePushToken.create({
      data: {
        userId: studentId,
        token: testPushToken,
        platform: "android",
      },
    });

    const logoutReq = new NextRequest("http://127.0.0.1:3045/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pushToken: testPushToken }),
    });
    const logoutRes = await logoutRoute(logoutReq);
    assert.equal(logoutRes.status, 200);

    const check3 = await prisma.devicePushToken.count({
      where: { token: testPushToken },
    });
    assert.equal(check3, 0, "Push token must be pruned on logout");
  });
});
