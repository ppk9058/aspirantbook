import test, { describe, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials, authorizeMobileCredentials } from "@/auth";
import { getAppConfig } from "@/lib/services/config.service";
import {
  __resetOtpProviderForTests,
  __setOtpProviderForTests,
  getOtpProvider,
  isOtpDevBypassAllowed,
  isOtpEnabled,
} from "@/lib/services/sms-otp/provider";
import { validateBootSecurity } from "@/lib/boot-guard";
import { createOtpProof } from "@/lib/services/sms-otp/proof";
import { MockOtpProvider, testPhone } from "./mock-provider";

const ENV_KEYS = [
  "NODE_ENV",
  "APP_ENV",
  "ALLOW_DEV_MOBILE_LOGIN",
  "DATABASE_URL",
  "DIRECT_URL",
  "MESSAGE_CENTRAL_CUSTOMER_ID",
  "MESSAGE_CENTRAL_AUTH_KEY",
  "MESSAGE_CENTRAL_BASE_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "PERSIST_BACKEND",
] as const;

const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

function setProductionDbEnv(): void {
  process.env.PERSIST_BACKEND = "db";
  process.env.DATABASE_URL = "postgresql://u:p@db.example.com:5432/prod?sslmode=require";
  process.env.DIRECT_URL = "postgresql://u:p@db.example.com:5432/prod?sslmode=require";
}

function restoreEnv(): void {
  const env = process.env as Record<string, string | undefined>;
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete env[key];
    else env[key] = originalEnv[key];
  }
}

const createdEmails: string[] = [];

// Proof signing needs a secret in production-mode tests.
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.AUTH_SECRET = "otp_test_proof_secret_only";
}

after(async () => {
  restoreEnv();
  __resetOtpProviderForTests();
  if (createdEmails.length) {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }
  await prisma.$disconnect();
});

describe("OTP security: production cannot enable any bypass", () => {
  test("isOtpDevBypassAllowed is false in production even with the dev flag and APP_ENV=test", () => {
    __resetOtpProviderForTests();
    (process.env as any).NODE_ENV = "production";
    process.env.APP_ENV = "test";
    process.env.ALLOW_DEV_MOBILE_LOGIN = "true";

    assert.equal(isOtpDevBypassAllowed(), false);
    assert.equal(getOtpProvider(), null);
    assert.equal(isOtpEnabled(), false);
    assert.equal(getAppConfig().otpAuthEnabled, false);
  });

  test("the provider test override refuses to work in production", () => {
    (process.env as any).NODE_ENV = "production";
    assert.throws(() => __setOtpProviderForTests(new MockOtpProvider()), /forbidden in production/);
    __resetOtpProviderForTests();
  });

  test("boot guard refuses production with a half-configured Message Central credential", () => {
    const savedDb = process.env.DATABASE_URL;
    const savedDirect = process.env.DIRECT_URL;
    const savedPersist = process.env.PERSIST_BACKEND;
    (process.env as any).NODE_ENV = "production";
    delete process.env.APP_ENV;
    setProductionDbEnv();
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;
    process.env.MESSAGE_CENTRAL_CUSTOMER_ID = "test-customer";
    delete process.env.MESSAGE_CENTRAL_AUTH_KEY;

    try {
      assert.throws(
        () => validateBootSecurity(),
        /MESSAGE_CENTRAL_CUSTOMER_ID and MESSAGE_CENTRAL_AUTH_KEY/
      );
    } finally {
      if (savedDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedDb;
      if (savedDirect === undefined) delete process.env.DIRECT_URL;
      else process.env.DIRECT_URL = savedDirect;
      if (savedPersist === undefined) delete process.env.PERSIST_BACKEND;
      else process.env.PERSIST_BACKEND = savedPersist;
    }
  });

  test("boot guard does not break when OTP is simply unset", () => {
    const savedDb = process.env.DATABASE_URL;
    const savedDirect = process.env.DIRECT_URL;
    const savedPersist = process.env.PERSIST_BACKEND;
    (process.env as any).NODE_ENV = "production";
    delete process.env.APP_ENV;
    setProductionDbEnv();
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;
    delete process.env.MESSAGE_CENTRAL_CUSTOMER_ID;
    delete process.env.MESSAGE_CENTRAL_AUTH_KEY;

    try {
      assert.doesNotThrow(() => validateBootSecurity());
    } finally {
      if (savedDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedDb;
      if (savedDirect === undefined) delete process.env.DIRECT_URL;
      else process.env.DIRECT_URL = savedDirect;
      if (savedPersist === undefined) delete process.env.PERSIST_BACKEND;
      else process.env.PERSIST_BACKEND = savedPersist;
    }
  });
});

describe("OTP security: config flag follows provider credentials", () => {
  test("otpAuthEnabled is true when both provider credentials are present", () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.APP_ENV;
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;
    process.env.MESSAGE_CENTRAL_CUSTOMER_ID = "test-customer";
    process.env.MESSAGE_CENTRAL_AUTH_KEY = "test-key";

    assert.equal(isOtpEnabled(), true);
    assert.equal(getAppConfig().otpAuthEnabled, true);
  });

  test("otpAuthEnabled is false in production without credentials", () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.APP_ENV;
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;
    delete process.env.MESSAGE_CENTRAL_CUSTOMER_ID;
    delete process.env.MESSAGE_CENTRAL_AUTH_KEY;

    assert.equal(isOtpEnabled(), false);
    assert.equal(getAppConfig().otpAuthEnabled, false);
  });
});

describe("OTP security: web authorize boundary", () => {
  test("bare phoneNumber and forged proof are both rejected", async () => {
    const phone = testPhone();

    assert.equal(await authorizeMobileCredentials({ phoneNumber: phone }), null);
    assert.equal(await authorizeMobileCredentials({ phoneNumber: phone, proof: "not-a-proof" }), null);
    assert.equal(await authorizeMobileCredentials({ phoneNumber: phone, proof: "a.b" }), null);
  });

  test("a proof for a different phone cannot sign in another number", async () => {
    const phoneA = testPhone();
    const phoneB = testPhone();

    await prisma.user.create({
      data: {
        phoneNumber: phoneB,
        email: `otp_cross_${phoneB}@example.test`,
        name: "Cross",
        role: "FREE",
      },
    });
    createdEmails.push(`otp_cross_${phoneB}@example.test`);

    const proofForA = createOtpProof(`+91${phoneA}`);
    const result = await authorizeMobileCredentials({ phoneNumber: phoneB, proof: proofForA });
    assert.equal(result, null);
  });

  test("an existing phone cannot sign in with no proof or with a forged proof", async () => {
    const phone = testPhone();
    const email = `otp_existing_proof_${phone}@example.test`;

    await prisma.user.create({
      data: { phoneNumber: phone, email, name: "Existing Proof", role: "FREE" },
    });
    createdEmails.push(email);

    // The account exists, so a null result here can only come from the proof check.
    assert.equal(
      await authorizeMobileCredentials({ phoneNumber: phone }),
      null,
      "an existing account must not sign in without a proof"
    );
    assert.equal(
      await authorizeMobileCredentials({ phoneNumber: phone, proof: "forged.proof" }),
      null,
      "an existing account must not sign in with a forged proof"
    );
    assert.equal(
      await authorizeMobileCredentials({ phoneNumber: phone, proof: "a.b" }),
      null,
      "an existing account must not sign in with a malformed proof"
    );

    // Sanity: the same account does sign in with a genuine proof, so the nulls
    // above are proof rejections and not a missing-user artefact.
    const genuine = await authorizeMobileCredentials({
      phoneNumber: phone,
      proof: createOtpProof(`+91${phone}`),
    });
    assert.ok(genuine, "a genuine proof for the existing account must sign in");
  });
});

describe("OTP security: email + password regression", () => {
  test("email and password login still works unchanged", async () => {
    const email = `otp_regression_${Date.now()}@example.test`;
    const password = "ValidPassword123!";
    createdEmails.push(email);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: "Regression", role: "FREE", isActive: true },
    });

    const ok = await authorizeCredentials({ email, password });
    assert.ok(ok);
    assert.equal(ok?.id, user.id);

    const wrong = await authorizeCredentials({ email, password: "WrongPassword123!" });
    assert.equal(wrong, null);
  });
});
