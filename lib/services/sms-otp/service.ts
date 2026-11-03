import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumeReauthToken } from "@/lib/api/v1/tokens";
import { maskPhone, normalizeIndianPhone, type NormalizedPhone } from "./phone";
import { getOtpProvider } from "./provider";
import { OtpProvider, OtpProviderError } from "./types";

/**
 * OTP orchestration: normalisation, our own rate limits, phone↔verificationId
 * binding, single-use enforcement, and provider calls.
 *
 * What we store (and nothing else):
 *  - sha256(verificationId + ":" + e164) in ReauthTokenUse with a TTL  → binding
 *  - sha256(verificationId) in ReauthTokenUse on success               → replay block
 *  - counters in RateLimit
 * The provider keeps the OTP itself; we never store or log the code or the full
 * phone number.
 */

export const OTP_CODE_LENGTH = 6;

export interface OtpServiceOptions {
  sendPerPhone?: number;
  sendPerPhoneWindowSecs?: number;
  sendPerIp?: number;
  sendPerIpWindowSecs?: number;
  resendCooldownSeconds?: number;
  verifyAttempts?: number;
  verifyWindowSecs?: number;
}

const DEFAULT_OPTIONS: Required<OtpServiceOptions> = {
  sendPerPhone: 3,
  sendPerPhoneWindowSecs: 10 * 60,
  sendPerIp: 10,
  sendPerIpWindowSecs: 60 * 60,
  resendCooldownSeconds: 30,
  verifyAttempts: 5,
  verifyWindowSecs: 10 * 60,
};

const MIN_BINDING_SECONDS = 60;
const MAX_BINDING_SECONDS = 600;

export type SendOtpFailureCode =
  | "invalid_phone"
  | "not_configured"
  | "cooldown"
  | "rate_limited"
  | "provider_rate_limited"
  | "provider_error";

export type SendOtpOutcome =
  | {
      ok: true;
      verificationId: string;
      expiresInSeconds: number;
      resendAfterSeconds: number;
      devBypass: boolean;
    }
  | {
      ok: false;
      code: SendOtpFailureCode;
      message: string;
      retryAfterSeconds?: number;
    };

export type VerifyOtpFailureCode =
  | "invalid_phone"
  | "invalid_code"
  | "expired"
  | "already_verified"
  | "not_found"
  | "not_configured"
  | "too_many_attempts"
  | "provider_rate_limited"
  | "provider_error";

export type VerifyOtpOutcome =
  | { ok: true; phone: NormalizedPhone; devBypass: boolean }
  | {
      ok: false;
      code: VerifyOtpFailureCode;
      message: string;
      retryAfterSeconds?: number;
    };

export interface OtpService {
  sendOtp(input: { rawPhone: unknown; ip: string }): Promise<SendOtpOutcome>;
  verifyOtp(input: {
    rawPhone: unknown;
    code: unknown;
    verificationId: unknown;
    ip: string;
  }): Promise<VerifyOtpOutcome>;
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function bindingJti(verificationId: string, e164: string): string {
  return `otp-bind:${hash(`${verificationId}:${e164}`)}`;
}

function usedJti(verificationId: string): string {
  return `otp-used:${hash(verificationId)}`;
}

async function storeBinding(verificationId: string, e164: string, ttlSeconds: number): Promise<void> {
  const jti = bindingJti(verificationId, e164);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  try {
    await prisma.reauthTokenUse.create({ data: { jti, expiresAt } });
  } catch (error: any) {
    // Duplicate binding is harmless (a retried provider response); anything else
    // is a real failure and must surface, not be swallowed.
    if (error?.code !== "P2002") throw error;
  }
}

async function bindingExists(verificationId: string, e164: string): Promise<boolean> {
  const row = await prisma.reauthTokenUse.findUnique({
    where: { jti: bindingJti(verificationId, e164) },
    select: { expiresAt: true },
  });
  return Boolean(row && row.expiresAt.getTime() > Date.now());
}

function mapProviderError(error: unknown, action: "send" | "verify"): {
  code: "provider_error" | "provider_rate_limited";
  message: string;
} {
  if (error instanceof OtpProviderError) {
    if (error.code === "provider_rate_limited" && action === "send") {
      return {
        code: "provider_rate_limited",
        message: "Too many verification codes requested. Please try again later.",
      };
    }
    if (action === "send") {
      return {
        code: "provider_error",
        message: "We could not send the verification code right now. Please try again.",
      };
    }
    return {
      code: "provider_error",
      message: "We could not verify the code right now. Please try again.",
    };
  }
  return {
    code: "provider_error",
    message:
      action === "send"
        ? "We could not send the verification code right now. Please try again."
        : "We could not verify the code right now. Please try again.",
  };
}

export function createOtpService(
  options: OtpServiceOptions = {},
  providerOverride?: OtpProvider | null
): OtpService {
  const config = { ...DEFAULT_OPTIONS, ...options };

  function resolveProvider(): OtpProvider | null {
    return providerOverride === undefined ? getOtpProvider() : providerOverride;
  }

  return {
    async sendOtp({ rawPhone, ip }): Promise<SendOtpOutcome> {
      const phone = normalizeIndianPhone(rawPhone);
      if (!phone.ok) {
        return { ok: false, code: "invalid_phone", message: phone.error };
      }

      const provider = resolveProvider();
      if (!provider) {
        return {
          ok: false,
          code: "not_configured",
          message: "SMS OTP service is currently disabled. Please use email & password sign-in.",
        };
      }

      const phoneHash = hash(phone.e164);

      if (config.resendCooldownSeconds > 0) {
        const cooldown = await checkRateLimit(
          `otp:cooldown:${phoneHash}`,
          1,
          config.resendCooldownSeconds,
          { failClosed: true }
        );
        if (!cooldown.allowed) {
          return {
            ok: false,
            code: "cooldown",
            message: "Please wait before requesting another verification code.",
            retryAfterSeconds: cooldown.remainingSeconds,
          };
        }
      }

      const perPhone = await checkRateLimit(
        `otp:send:phone:${phoneHash}`,
        config.sendPerPhone,
        config.sendPerPhoneWindowSecs,
        { failClosed: true }
      );
      if (!perPhone.allowed) {
        return {
          ok: false,
          code: "rate_limited",
          message: "Too many verification codes requested for this number. Please try again later.",
          retryAfterSeconds: perPhone.remainingSeconds,
        };
      }

      const perIp = await checkRateLimit(
        `otp:send:ip:${ip}`,
        config.sendPerIp,
        config.sendPerIpWindowSecs,
        { failClosed: true }
      );
      if (!perIp.allowed) {
        return {
          ok: false,
          code: "rate_limited",
          message: "Too many verification codes requested. Please try again later.",
          retryAfterSeconds: perIp.remainingSeconds,
        };
      }

      try {
        const sent = await provider.sendOtp({
          phone: phone.e164,
          countryCode: phone.countryCode,
          nationalNumber: phone.nationalNumber,
          otpLength: OTP_CODE_LENGTH,
        });

        const expiresInSeconds = Math.min(
          MAX_BINDING_SECONDS,
          Math.max(MIN_BINDING_SECONDS, sent.timeoutSeconds ?? 300)
        );

        await storeBinding(sent.verificationId, phone.e164, expiresInSeconds);

        return {
          ok: true,
          verificationId: sent.verificationId,
          expiresInSeconds,
          resendAfterSeconds: config.resendCooldownSeconds,
          devBypass: provider.name === "dev-bypass",
        };
      } catch (error) {
        const mapped = mapProviderError(error, "send");
        console.warn(
          "[otp] send failed provider=%s phone=%s providerCode=%s",
          provider.name,
          maskPhone(phone.e164),
          error instanceof OtpProviderError ? error.providerCode ?? "none" : "unknown"
        );
        return { ok: false, ...mapped };
      }
    },

    async verifyOtp({ rawPhone, code, verificationId, ip }): Promise<VerifyOtpOutcome> {
      const phone = normalizeIndianPhone(rawPhone);
      if (!phone.ok) {
        return { ok: false, code: "invalid_phone", message: phone.error };
      }

      const provider = resolveProvider();
      if (!provider) {
        return {
          ok: false,
          code: "not_configured",
          message: "SMS OTP service is currently disabled. Please use email & password sign-in.",
        };
      }

      if (typeof verificationId !== "string" || !verificationId || verificationId.length > 200) {
        return {
          ok: false,
          code: "not_found",
          message: "Invalid or expired verification code. Please request a new one.",
        };
      }

      if (typeof code !== "string" || !new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(code.trim())) {
        return {
          ok: false,
          code: "invalid_code",
          message: "Please enter the 6-digit verification code.",
        };
      }

      let bound = false;
      try {
        bound = await bindingExists(verificationId, phone.e164);
      } catch (error) {
        console.error("[otp] binding lookup failed:", error);
        return {
          ok: false,
          code: "provider_error",
          message: "We could not verify the code right now. Please try again.",
        };
      }
      if (!bound) {
        return {
          ok: false,
          code: "not_found",
          message: "Invalid or expired verification code. Please request a new one.",
        };
      }

      const attempts = await checkRateLimit(
        `otp:verify:${hash(verificationId)}`,
        config.verifyAttempts,
        config.verifyWindowSecs,
        { failClosed: true }
      );
      if (!attempts.allowed) {
        return {
          ok: false,
          code: "too_many_attempts",
          message: "Too many incorrect attempts. Please request a new code.",
          retryAfterSeconds: attempts.remainingSeconds,
        };
      }

      let result;
      try {
        result = await provider.verifyOtp({
          phone: phone.e164,
          countryCode: phone.countryCode,
          nationalNumber: phone.nationalNumber,
          code: code.trim(),
          verificationId,
        });
      } catch (error) {
        const mapped = mapProviderError(error, "verify");
        console.warn(
          "[otp] verify failed provider=%s phone=%s providerCode=%s",
          provider.name,
          maskPhone(phone.e164),
          error instanceof OtpProviderError ? error.providerCode ?? "none" : "unknown"
        );
        return { ok: false, ...mapped };
      }

      if (!result.verified) {
        switch (result.reason) {
          case "expired":
            return {
              ok: false,
              code: "expired",
              message: "The verification code has expired. Please request a new one.",
            };
          case "already_verified":
            return {
              ok: false,
              code: "already_verified",
              message: "This verification code has already been used. Please request a new one.",
            };
          case "not_found":
            return {
              ok: false,
              code: "not_found",
              message: "Invalid or expired verification code. Please request a new one.",
            };
          case "invalid_code":
            return {
              ok: false,
              code: "invalid_code",
              message: "Incorrect verification code. Please try again.",
            };
          default:
            return {
              ok: false,
              code: "provider_error",
              message: "We could not verify the code right now. Please try again.",
            };
        }
      }

      // Block replay even if the provider would accept the same id again.
      let consumed = false;
      try {
        consumed = await consumeReauthToken(usedJti(verificationId), 10 * 60 * 1000);
      } catch (error) {
        console.error("[otp] could not record verification use:", error);
        return {
          ok: false,
          code: "provider_error",
          message: "We could not verify the code right now. Please try again.",
        };
      }
      if (!consumed) {
        return {
          ok: false,
          code: "already_verified",
          message: "This verification code has already been used. Please request a new one.",
        };
      }

      void ip; // IP is already accounted for by the send limits; verify is per-id.

      return { ok: true, phone, devBypass: provider.name === "dev-bypass" };
    },
  };
}

export const otpService = createOtpService();
