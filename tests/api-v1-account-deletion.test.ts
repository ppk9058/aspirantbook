import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { registerDeviceToken } from "../lib/services/device.service";
import { NextRequest } from "next/server";
import { GET as getMeRoute, DELETE as deleteMeRoute } from "../app/api/v1/me/route";

describe("API v1 Account Deletion & Anonymization (App Store 5.1.1(v) Real-Flow)", () => {
  let standardUser: { id: string; email: string; token: string; password: string };
  let noPasswordUser: { id: string; email: string; token: string };
  let adminUser: { id: string; email: string; token: string; password: string };
  let statutoryOrderId: string;

  before(async () => {
    // 1. Standard user with password
    const u1Email = `del_std_${Date.now()}@example.com`;
    const u1Pass = "DeleteMe123!";
    const u1 = await registerUser({
      name: "Standard To Delete",
      email: u1Email,
      password: u1Pass,
      consent: true,
      platform: "android",
    });
    standardUser = {
      id: u1.user.id,
      email: u1Email,
      token: u1.tokens.accessToken,
      password: u1Pass,
    };

    // Register a push token for this standard user
    await registerDeviceToken(
      {
        userId: standardUser.id,
        email: standardUser.email,
        name: "Standard To Delete",
        role: "STUDENT",
        isGuest: false,
        authMethod: "bearer",
      },
      {
        token: "ExponentPushToken[standard-device-token]",
        platform: "android",
        deviceModel: "Pixel 8",
        appVersion: "1.0.0",
      }
    );

    // Create a statutory financial payment record to verify financial records remain intact
    const statutoryPayment = await prisma.payment.create({
      data: {
        userId: standardUser.id,
        amount: 499,
        currency: "INR",
        status: "COMPLETED",
        paymentProvider: "RAZORPAY",
        razorpayOrderId: `order_stat_${Date.now()}`,
        razorpayPaymentId: `pay_stat_${Date.now()}`,
      },
    });
    statutoryOrderId = statutoryPayment.id;

    // 2. User without password (e.g. OTP registered)
    const u2Email = `del_otp_${Date.now()}@example.com`;
    const u2 = await prisma.user.create({
      data: {
        name: "OTP User To Delete",
        email: u2Email,
        phoneNumber: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: "FREE",
        isActive: true,
        sessionVersion: 1,
      },
    });
    // Create a device session for u2
    const session2 = await prisma.deviceSession.create({
      data: {
        userId: u2.id,
        refreshTokenHash: `hash-u2-${Date.now()}`,
        familyId: `fam-u2-${Date.now()}`,
        platform: "ios",
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });

    // Create valid JWT accessToken for u2
    const { createAccessToken } = await import("../lib/api/v1/tokens");
    const u2Token = await createAccessToken({
      sub: u2.id,
      email: u2.email,
      role: u2.role,
      familyId: session2.familyId,
      sessionVersion: 1,
      sessionId: session2.id,
    });
    noPasswordUser = {
      id: u2.id,
      email: u2Email,
      token: u2Token,
    };

    // 3. Admin user for last-admin protection check
    const adminEmail = `admin_sole_${Date.now()}@example.com`;
    const adminPass = "AdminSole123!";
    const admin = await registerUser({
      name: "Sole Admin",
      email: adminEmail,
      password: adminPass,
      consent: true,
      platform: "web",
    });
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: "ADMIN" },
    });
    adminUser = {
      id: admin.user.id,
      email: adminEmail,
      token: admin.tokens.accessToken,
      password: adminPass,
    };
  });

  after(async () => {
    // Clean up created resources safely
    if (statutoryOrderId) {
      await prisma.payment.deleteMany({ where: { id: statutoryOrderId } }).catch(() => {});
    }
    if (standardUser?.id) {
      await prisma.deviceSession.deleteMany({ where: { userId: standardUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: standardUser.id } }).catch(() => {});
    }
    if (noPasswordUser?.id) {
      await prisma.deviceSession.deleteMany({ where: { userId: noPasswordUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: noPasswordUser.id } }).catch(() => {});
    }
    if (adminUser?.id) {
      await prisma.deviceSession.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
  });

  it("rejects DELETE /api/v1/me when unauthenticated (401)", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "some-password" }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  it("rejects deletion when password is wrong (401)", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${standardUser.token}`,
      },
      body: JSON.stringify({ password: "WrongPassword999!" }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error.message, /Incorrect password/i);
  });

  it("rejects deletion on password-protected user when password is omitted (401)", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${standardUser.token}`,
      },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error.message, /Password re-authentication required/i);
  });

  it("rejects static magic string 'DELETE_ACCOUNT' for passwordless OTP user (401)", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${noPasswordUser.token}`,
      },
      body: JSON.stringify({ confirmation: "DELETE_ACCOUNT" }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error.message, /re-authentication token required/i);
  });

  it("rejects purpose-bound token with WRONG purpose (401)", async () => {
    const { createReauthToken } = await import("../lib/api/v1/tokens");
    const wrongPurposeToken = await createReauthToken(noPasswordUser.id, "reset_password", "5m");

    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${noPasswordUser.token}`,
      },
      body: JSON.stringify({ reauthToken: wrongPurposeToken }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error.message, /Invalid token purpose|wrong-purpose/i);
  });

  it("rejects purpose-bound token that is EXPIRED (401)", async () => {
    const { createReauthToken } = await import("../lib/api/v1/tokens");
    // Generate token that expired 10 seconds ago (-10s)
    const expiredToken = await createReauthToken(noPasswordUser.id, "delete_account", "-10s");

    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${noPasswordUser.token}`,
      },
      body: JSON.stringify({ reauthToken: expiredToken }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error.message, /expired|jwt expired/i);
  });

  it("successfully deletes and anonymizes standard user with valid password and verifies audit log", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${standardUser.token}`,
      },
      body: JSON.stringify({ password: standardUser.password }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.deleted, true);
    assert.equal(body.data.anonymized, true);

    // 1. Check DB state for anonymization and deactivation
    const dbUser = await prisma.user.findUnique({
      where: { id: standardUser.id },
    });
    assert.ok(dbUser);
    assert.equal(dbUser.isActive, false);
    assert.equal(dbUser.name, "Deleted User");
    assert.equal(dbUser.phoneNumber, null);
    assert.equal(dbUser.password, null);
    assert.ok(dbUser.email.startsWith(`deleted-${standardUser.id}@`));

    // 2. Push tokens must be deleted
    const pushTokens = await prisma.devicePushToken.findMany({
      where: { userId: standardUser.id },
    });
    assert.equal(pushTokens.length, 0);

    // 3. Device sessions must be revoked
    const activeSessions = await prisma.deviceSession.findMany({
      where: { userId: standardUser.id, revokedAt: null },
    });
    assert.equal(activeSessions.length, 0);

    // 4. Statutory financial payment records remain preserved
    if (statutoryOrderId) {
      const payment = await prisma.payment.findUnique({
        where: { id: statutoryOrderId },
      });
      assert.ok(payment);
      assert.equal(payment.userId, standardUser.id);
    }

    // 5. Subsequent access with old token must be 401 UNAUTHORIZED
    const getReq = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${standardUser.token}`,
      },
    });
    const getRes = await getMeRoute(getReq);
    assert.equal(getRes.status, 401);

    // 6. Audit log must record the re-auth method used (PASSWORD)
    const auditEntry = await prisma.auditLog.findFirst({
      where: { actorId: standardUser.id, action: "USER_ACCOUNT_DELETED" },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(auditEntry, "AuditLog entry must be recorded");
    const meta = auditEntry.metadata as any;
    assert.equal(meta?.reauthMethod, "PASSWORD", "Audit log must record PASSWORD method");

    // 7. Re-registration with original email creates a NEW user id, does not resurrect old data
    const rereg = await registerUser({
      name: "Standard Resurrected",
      email: standardUser.email,
      password: "NewPassword123!",
      consent: true,
      platform: "android",
    });
    assert.notEqual(rereg.user.id, standardUser.id, "Re-registration must create a brand NEW user id");
    assert.equal(rereg.user.email, standardUser.email);
    assert.equal(rereg.user.isActive, true);

    // Cleanup new user
    await prisma.user.delete({ where: { id: rereg.user.id } }).catch(() => {});
  });

  it("successfully deletes passwordless OTP user with valid purpose-bound re-auth token", async () => {
    const { createReauthToken } = await import("../lib/api/v1/tokens");
    const validToken = await createReauthToken(noPasswordUser.id, "delete_account", "5m");

    const reqValid = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${noPasswordUser.token}`,
      },
      body: JSON.stringify({ reauthToken: validToken }),
    });
    const resValid = await deleteMeRoute(reqValid);
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.ok, true);
    assert.equal(bodyValid.data.deleted, true);

    const dbUser = await prisma.user.findUnique({
      where: { id: noPasswordUser.id },
    });
    assert.ok(dbUser);
    assert.equal(dbUser.isActive, false);

    // Audit log must record REAUTH_TOKEN method
    const auditEntry = await prisma.auditLog.findFirst({
      where: { actorId: noPasswordUser.id, action: "USER_ACCOUNT_DELETED" },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(auditEntry, "AuditLog entry must be recorded");
    const meta = auditEntry.metadata as any;
    assert.equal(meta?.reauthMethod, "REAUTH_TOKEN", "Audit log must record REAUTH_TOKEN method");
  });

  it("prevents deleting the last remaining active administrator account", async () => {
    // Count active admins
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });

    if (activeAdmins === 1) {
      const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminUser.token}`,
        },
        body: JSON.stringify({ password: adminUser.password }),
      });

      const res = await deleteMeRoute(req);
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.ok, false);
      assert.match(body.error.message, /administrator account/i);
    }
  });
});
