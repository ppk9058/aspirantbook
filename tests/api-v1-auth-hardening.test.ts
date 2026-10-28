import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_LOCKED_MESSAGE,
  loginWithEmailPassword,
  pruneDeviceSessions,
  refreshSession,
  registerUser,
} from "../lib/services/auth-token.service";
import { unregisterDeviceToken } from "../lib/services/device.service";
import { clearLoginLockout } from "../lib/auth/rate-limiter";
import { POST as loginRoute } from "../app/api/v1/auth/login/route";
import { DELETE as deleteDeviceRoute } from "../app/api/v1/devices/route";
import type { Viewer } from "../lib/api/v1/viewer";

/**
 * A13: v1 auth hardening.
 *
 * Before this change:
 *  - an inactive account produced a distinct FORBIDDEN message (account leak),
 *  - v1 had no per-account lockout (only a 10/min IP rate limit),
 *  - registration hashed with bcrypt cost 10 while the web path uses 12,
 *  - every refresh inserted a new DeviceSession row (unbounded growth),
 *  - a guest could delete any push token by calling DELETE /api/v1/devices.
 */

const run = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const IP = "203.0.113.77";
const emails: string[] = [];
let activeUserId = "";
let activeEmail = "";
const activePassword = "A13Password123!";
let inactiveEmail = "";

function guestViewer(): Viewer {
  return { userId: null, email: null, name: null, role: "FREE", isGuest: true, authMethod: "guest" };
}

function ownerViewer(userId: string): Viewer {
  return {
    userId,
    email: activeEmail,
    name: "A13",
    role: "FREE",
    isGuest: false,
    authMethod: "bearer",
  };
}

describe("A13 v1 auth hardening", () => {
  before(async () => {
    activeEmail = `a13_active_${run}@example.com`;
    emails.push(activeEmail);
    const reg = await registerUser(
      {
        name: "A13 Active",
        email: activeEmail,
        password: activePassword,
        consent: true,
        platform: "android",
      },
      IP,
      "a13-test"
    );
    activeUserId = reg.user.id;

    inactiveEmail = `a13_inactive_${run}@example.com`;
    emails.push(inactiveEmail);
    await prisma.user.create({
      data: {
        name: "A13 Inactive",
        email: inactiveEmail,
        password: await bcrypt.hash("A13Password123!", 12),
        role: "FREE",
        isActive: false,
        sessionVersion: 1,
      },
    });
  });

  after(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await prisma.deviceSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.devicePushToken.deleteMany({ where: { userId: { in: ids } } });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.rateLimit.deleteMany({ where: { key: { contains: run } } });
  });

  it("unknown email, wrong password and an inactive account all fail identically", async () => {
    const failures: string[] = [];

    for (const credentials of [
      { email: activeEmail, password: "DefinitelyWrong999!" },
      { email: `a13_unknown_${run}@example.com`, password: "DefinitelyWrong999!" },
      { email: inactiveEmail, password: "A13Password123!" },
    ]) {
      try {
        await loginWithEmailPassword(
          { ...credentials, platform: "android" },
          "203.0.113.78",
          "a13-test"
        );
        assert.fail(`login unexpectedly succeeded for ${credentials.email}`);
      } catch (error: any) {
        failures.push(error.message);
      }
    }

    assert.equal(failures.length, 3);
    for (const message of failures) {
      assert.equal(message, `UNAUTHORIZED: ${INVALID_CREDENTIALS_MESSAGE}`);
    }
    assert.equal(new Set(failures).size, 1, "every failure must share one message");
    // The old leaky message must be gone.
    assert.ok(!failures.some((m) => /suspended|deactivated|inactive/i.test(m)));
  });

  it("registration hashes with the same bcrypt cost as the web path (12)", async () => {
    const user = await prisma.user.findUnique({
      where: { id: activeUserId },
      select: { password: true },
    });
    assert.ok(user?.password);
    assert.match(user!.password!, /^\$2[aby]\$12\$/);
  });

  it("locks an account after 5 failures and refuses the correct password until it expires", async () => {
    const lockEmail = `a13_lock_${run}@example.com`;
    emails.push(lockEmail);
    await registerUser(
      {
        name: "A13 Lock",
        email: lockEmail,
        password: "A13Password123!",
        consent: true,
        platform: "android",
      },
      IP,
      "a13-test"
    );

    for (let attempt = 1; attempt <= 4; attempt++) {
      await assert.rejects(
        () =>
          loginWithEmailPassword(
            { email: lockEmail, password: "WrongPassword999!", platform: "android" },
            IP,
            "a13-test"
          ),
        (error: any) => error.message === `UNAUTHORIZED: ${INVALID_CREDENTIALS_MESSAGE}`
      );
    }

    // The fifth failure trips the lockout itself.
    await assert.rejects(
      () =>
        loginWithEmailPassword(
          { email: lockEmail, password: "WrongPassword999!", platform: "android" },
          IP,
          "a13-test"
        ),
      (error: any) => error.message === `TOO_MANY_REQUESTS: ${LOGIN_LOCKED_MESSAGE}`
    );

    // Even the correct password is refused while locked.
    await assert.rejects(
      () =>
        loginWithEmailPassword(
          { email: lockEmail, password: "A13Password123!", platform: "android" },
          IP,
          "a13-test"
        ),
      (error: any) => error.message === `TOO_MANY_REQUESTS: ${LOGIN_LOCKED_MESSAGE}`
    );

    // The route turns that into a stable 429 with the RATE_LIMITED code.
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lockEmail, password: "A13Password123!", platform: "android" }),
    });
    const res = await loginRoute(req);
    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.code, "RATE_LIMITED");

    // Clearing the lockout restores normal login.
    await clearLoginLockout(lockEmail, IP);
    const after = await loginWithEmailPassword(
      { email: lockEmail, password: "A13Password123!", platform: "android" },
      IP,
      "a13-test"
    );
    assert.ok(after.tokens.accessToken);
  });

  it("rotates the refresh token in place and still detects replay", async () => {
    const login = await loginWithEmailPassword(
      { email: activeEmail, password: activePassword, platform: "android" },
      IP,
      "a13-test"
    );
    const firstToken = login.tokens.refreshToken;

    const before = await prisma.deviceSession.findMany({
      where: { userId: activeUserId, revokedAt: null },
      select: { id: true },
    });
    const beforeCount = before.length;

    const rotated = await refreshSession(firstToken, IP, "a13-test");
    assert.notEqual(rotated.tokens.refreshToken, firstToken);

    // No new row: the same DeviceSession was updated in place.
    const after = await prisma.deviceSession.findMany({
      where: { userId: activeUserId, revokedAt: null },
      select: { id: true, previousRefreshTokenHash: true },
    });
    assert.equal(after.length, beforeCount, "refresh must not create a DeviceSession row");
    assert.equal(
      after.filter((s) => before.some((b) => b.id === s.id)).length,
      beforeCount,
      "the live session ids must be unchanged"
    );

    // Replaying the immediately previous token is still treated as reuse.
    await assert.rejects(
      () => refreshSession(firstToken, IP, "a13-test"),
      { message: /Token reuse detected/ }
    );

    // …and the family is revoked, so the rotated token is dead too.
    await assert.rejects(
      () => refreshSession(rotated.tokens.refreshToken, IP, "a13-test"),
      { message: /Invalid or expired refresh token|Token reuse detected/ }
    );
  });

  it("prunes revoked and long-expired sessions but keeps the live one", async () => {
    const live = await loginWithEmailPassword(
      { email: activeEmail, password: activePassword, platform: "android" },
      IP,
      "a13-test"
    );
    assert.ok(live.tokens.refreshToken);

    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const retired = await prisma.deviceSession.create({
      data: {
        userId: activeUserId,
        refreshTokenHash: `a13-retired-${run}`,
        familyId: `a13-retired-family-${run}`,
        platform: "android",
        expiresAt: oldDate,
        revokedAt: oldDate,
      },
    });
    const expired = await prisma.deviceSession.create({
      data: {
        userId: activeUserId,
        refreshTokenHash: `a13-expired-${run}`,
        familyId: `a13-expired-family-${run}`,
        platform: "android",
        expiresAt: oldDate,
      },
    });

    const removed = await pruneDeviceSessions();
    assert.equal(typeof removed, "number");

    const gone = await prisma.deviceSession.count({
      where: { id: { in: [retired.id, expired.id] } },
    });
    assert.equal(gone, 0);

    const liveRows = await prisma.deviceSession.count({
      where: { userId: activeUserId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    assert.ok(liveRows >= 1, "pruning must never delete a live session");
  });

  it("a guest can never unregister a push token", async () => {
    const token = `a13-push-${run}`;
    await prisma.devicePushToken.create({
      data: {
        userId: activeUserId,
        token,
        platform: "android",
      },
    });

    await assert.rejects(
      () => unregisterDeviceToken(guestViewer(), token),
      { message: /UNAUTHORIZED: Authentication required/ }
    );

    const stillThere = await prisma.devicePushToken.findUnique({ where: { token } });
    assert.ok(stillThere, "guest must not delete the row");

    const res = await deleteDeviceRoute(
      new NextRequest(`http://127.0.0.1:3045/api/v1/devices?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      })
    );
    assert.equal(res.status, 401);

    // The owner can still unregister it.
    await unregisterDeviceToken(ownerViewer(activeUserId), token);
    const removed = await prisma.devicePushToken.findUnique({ where: { token } });
    assert.equal(removed, null);
  });
});
