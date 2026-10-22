import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser, refreshSession, loginWithEmailPassword } from "../lib/services/auth-token.service";
import { isDevBypassAllowed } from "../lib/api/v1/dev-bypass";
import { validateBootSecurity } from "../lib/boot-guard";
import { createAccessToken, createReauthToken } from "../lib/api/v1/tokens";
import { POST as otpRequestRoute } from "../app/api/v1/auth/otp/request/route";
import { POST as otpVerifyRoute } from "../app/api/v1/auth/otp/verify/route";
import { POST as reauthRoute } from "../app/api/v1/auth/reauth/route";
import { DELETE as deleteMeRoute } from "../app/api/v1/me/route";
import { NextRequest } from "next/server";

describe("SEC1: OTP / Reauth / Session Security Hardening", () => {
  let stdUser: { id: string; email: string; token: string; password: string };
  let pwdlessUser: { id: string; email: string; token: string; phoneNumber: string; sessionId: string };

  before(async () => {
    // 1. Setup standard user
    const u1Email = `sec1_std_${Date.now()}@example.com`;
    const u1Pass = "Sec1Password123!";
    const u1 = await registerUser({
      name: "Sec1 Standard User",
      email: u1Email,
      password: u1Pass,
      consent: true,
      platform: "android",
    });
    stdUser = {
      id: u1.user.id,
      email: u1Email,
      token: u1.tokens.accessToken,
      password: u1Pass,
    };

    // 2. Setup passwordless user with active session
    const phone = `+91977${Math.floor(1000000 + Math.random() * 9000000)}`;
    const u2Email = `mobile_${phone}@aspirantbook.local`;
    const u2 = await prisma.user.create({
      data: {
        name: "Sec1 Passwordless User",
        email: u2Email,
        phoneNumber: phone,
        role: "FREE",
        isActive: true,
        sessionVersion: 1,
      },
    });

    const session2 = await prisma.deviceSession.create({
      data: {
        userId: u2.id,
        refreshTokenHash: `hash-sec1-${Date.now()}`,
        familyId: `fam-sec1-${Date.now()}`,
        platform: "ios",
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });

    const u2Token = await createAccessToken({
      sub: u2.id,
      email: u2.email,
      role: u2.role,
      familyId: session2.familyId,
      sessionVersion: 1,
      sessionId: session2.id,
    });

    pwdlessUser = {
      id: u2.id,
      email: u2Email,
      token: u2Token,
      phoneNumber: phone,
      sessionId: session2.id,
    };
  });

  after(async () => {
    if (stdUser?.id) {
      await prisma.deviceSession.deleteMany({ where: { userId: stdUser.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: stdUser.id } }).catch(() => {});
    }
    if (pwdlessUser?.id) {
      await prisma.deviceSession.deleteMany({ where: { userId: pwdlessUser.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: pwdlessUser.id } }).catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. isDevBypassAllowed() Helper Invariants
  // ─────────────────────────────────────────────────────────────
  it("SEC1.1: isDevBypassAllowed strictly rejects production and allows test/dev only under strict flags", () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origAppEnv = process.env.APP_ENV;
    const origAllowDev = process.env.ALLOW_DEV_MOBILE_LOGIN;
    const origDbUrl = process.env.DATABASE_URL;

    try {
      // Production without test mode => ALWAYS FALSE even if ALLOW_DEV_MOBILE_LOGIN is true
      process.env.NODE_ENV = "production";
      process.env.APP_ENV = "production";
      process.env.ALLOW_DEV_MOBILE_LOGIN = "true";
      assert.equal(isDevBypassAllowed(), false, "Must return false in production even if ALLOW_DEV_MOBILE_LOGIN=true");

      // Non-production without dev login flag and without test DB => FALSE
      process.env.NODE_ENV = "development";
      process.env.APP_ENV = "development";
      delete process.env.ALLOW_DEV_MOBILE_LOGIN;
      process.env.DATABASE_URL = "postgresql://user:pass@remote.supabase.com:5432/postgres";
      assert.equal(isDevBypassAllowed(), false, "Must return false when not test DB and ALLOW_DEV_MOBILE_LOGIN is not true");

      // Non-production with ALLOW_DEV_MOBILE_LOGIN=true => TRUE
      process.env.ALLOW_DEV_MOBILE_LOGIN = "true";
      assert.equal(isDevBypassAllowed(), true, "Must return true when ALLOW_DEV_MOBILE_LOGIN=true in non-production");

      // Test environment with local test DB => TRUE
      delete process.env.ALLOW_DEV_MOBILE_LOGIN;
      process.env.APP_ENV = "test";
      process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:54329/trillionskill_test";
      assert.equal(isDevBypassAllowed(), true, "Must return true in test mode with local *_test DB");
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.APP_ENV = origAppEnv;
      process.env.ALLOW_DEV_MOBILE_LOGIN = origAllowDev;
      process.env.DATABASE_URL = origDbUrl;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Boot Guard Invariant
  // ─────────────────────────────────────────────────────────────
  it("SEC1.2: validateBootSecurity strictly refuses to boot when NODE_ENV=production and ALLOW_DEV_MOBILE_LOGIN=true", () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origAllowDev = process.env.ALLOW_DEV_MOBILE_LOGIN;

    try {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_DEV_MOBILE_LOGIN = "true";
      assert.throws(
        () => validateBootSecurity(),
        /ALLOW_DEV_MOBILE_LOGIN is enabled in NODE_ENV=production/
      );
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.ALLOW_DEV_MOBILE_LOGIN = origAllowDev;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 3. OTP Request & Verify Always 501 When devBypass is Off
  // ─────────────────────────────────────────────────────────────
  it("SEC1.3: otp/request and otp/verify return 501 when devBypass is off (even if SMS_API_KEY is present)", async () => {
    const origAllowDev = process.env.ALLOW_DEV_MOBILE_LOGIN;
    const origAppEnv = process.env.APP_ENV;
    const origSmsKey = process.env.SMS_API_KEY;

    const testPhone = `+91999${Math.floor(1000000 + Math.random() * 9000000)}`;

    try {
      // Turn off dev bypass and simulate SMS gateway key configured
      delete process.env.ALLOW_DEV_MOBILE_LOGIN;
      process.env.APP_ENV = "staging";
      process.env.SMS_API_KEY = "fake_sms_gateway_api_key";

      // 1. otp/request must return 501
      const reqReq = new NextRequest("http://127.0.0.1:3045/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: testPhone }),
      });
      const reqRes = await otpRequestRoute(reqReq);
      assert.equal(reqRes.status, 501, "otp/request must return 501 when dev bypass is off");
      const reqBody = await reqRes.json();
      assert.equal(reqBody.ok, false);
      assert.equal(reqBody.error.code, "NOT_IMPLEMENTED");

      // 2. otp/verify must return 501
      const verReq = new NextRequest("http://127.0.0.1:3045/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: testPhone, code: "999999" }),
      });
      const verRes = await otpVerifyRoute(verReq);
      assert.equal(verRes.status, 501, "otp/verify must return 501 when dev bypass is off");
      const verBody = await verRes.json();
      assert.equal(verBody.ok, false);
      assert.equal(verBody.error.code, "NOT_IMPLEMENTED");

      // 3. Verify no user or token was created in DB
      const userInDb = await prisma.user.findUnique({
        where: { phoneNumber: testPhone },
      });
      assert.equal(userInDb, null, "No user must be created in DB when 501 is returned");
    } finally {
      process.env.ALLOW_DEV_MOBILE_LOGIN = origAllowDev;
      process.env.APP_ENV = origAppEnv;
      process.env.SMS_API_KEY = origSmsKey;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Re-auth Rate Limit & Passwordless Safeguards
  // ─────────────────────────────────────────────────────────────
  it("SEC1.4a: reauth enforces rate limit of 5 requests per 15 min per user+IP", async () => {
    const testIp = `192.168.10.${Math.floor(10 + Math.random() * 200)}`;

    for (let i = 1; i <= 5; i++) {
      const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/reauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${stdUser.token}`,
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({ password: stdUser.password, purpose: "delete_account" }),
      });
      const res = await reauthRoute(req);
      assert.equal(res.status, 200, `Attempt ${i} within limit must return 200`);
    }

    // 6th attempt must be rate-limited (429)
    const req6 = new NextRequest("http://127.0.0.1:3045/api/v1/auth/reauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stdUser.token}`,
        "x-forwarded-for": testIp,
      },
      body: JSON.stringify({ password: stdUser.password, purpose: "delete_account" }),
    });
    const res6 = await reauthRoute(req6);
    assert.equal(res6.status, 429, "6th attempt must be rate-limited with 429");
    const body6 = await res6.json();
    assert.equal(body6.error.code, "TOO_MANY_REQUESTS");
  });

  it("SEC1.4b: passwordless user reauth returns 501 REAUTH_UNAVAILABLE when devBypass is off", async () => {
    const origAllowDev = process.env.ALLOW_DEV_MOBILE_LOGIN;
    const origAppEnv = process.env.APP_ENV;

    try {
      delete process.env.ALLOW_DEV_MOBILE_LOGIN;
      process.env.APP_ENV = "staging";

      const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/reauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pwdlessUser.token}`,
        },
        body: JSON.stringify({ otp: "123456", purpose: "delete_account" }),
      });

      const res = await reauthRoute(req);
      assert.equal(res.status, 501);
      const body = await res.json();
      assert.equal(body.error.code, "REAUTH_UNAVAILABLE");
      assert.match(body.error.message, /support/i);
    } finally {
      process.env.ALLOW_DEV_MOBILE_LOGIN = origAllowDev;
      process.env.APP_ENV = origAppEnv;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Stolen Access Token & Re-auth Token Cryptographic Checks
  // ─────────────────────────────────────────────────────────────
  it("SEC1.5: rejects account deletion on stolen access token without proof (REAUTH_REQUIRED)", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pwdlessUser.token}`,
      },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });

    const res = await deleteMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "REAUTH_REQUIRED");
  });

  it("SEC1.5b: rejects expired, reused, other-user, and other-purpose reauth tokens", async () => {
    // 1. Other-user token
    const otherUserToken = await createReauthToken("random-user-id-999", "delete_account", "5m");
    const reqOther = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pwdlessUser.token}`,
      },
      body: JSON.stringify({ reauthToken: otherUserToken }),
    });
    const resOther = await deleteMeRoute(reqOther);
    assert.equal(resOther.status, 401);
    const bodyOther = await resOther.json();
    assert.match(bodyOther.error.message, /mismatch/i);

    // 2. Other-purpose token
    const wrongPurposeToken = await createReauthToken(pwdlessUser.id, "reset_password", "5m");
    const reqWrong = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pwdlessUser.token}`,
      },
      body: JSON.stringify({ reauthToken: wrongPurposeToken }),
    });
    const resWrong = await deleteMeRoute(reqWrong);
    assert.equal(resWrong.status, 401);
    const bodyWrong = await resWrong.json();
    assert.match(bodyWrong.error.message, /purpose/i);

    // 3. Expired token
    const expiredToken = await createReauthToken(pwdlessUser.id, "delete_account", "-10s");
    const reqExp = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pwdlessUser.token}`,
      },
      body: JSON.stringify({ reauthToken: expiredToken }),
    });
    const resExp = await deleteMeRoute(reqExp);
    assert.equal(resExp.status, 401);
    const bodyExp = await resExp.json();
    assert.match(bodyExp.error.message, /expired/i);

    // 4. Token Reuse: valid token used once succeeds, second use MUST be rejected
    const { markReauthTokenUsed, verifyReauthToken } = await import("../lib/api/v1/tokens");
    const singleUseToken = await createReauthToken(pwdlessUser.id, "delete_account", "5m", pwdlessUser.sessionId);
    const verify1 = await verifyReauthToken(singleUseToken, pwdlessUser.id, "delete_account", pwdlessUser.sessionId);
    assert.equal(verify1.valid, true, "First token verification must be valid");
    assert.ok(verify1.jti);

    // Mark token used (simulating first deletion / consumption)
    markReauthTokenUsed(verify1.jti);

    // Second verification MUST be rejected as reuse
    const verify2 = await verifyReauthToken(singleUseToken, pwdlessUser.id, "delete_account", pwdlessUser.sessionId);
    assert.equal(verify2.valid, false, "Second verification must fail");
    assert.match(verify2.reason!, /already been used|reuse rejected/i);

    // Route-level rejection of reused token on active user
    const reqReused = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pwdlessUser.token}`,
      },
      body: JSON.stringify({ reauthToken: singleUseToken }),
    });
    const resReused = await deleteMeRoute(reqReused);
    assert.equal(resReused.status, 401, "Route must reject reused token with 401");
    const bodyReused = await resReused.json();
    assert.match(bodyReused.error.message, /already been used|reuse rejected/i);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Same Phone Number Re-Registration After Deletion
  // ─────────────────────────────────────────────────────────────
  it("SEC1.6: allows the same phone number to register again after account deletion/anonymization", async () => {
    // 1. Delete pwdlessUser using fresh valid reauth token
    const delToken = await createReauthToken(pwdlessUser.id, "delete_account", "5m", pwdlessUser.sessionId);
    const delReq = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pwdlessUser.token}`,
      },
      body: JSON.stringify({ reauthToken: delToken }),
    });
    const delRes = await deleteMeRoute(delReq);
    assert.equal(delRes.status, 200, "Account deletion must succeed with fresh valid token");

    // 2. Registering again with the same phone number via OTP dev bypass:
    const prevDevMobile = process.env.ALLOW_DEV_MOBILE_LOGIN;
    process.env.ALLOW_DEV_MOBILE_LOGIN = "true";
    const verifyReq = new NextRequest("http://127.0.0.1:3045/api/v1/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: pwdlessUser.phoneNumber, code: "123456" }),
    });

    const verifyRes = await otpVerifyRoute(verifyReq);
    if (prevDevMobile !== undefined) process.env.ALLOW_DEV_MOBILE_LOGIN = prevDevMobile;
    else delete process.env.ALLOW_DEV_MOBILE_LOGIN;
    assert.equal(verifyRes.status, 200, "Re-registration with same phone number must succeed");
    const verifyBody = await verifyRes.json();
    assert.equal(verifyBody.ok, true);
    assert.ok(verifyBody.data.user.id);
    assert.notEqual(verifyBody.data.user.id, pwdlessUser.id, "New account must have a fresh user id");
    assert.equal(verifyBody.data.user.phoneNumber, pwdlessUser.phoneNumber);
    assert.equal(verifyBody.data.user.email, `mobile_${pwdlessUser.phoneNumber}@aspirantbook.local`);
    assert.equal(verifyBody.data.user.isActive, true);

    // Clean up newly created user
    await prisma.deviceSession.deleteMany({ where: { userId: verifyBody.data.user.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: verifyBody.data.user.id } }).catch(() => {});
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Refresh Token Family Revocation on Reuse
  // ─────────────────────────────────────────────────────────────
  it("SEC1.7: refresh token reuse after rotation immediately revokes the entire token family", async () => {
    const userEmail = `reuse_fam_${Date.now()}@example.com`;
    const userPass = "ReusePass123!";
    const reg = await registerUser({
      name: "Family Reuse Test",
      email: userEmail,
      password: userPass,
      consent: true,
      platform: "android",
    });

    const oldToken = reg.tokens.refreshToken;

    // Normal rotation: oldToken is replaced by newToken
    const rotated = await refreshSession(oldToken);
    const newToken = rotated.tokens.refreshToken;
    assert.notEqual(newToken, oldToken);

    // Attacker replays oldToken!
    await assert.rejects(
      async () => {
        await refreshSession(oldToken);
      },
      { message: /Token reuse detected/ }
    );

    // Family is now revoked: even the legit newToken must now be rejected!
    await assert.rejects(
      async () => {
        await refreshSession(newToken);
      },
      { message: /Invalid or expired refresh token|Token reuse detected/ }
    );

    // Clean up
    await prisma.deviceSession.deleteMany({ where: { userId: reg.user.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: reg.user.id } }).catch(() => {});
  });
});
