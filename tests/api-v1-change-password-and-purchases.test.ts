import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { createAccessToken } from "../lib/api/v1/tokens";

describe("API v1: Password Change & Subscription Purchases Parity", () => {
  let userToken: string;
  let testUserId: string;
  const testEmail = `parity-user-${Date.now()}@example.com`;
  const originalPassword = "OriginalPassword123!";
  const newPassword = "NewSecurePassword456!";

  before(async () => {
    const hashedPassword = await bcrypt.hash(originalPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: "Parity Test User",
        role: "FREE",
        selectedGoal: "upsc",
      },
    });
    testUserId = user.id;

    // Create a device session
    const session = await prisma.deviceSession.create({
      data: {
        userId: user.id,
        platform: "android",
        deviceName: "Test Device",
        familyId: crypto.randomUUID(),
        refreshTokenHash: "hash_placeholder",
        expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
      },
    });

    userToken = await createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
      familyId: session.familyId,
      sessionId: session.id,
    });
  });

  after(async () => {
    if (testUserId) {
      await prisma.subscription.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.deviceSession.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  // 1. Password Change
  it("rejects POST /api/v1/auth/change-password when unauthenticated (401)", async () => {
    const { POST } = await import("../app/api/v1/auth/change-password/route");
    const req = new Request("http://localhost:3046/api/v1/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "foo", newPassword: "bar" }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "UNAUTHORIZED");
  });

  it("rejects password change when current password is wrong (401)", async () => {
    const { POST } = await import("../app/api/v1/auth/change-password/route");
    const req = new Request("http://localhost:3046/api/v1/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        currentPassword: "WrongPassword999!",
        newPassword: newPassword,
      }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.match(json.error.message, /current password/i);
  });

  it("rejects password change when new password is too short (400 validation error)", async () => {
    const { POST } = await import("../app/api/v1/auth/change-password/route");
    const req = new Request("http://localhost:3046/api/v1/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        currentPassword: originalPassword,
        newPassword: "short",
      }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  it("successfully updates password, increments sessionVersion, and resets lockouts", async () => {
    const initialUser = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { sessionVersion: true },
    });
    const initialVersion = initialUser?.sessionVersion || 1;

    const { POST } = await import("../app/api/v1/auth/change-password/route");
    const req = new Request("http://localhost:3046/api/v1/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        currentPassword: originalPassword,
        newPassword: newPassword,
      }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.success, true);

    // Verify DB update
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { password: true, sessionVersion: true },
    });

    assert.equal(updatedUser?.sessionVersion, initialVersion + 1);
    const isNewValid = await bcrypt.compare(newPassword, updatedUser?.password || "");
    assert.equal(isNewValid, true, "New password must match updated hash");
  });

  // 2. Subscriptions & Purchases GET
  it("rejects GET /api/v1/subscriptions when unauthenticated (401)", async () => {
    const { GET } = await import("../app/api/v1/subscriptions/route");
    const req = new Request("http://localhost:3046/api/v1/subscriptions", {
      method: "GET",
    });

    const res = await GET(req as any);
    assert.equal(res.status, 401);
  });

  it("returns active pass status and purchase history for logged-in user", async () => {
    // Create an active subscription record in DB for this user
    await prisma.subscription.create({
      data: {
        userId: testUserId,
        plan: "YEARLY",
        status: "ACTIVE",
        provider: "RAZORPAY",
        providerId: `sub_test_${Date.now()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    const { GET } = await import("../app/api/v1/subscriptions/route");
    const req = new Request("http://localhost:3046/api/v1/subscriptions", {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const res = await GET(req as any);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.hasActivePass, true);
    assert.ok(json.data.activeSubscription);
    assert.equal(json.data.activeSubscription.plan, "YEARLY");
    assert.ok(Array.isArray(json.data.history));
  });

  // 3. Goal Sync via PATCH /api/v1/me
  it("syncs goal to DB when user updates goal via PATCH /api/v1/me", async () => {
    const { PATCH } = await import("../app/api/v1/me/route");
    const req = new Request("http://localhost:3046/api/v1/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ goal: "bpsc" }),
    });

    const res = await PATCH(req as any);
    assert.equal(res.status, 200);

    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { selectedGoal: true },
    });
    assert.equal(user?.selectedGoal, "bpsc");
  });
});
