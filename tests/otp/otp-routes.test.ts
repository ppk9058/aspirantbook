import test, { describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as webMobileLogin } from "@/app/api/auth/mobile-login/route";
import { POST as v1OtpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as v1OtpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { authorizeMobileCredentials } from "@/auth";
import {
  __resetOtpProviderForTests,
  __setOtpProviderForTests,
} from "@/lib/services/sms-otp/provider";
import { MockOtpProvider, testPhone } from "./mock-provider";

const createdPhones: string[] = [];
let provider: MockOtpProvider;
let ipCounter = 0;

function nextIp(): string {
  ipCounter += 1;
  return `203.0.113.${(ipCounter % 250) + 1}`;
}

function jsonRequest(url: string, body: unknown, ip = nextIp()): NextRequest {
  return new NextRequest(`http://127.0.0.1:3047${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<any> {
  return response.json();
}

before(() => {
  process.env.TRUST_PROXY = "true";
});

beforeEach(() => {
  provider = new MockOtpProvider();
  __setOtpProviderForTests(provider);
});

afterEach(() => {
  __resetOtpProviderForTests();
});

after(async () => {
  process.env.TRUST_PROXY = "false";
  if (createdPhones.length) {
    await prisma.user.deleteMany({ where: { phoneNumber: { in: createdPhones } } });
  }
  await prisma.$disconnect();
});

describe("Web mobile-login route (real OTP, mocked provider)", () => {
  test("a bare phoneNumber cannot sign in: it only triggers an OTP send", async () => {
    const phone = testPhone();
    createdPhones.push(phone);

    const res = await webMobileLogin(jsonRequest("/api/auth/mobile-login", { phoneNumber: phone }));
    assert.equal(res.status, 200);
    const body = await readJson(res);
    assert.equal(body.success, true);
    assert.equal(body.step, "otp");
    assert.ok(body.verificationId);
    assert.equal(body.proof, undefined, "no proof may be issued before verification");

    const signInAttempt = await authorizeMobileCredentials({ phoneNumber: phone });
    assert.equal(signInAttempt, null, "authorize must reject a bare phoneNumber");
  });

  test("wrong code fails; correct code returns a proof that signs in once", async () => {
    const phone = testPhone();
    createdPhones.push(phone);

    const sentRes = await webMobileLogin(jsonRequest("/api/auth/mobile-login", { phoneNumber: phone }));
    const sent = await readJson(sentRes);
    const verificationId = sent.verificationId as string;

    const wrongRes = await webMobileLogin(
      jsonRequest("/api/auth/mobile-login", { phoneNumber: phone, code: "000000", verificationId })
    );
    assert.equal(wrongRes.status, 401);

    const code = provider.codes.get(verificationId)!;
    const okRes = await webMobileLogin(
      jsonRequest("/api/auth/mobile-login", { phoneNumber: phone, code, verificationId })
    );
    assert.equal(okRes.status, 200);
    const ok = await readJson(okRes);
    assert.equal(ok.success, true);
    assert.ok(ok.proof);

    const authorized = await authorizeMobileCredentials({ phoneNumber: phone, proof: ok.proof });
    assert.ok(authorized);
    assert.equal(authorized?.phoneNumber, phone);

    const replay = await authorizeMobileCredentials({ phoneNumber: phone, proof: ok.proof });
    assert.equal(replay, null, "a proof must be single-use");
  });

  test("invalid phone numbers are rejected with 400", async () => {
    const res = await webMobileLogin(
      jsonRequest("/api/auth/mobile-login", { phoneNumber: "+14155550123" })
    );
    assert.equal(res.status, 400);
  });

  test("resend cooldown returns 429", async () => {
    const phone = testPhone();
    createdPhones.push(phone);
    const ip = nextIp();

    const first = await webMobileLogin(jsonRequest("/api/auth/mobile-login", { phoneNumber: phone }, ip));
    assert.equal(first.status, 200);
    const second = await webMobileLogin(jsonRequest("/api/auth/mobile-login", { phoneNumber: phone }, ip));
    assert.equal(second.status, 429);
    const body = await readJson(second);
    assert.ok(body.retryAfter > 0);
  });

  test("send responses do not reveal whether an account exists", async () => {
    const existingPhone = testPhone();
    const newPhone = testPhone();
    createdPhones.push(existingPhone, newPhone);

    await prisma.user.create({
      data: {
        phoneNumber: existingPhone,
        email: `otp_existing_${existingPhone}@example.test`,
        name: "Existing",
        role: "FREE",
      },
    });

    const existingRes = await webMobileLogin(
      jsonRequest("/api/auth/mobile-login", { phoneNumber: existingPhone })
    );
    const newRes = await webMobileLogin(
      jsonRequest("/api/auth/mobile-login", { phoneNumber: newPhone })
    );

    assert.equal(existingRes.status, newRes.status);
    const existingBody = await readJson(existingRes);
    const newBody = await readJson(newRes);
    assert.deepEqual(Object.keys(existingBody).sort(), Object.keys(newBody).sort());
    assert.equal(existingBody.success, newBody.success);
    assert.equal(existingBody.step, newBody.step);
  });
});

describe("Mobile v1 OTP routes (real OTP, mocked provider)", () => {
  test("request returns a verification id; verify returns today's token/user shape", async () => {
    const phone = testPhone();
    createdPhones.push(phone);

    const reqRes = await v1OtpRequest(jsonRequest("/api/v1/auth/otp/request", { phoneNumber: phone }));
    assert.equal(reqRes.status, 200);
    const reqBody = await readJson(reqRes);
    assert.equal(reqBody.ok, true);
    assert.ok(reqBody.data.verificationId);

    const verificationId = reqBody.data.verificationId as string;
    const code = provider.codes.get(verificationId)!;

    const verifyRes = await v1OtpVerify(
      jsonRequest("/api/v1/auth/otp/verify", {
        phoneNumber: phone,
        code,
        verificationId,
        platform: "android",
        deviceName: "OTP Test Device",
      })
    );
    assert.equal(verifyRes.status, 200);
    const verifyBody = await readJson(verifyRes);
    assert.equal(verifyBody.ok, true);
    assert.ok(verifyBody.data.tokens.accessToken);
    assert.ok(verifyBody.data.tokens.refreshToken);
    assert.equal(verifyBody.data.user.phoneNumber, phone);
    assert.equal(verifyBody.data.user.role, "FREE");

    const sessions = await prisma.deviceSession.findMany({ where: { userId: verifyBody.data.user.id } });
    assert.equal(sessions.length, 1);
  });

  test("verify without a verificationId is rejected (bare phone cannot sign in)", async () => {
    const phone = testPhone();
    createdPhones.push(phone);

    const res = await v1OtpVerify(
      jsonRequest("/api/v1/auth/otp/verify", { phoneNumber: phone, otp: "123456" })
    );
    assert.equal(res.status, 400);
    const body = await readJson(res);
    assert.equal(body.ok, false);
  });

  test("wrong code returns 401; replaying a used verification id returns 401", async () => {
    const phone = testPhone();
    createdPhones.push(phone);

    const reqRes = await v1OtpRequest(jsonRequest("/api/v1/auth/otp/request", { phoneNumber: phone }));
    const reqBody = await readJson(reqRes);
    const verificationId = reqBody.data.verificationId as string;

    const wrong = await v1OtpVerify(
      jsonRequest("/api/v1/auth/otp/verify", {
        phoneNumber: phone,
        code: "000000",
        verificationId,
      })
    );
    assert.equal(wrong.status, 401);

    const code = provider.codes.get(verificationId)!;
    const ok = await v1OtpVerify(
      jsonRequest("/api/v1/auth/otp/verify", {
        phoneNumber: phone,
        code,
        verificationId,
      })
    );
    assert.equal(ok.status, 200);

    const replay = await v1OtpVerify(
      jsonRequest("/api/v1/auth/otp/verify", {
        phoneNumber: phone,
        code,
        verificationId,
      })
    );
    assert.equal(replay.status, 401);
    const replayBody = await readJson(replay);
    assert.equal(replayBody.error.code, "UNAUTHORIZED");
  });

  test("invalid phone is rejected before the provider is called", async () => {
    const res = await v1OtpRequest(
      jsonRequest("/api/v1/auth/otp/request", { phoneNumber: "12345" })
    );
    assert.equal(res.status, 400);
    assert.equal(provider.sentTo.length, 0);
  });

  test("mobile request responses do not reveal account existence", async () => {
    const existingPhone = testPhone();
    const newPhone = testPhone();
    createdPhones.push(existingPhone, newPhone);

    await prisma.user.create({
      data: {
        phoneNumber: existingPhone,
        email: `otp_v1_existing_${existingPhone}@example.test`,
        name: "Existing",
        role: "FREE",
      },
    });

    const a = await v1OtpRequest(jsonRequest("/api/v1/auth/otp/request", { phoneNumber: existingPhone }));
    const b = await v1OtpRequest(jsonRequest("/api/v1/auth/otp/request", { phoneNumber: newPhone }));
    assert.equal(a.status, b.status);
    const aBody = await readJson(a);
    const bBody = await readJson(b);
    assert.deepEqual(Object.keys(aBody.data).sort(), Object.keys(bBody.data).sort());
    assert.equal(aBody.data.message, bBody.data.message);
  });
});
