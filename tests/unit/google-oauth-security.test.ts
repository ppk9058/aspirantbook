import test, { describe } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import * as jose from "jose";
import { verifyGoogleIdToken } from "@/lib/auth/google-token-verifier";
import { handleGoogleSignInCallback } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST as googleAuthRoute } from "@/app/api/v1/auth/google/route";
import { NextRequest } from "next/server";

const TEST_SECRET = "test_google_oauth_secret_at_least_32_bytes_long!!";
const TEST_AUDIENCE = "test-web-client-id.apps.googleusercontent.com";
const TEST_ISSUER = "https://accounts.google.com";

process.env.GOOGLE_CLIENT_IDS = TEST_AUDIENCE;
process.env.GOOGLE_ID_TOKEN_TEST_SECRET = TEST_SECRET;
process.env.APP_ENV = "test";
process.env.NODE_ENV = "test";

async function signTestToken(payload: {
  sub: string;
  email: string;
  email_verified: boolean | string;
  aud?: string;
  iss?: string;
  exp?: number;
  name?: string;
}) {
  const secretBytes = new TextEncoder().encode(TEST_SECRET);
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name || "Test User",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(payload.aud || TEST_AUDIENCE)
    .setIssuer(payload.iss || TEST_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(payload.exp ?? now + 3600)
    .sign(secretBytes);
}

describe("Task B1: Google OAuth & Mobile Token Security Verification", () => {
  test("1. verifyGoogleIdToken succeeds for legitimate token with email_verified=true", async () => {
    const token = await signTestToken({
      sub: "google-sub-12345",
      email: "student@example.com",
      email_verified: true,
    });

    const res = await verifyGoogleIdToken(token);
    assert.equal(res.valid, true);
    assert.equal(res.payload?.email, "student@example.com");
    assert.equal(res.payload?.email_verified, true);
    assert.equal(res.payload?.sub, "google-sub-12345");
  });

  test("2. Security: verifyGoogleIdToken rejects unverified email (prevents account takeover)", async () => {
    const token = await signTestToken({
      sub: "attacker-google-sub",
      email: "victim@example.com",
      email_verified: false,
    });

    const res = await verifyGoogleIdToken(token);
    assert.equal(res.valid, false);
    assert.equal(res.errorCode, "EMAIL_NOT_VERIFIED");
    assert.match(res.error || "", /Account takeover protection requires email_verified=true/);
  });

  test("3. Security: verifyGoogleIdToken rejects untrusted audience", async () => {
    const token = await signTestToken({
      sub: "google-sub-123",
      email: "student@example.com",
      email_verified: true,
      aud: "untrusted-client-id.apps.googleusercontent.com",
    });

    const res = await verifyGoogleIdToken(token);
    assert.equal(res.valid, false);
    assert.equal(res.errorCode, "INVALID_AUDIENCE");
  });

  test("4. Security: verifyGoogleIdToken rejects untrusted issuer", async () => {
    const token = await signTestToken({
      sub: "google-sub-123",
      email: "student@example.com",
      email_verified: true,
      iss: "https://evil-attacker.com",
    });

    const res = await verifyGoogleIdToken(token);
    assert.equal(res.valid, false);
    assert.equal(res.errorCode, "INVALID_ISSUER");
  });

  test("5. Security: verifyGoogleIdToken rejects expired token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signTestToken({
      sub: "google-sub-123",
      email: "student@example.com",
      email_verified: true,
      exp: now - 30, // 30s expired
    });

    const res = await verifyGoogleIdToken(token);
    assert.equal(res.valid, false);
    assert.equal(res.errorCode, "TOKEN_EXPIRED");
  });

  test("6. Mobile endpoint POST /api/v1/auth/google verifies token and creates session", async () => {
    const testEmail = `b1_user_${Date.now()}_${Math.random()}@example.com`;
    const token = await signTestToken({
      sub: `sub_${Date.now()}_${Math.random()}`,
      email: testEmail,
      email_verified: true,
      name: "B1 Test Student",
    });

    const uniqueIp = `10.10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const req = new NextRequest("http://127.0.0.1:3000/api/v1/auth/google", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": uniqueIp,
      },
      body: JSON.stringify({
        idToken: token,
        deviceName: "Pixel 8 Pro",
        platform: "android",
      }),
    });

    const res = await googleAuthRoute(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(json.data.tokens.accessToken);
    assert.ok(json.data.tokens.refreshToken);
    assert.equal(json.data.user.email, testEmail);

    // Verify DB records
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { accounts: true, deviceSessions: true },
    });
    assert.ok(user);
    assert.equal(user.accounts.length, 1);
    assert.equal(user.accounts[0].provider, "google");
    assert.equal(user.deviceSessions.length, 1);
  });

  test("7. Mobile endpoint rejects account takeover when email is unverified", async () => {
    const victimEmail = `victim_${Date.now()}@example.com`;
    // Create victim account with password
    await prisma.user.create({
      data: {
        email: victimEmail,
        name: "Victim User",
        password: "hashed_victim_password",
        role: "FREE",
      },
    });

    // Attacker sends Google token for victim's email, but email_verified is false
    const attackerToken = await signTestToken({
      sub: `attacker_sub_${Date.now()}`,
      email: victimEmail,
      email_verified: false,
    });

    const uniqueIp = `10.20.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const req = new NextRequest("http://127.0.0.1:3000/api/v1/auth/google", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": uniqueIp,
      },
      body: JSON.stringify({
        idToken: attackerToken,
        deviceName: "Attacker Phone",
        platform: "android",
      }),
    });

    const res = await googleAuthRoute(req);
    assert.notEqual(res.status, 200);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.match(json.error.message, /email_verified/i);

    // Assert victim account was NOT linked to attacker's sub
    const victim = await prisma.user.findUnique({
      where: { email: victimEmail },
      include: { accounts: true },
    });
    assert.equal(victim?.accounts.length, 0);
  });

  test("8. Web signIn callback rejects unverified Google email (account takeover defense)", async () => {
    const victimEmail = `web_victim_${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        email: victimEmail,
        name: "Web Victim",
        password: "hashed_password",
        role: "FREE",
      },
    });

    const allowed = await handleGoogleSignInCallback({
      user: { email: victimEmail, name: "Attacker Impersonator" },
      account: { provider: "google", providerAccountId: "attacker_google_id", type: "oauth" },
      profile: { email_verified: false },
    });

    assert.equal(allowed, false);

    const user = await prisma.user.findUnique({
      where: { email: victimEmail },
      include: { accounts: true },
    });
    assert.equal(user?.accounts.length, 0);
  });

  test("9. Web signIn callback links verified Google account to existing user", async () => {
    const existingEmail = `web_legit_${Date.now()}_${Math.random()}@example.com`;
    const googleId = `google_legit_${Date.now()}_${Math.random()}`;
    const created = await prisma.user.create({
      data: {
        email: existingEmail,
        name: "Legit User",
        password: "hashed_password",
        role: "FREE",
      },
    });

    const userObj = { email: existingEmail, name: "Legit User" };
    const allowed = await handleGoogleSignInCallback({
      user: userObj,
      account: {
        provider: "google",
        providerAccountId: googleId,
        type: "oauth",
        access_token: "mock_access_token",
      },
      profile: { email_verified: true, name: "Legit User" },
    });

    assert.equal(allowed, true);
    assert.equal(userObj.id, created.id);

    const user = await prisma.user.findUnique({
      where: { email: existingEmail },
      include: { accounts: true },
    });
    assert.equal(user?.accounts.length, 1);
    assert.equal(user?.accounts[0].provider, "google");
    assert.equal(user?.accounts[0].providerAccountId, googleId);
    assert.ok(user?.emailVerified);
  });

  test("10. Web signIn callback rejects deactivated existing user", async () => {
    const deactivatedEmail = `deactivated_${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        email: deactivatedEmail,
        name: "Deactivated User",
        password: "hashed_password",
        role: "FREE",
        isActive: false,
      },
    });

    const allowed = await handleGoogleSignInCallback({
      user: { email: deactivatedEmail },
      account: { provider: "google", providerAccountId: "deactivated_sub", type: "oauth" },
      profile: { email_verified: true },
    });

    assert.equal(allowed, false);
  });
});
