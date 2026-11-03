import test, { describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { createOtpService } from "@/lib/services/sms-otp/service";
import { normalizeIndianPhone, maskPhone } from "@/lib/services/sms-otp/phone";
import { createOtpProof, consumeOtpProof } from "@/lib/services/sms-otp/proof";
import { OtpProviderError } from "@/lib/services/sms-otp/types";
import { MockOtpProvider, testIp, testPhone } from "./mock-provider";

const createdPhones: string[] = [];

after(async () => {
  if (createdPhones.length) {
    await prisma.user.deleteMany({ where: { phoneNumber: { in: createdPhones } } });
  }
  await prisma.$disconnect();
});

describe("OTP core: phone normalisation", () => {
  test("accepts 10-digit Indian mobiles starting 6-9 and normalises to +91", () => {
    const result = normalizeIndianPhone("9876543210");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.e164, "+919876543210");
    assert.equal(result.nationalNumber, "9876543210");
    assert.equal(result.countryCode, "91");
  });

  test("accepts +91, 91 and leading-zero prefixes", () => {
    for (const input of ["+91 98765 43210", "919876543210", "09876543210"]) {
      const result = normalizeIndianPhone(input);
      assert.equal(result.ok, true, `expected ${input} to be accepted`);
    }
  });

  test("rejects non-Indian, short, long and invalid-prefix numbers", () => {
    for (const input of ["+14155550123", "12345", "5876543210", "98765432100", "", "abc"]) {
      const result = normalizeIndianPhone(input);
      assert.equal(result.ok, false, `expected ${input} to be rejected`);
    }
  });

  test("masks phone numbers for logs", () => {
    assert.equal(maskPhone("+919876543210"), "+91******3210");
  });
});

describe("OTP core: service flow (provider mocked at the adapter boundary)", () => {
  test("correct code succeeds and is single-use", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0 }, provider);
    const phone = testPhone();
    createdPhones.push(phone);

    const sent = await service.sendOtp({ rawPhone: phone, ip: testIp() });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    const code = provider.codes.get(sent.verificationId)!;
    const ok = await service.verifyOtp({
      rawPhone: phone,
      code,
      verificationId: sent.verificationId,
      ip: testIp(),
    });
    assert.equal(ok.ok, true);

    const replay = await service.verifyOtp({
      rawPhone: phone,
      code,
      verificationId: sent.verificationId,
      ip: testIp(),
    });
    assert.equal(replay.ok, false);
    if (replay.ok) return;
    assert.equal(replay.code, "already_verified");
  });

  test("wrong code fails and does not consume the verification id", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0 }, provider);
    const phone = testPhone();
    createdPhones.push(phone);

    const sent = await service.sendOtp({ rawPhone: phone, ip: testIp() });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    const wrong = await service.verifyOtp({
      rawPhone: phone,
      code: "000000",
      verificationId: sent.verificationId,
      ip: testIp(),
    });
    assert.equal(wrong.ok, false);
    if (wrong.ok) return;
    assert.equal(wrong.code, "invalid_code");

    const right = await service.verifyOtp({
      rawPhone: phone,
      code: provider.codes.get(sent.verificationId)!,
      verificationId: sent.verificationId,
      ip: testIp(),
    });
    assert.equal(right.ok, true);
  });

  test("verification id is bound to the phone that requested it", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0 }, provider);
    const phoneA = testPhone();
    const phoneB = testPhone();
    createdPhones.push(phoneA, phoneB);

    const sent = await service.sendOtp({ rawPhone: phoneA, ip: testIp() });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    const crossPhone = await service.verifyOtp({
      rawPhone: phoneB,
      code: provider.codes.get(sent.verificationId)!,
      verificationId: sent.verificationId,
      ip: testIp(),
    });
    assert.equal(crossPhone.ok, false);
    if (crossPhone.ok) return;
    assert.equal(crossPhone.code, "not_found");
  });

  test("expired verification is reported as expired", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0 }, provider);
    const phone = testPhone();
    createdPhones.push(phone);

    const sent = await service.sendOtp({ rawPhone: phone, ip: testIp() });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    provider.expired.add(sent.verificationId);

    const result = await service.verifyOtp({
      rawPhone: phone,
      code: provider.codes.get(sent.verificationId)!,
      verificationId: sent.verificationId,
      ip: testIp(),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "expired");
  });

  test("resend cooldown blocks an immediate second send", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 30 }, provider);
    const phone = testPhone();
    createdPhones.push(phone);

    const first = await service.sendOtp({ rawPhone: phone, ip: testIp() });
    assert.equal(first.ok, true);

    const second = await service.sendOtp({ rawPhone: phone, ip: testIp() });
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.code, "cooldown");
    assert.ok((second.retryAfterSeconds || 0) > 0);
  });

  test("per-phone send limit (3 / 10 min) triggers", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0, sendPerPhone: 3 }, provider);
    const phone = testPhone();
    createdPhones.push(phone);

    for (let i = 0; i < 3; i++) {
      const sent = await service.sendOtp({ rawPhone: phone, ip: testIp() });
      assert.equal(sent.ok, true, `send ${i + 1} should be allowed`);
    }
    const fourth = await service.sendOtp({ rawPhone: phone, ip: testIp() });
    assert.equal(fourth.ok, false);
    if (fourth.ok) return;
    assert.equal(fourth.code, "rate_limited");
  });

  test("per-IP send limit triggers across different phones", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0, sendPerIp: 2 }, provider);
    const ip = testIp();

    for (let i = 0; i < 2; i++) {
      const phone = testPhone();
      createdPhones.push(phone);
      const sent = await service.sendOtp({ rawPhone: phone, ip });
      assert.equal(sent.ok, true, `send ${i + 1} should be allowed`);
    }

    const phone = testPhone();
    createdPhones.push(phone);
    const third = await service.sendOtp({ rawPhone: phone, ip });
    assert.equal(third.ok, false);
    if (third.ok) return;
    assert.equal(third.code, "rate_limited");
  });

  test("max verify attempts per verification id triggers", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService(
      { resendCooldownSeconds: 0, verifyAttempts: 2 },
      provider
    );
    const phone = testPhone();
    createdPhones.push(phone);

    const sent = await service.sendOtp({ rawPhone: phone, ip: testIp() });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    for (let i = 0; i < 2; i++) {
      const attempt = await service.verifyOtp({
        rawPhone: phone,
        code: "000000",
        verificationId: sent.verificationId,
        ip: testIp(),
      });
      assert.equal(attempt.ok, false);
      if (attempt.ok) return;
      assert.equal(attempt.code, "invalid_code");
    }

    const blocked = await service.verifyOtp({
      rawPhone: phone,
      code: "000000",
      verificationId: sent.verificationId,
      ip: testIp(),
    });
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.equal(blocked.code, "too_many_attempts");
  });

  test("invalid and non-Indian numbers are rejected before the provider is called", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0 }, provider);

    for (const input of ["+14155550123", "12345", "5876543210"]) {
      const sent = await service.sendOtp({ rawPhone: input, ip: testIp() });
      assert.equal(sent.ok, false);
      if (sent.ok) return;
      assert.equal(sent.code, "invalid_phone");
    }
    assert.equal(provider.sentTo.length, 0);
  });

  test("provider errors are mapped, and logs never contain the full phone or OTP", async () => {
    const provider = new MockOtpProvider();
    const service = createOtpService({ resendCooldownSeconds: 0 }, provider);
    const phone = testPhone();
    createdPhones.push(phone);

    const captured: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      captured.push(args.map((a) => String(a)).join(" "));
    };
    try {
      provider.nextSendError = new OtpProviderError("boom", "provider_unavailable", 500);
      const sent = await service.sendOtp({ rawPhone: phone, ip: testIp() });
      assert.equal(sent.ok, false);
      if (sent.ok) return;
      assert.equal(sent.code, "provider_error");
    } finally {
      console.warn = originalWarn;
    }

    const joined = captured.join("\n");
    assert.ok(joined.length > 0, "expected a diagnostic log line");
    assert.ok(!joined.includes(phone), "log must not contain the full phone number");
    assert.ok(!joined.includes("+91" + phone), "log must not contain the full E.164 number");
    assert.ok(joined.includes(maskPhone("+91" + phone)), "log should contain the masked phone");
  });
});

describe("OTP core: server-signed proof", () => {
  test("proof is valid once, bound to the phone, and single-use", async () => {
    const phone = `+91${testPhone()}`;
    const proof = createOtpProof(phone);

    const wrongPhone = await consumeOtpProof(proof, `+91${testPhone()}`);
    assert.equal(wrongPhone.valid, false);

    const first = await consumeOtpProof(proof, phone);
    assert.equal(first.valid, true);

    const replay = await consumeOtpProof(proof, phone);
    assert.equal(replay.valid, false);
    assert.match(replay.reason || "", /already been used/);
  });

  test("expired proof is rejected", async () => {
    const phone = `+91${testPhone()}`;
    const proof = createOtpProof(phone, -1000);
    const result = await consumeOtpProof(proof, phone);
    assert.equal(result.valid, false);
    assert.match(result.reason || "", /expired/);
  });

  test("tampered proof is rejected", async () => {
    const phone = `+91${testPhone()}`;
    const proof = createOtpProof(phone);
    const tampered = proof.slice(0, -2) + (proof.endsWith("aa") ? "bb" : "aa");
    const result = await consumeOtpProof(tampered, phone);
    assert.equal(result.valid, false);
  });
});
