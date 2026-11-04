import crypto from "crypto";
import {
  OtpProvider,
  OtpProviderError,
  SendOtpInput,
  SendOtpResult,
  VerifyOtpInput,
  VerifyOtpResult,
} from "./types";

/**
 * Development/test-only adapter. Never constructed in NODE_ENV=production.
 *
 * It accepts exactly the documented dev code (123456) and returns a synthetic
 * verification id. It exists so local work and the automated suites can exercise
 * the full flow without spending money or sending real SMS.
 */
export const DEV_OTP_CODE = "123456";
const DEV_VERIFICATION_TTL_SECONDS = 300;

export class DevOtpProvider implements OtpProvider {
  readonly name = "dev-bypass";

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    if (process.env.NODE_ENV === "production") {
      throw new OtpProviderError("Dev OTP provider is forbidden in production", "provider_misconfigured");
    }
    return {
      verificationId: `dev_${crypto.randomUUID()}`,
      timeoutSeconds: DEV_VERIFICATION_TTL_SECONDS,
    };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    if (process.env.NODE_ENV === "production") {
      throw new OtpProviderError("Dev OTP provider is forbidden in production", "provider_misconfigured");
    }
    if (!input.verificationId.startsWith("dev_")) {
      return { verified: false, reason: "not_found" };
    }
    if (input.code === DEV_OTP_CODE) {
      return { verified: true, providerCode: 200 };
    }
    return { verified: false, reason: "invalid_code", providerCode: 702 };
  }
}
