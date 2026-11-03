import {
  OtpProvider,
  SendOtpInput,
  SendOtpResult,
  VerifyOtpInput,
  VerifyOtpResult,
} from "@/lib/services/sms-otp/types";

/**
 * Test double at the adapter boundary. No network, no SMS, no provider account.
 */
export class MockOtpProvider implements OtpProvider {
  readonly name = "mock";
  readonly codes = new Map<string, string>();
  readonly sentTo: string[] = [];
  readonly verifiedIds: string[] = [];
  verifyCalls = 0;
  readonly expired = new Set<string>();
  private counter = 0;
  nextSendError: Error | null = null;

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    if (this.nextSendError) {
      const error = this.nextSendError;
      this.nextSendError = null;
      throw error;
    }
    this.counter += 1;
    const verificationId = `mock_vid_${this.counter}_${Date.now()}`;
    this.codes.set(verificationId, "654321");
    this.sentTo.push(input.phone);
    return { verificationId, timeoutSeconds: 120 };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    this.verifyCalls += 1;
    this.verifiedIds.push(input.verificationId);
    const expected = this.codes.get(input.verificationId);
    if (!expected) return { verified: false, reason: "not_found", providerCode: 505 };
    if (this.expired.has(input.verificationId)) {
      return { verified: false, reason: "expired", providerCode: 705 };
    }
    if (input.code === expected) return { verified: true, providerCode: 200 };
    return { verified: false, reason: "invalid_code", providerCode: 702 };
  }
}

let counterSeed = 0;

/** Deterministic, unique, valid Indian mobile number for a test run. */
export function testPhone(): string {
  counterSeed += 1;
  const base = (Date.now() + counterSeed * 7919) % 1_000_000_000;
  return `9${String(base).padStart(9, "0")}`;
}

export function testIp(): string {
  counterSeed += 1;
  const runSeed = (Math.floor(Date.now() / 1000) % 200) + 1;
  return `10.${runSeed}.${(counterSeed * 29) % 250}.${(counterSeed * 7) % 250 + 1}`;
}
