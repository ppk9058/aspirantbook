/**
 * Provider-agnostic OTP adapter contract.
 *
 * Every SMS provider (Message Central today, MSG91/Twilio later) implements this
 * interface. Routes and the OTP service never import a provider directly: they
 * depend on this contract only, so swapping providers is a one-file change in
 * `provider.ts`.
 */

export interface SendOtpInput {
  /** E.164-ish phone, e.g. +919876543210. Never logged in full. */
  phone: string;
  /** Numeric country code without "+", e.g. "91". */
  countryCode: string;
  /** National number without country code, e.g. "9876543210". */
  nationalNumber: string;
  /** Requested OTP length. Message Central accepts 4-8. */
  otpLength: number;
}

export interface SendOtpResult {
  /** Opaque id the provider requires when validating the code. */
  verificationId: string;
  /** Provider-advertised lifetime in seconds, when supplied. */
  timeoutSeconds?: number;
}

export type OtpVerifyFailureReason =
  | "invalid_code"
  | "expired"
  | "already_verified"
  | "not_found"
  | "provider_error";

export interface VerifyOtpInput {
  phone: string;
  countryCode: string;
  nationalNumber: string;
  code: string;
  verificationId: string;
}

export interface VerifyOtpResult {
  verified: boolean;
  reason?: OtpVerifyFailureReason;
  /** Raw provider response code, for logs (contains no PII). */
  providerCode?: number;
}

export interface OtpProvider {
  /** Stable name used in logs and diagnostics. */
  readonly name: string;
  sendOtp(input: SendOtpInput): Promise<SendOtpResult>;
  verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult>;
}

export class OtpProviderError extends Error {
  readonly code:
    | "provider_unavailable"
    | "provider_rejected"
    | "provider_rate_limited"
    | "provider_misconfigured";
  readonly providerCode?: number;

  constructor(
    message: string,
    code:
      | "provider_unavailable"
      | "provider_rejected"
      | "provider_rate_limited"
      | "provider_misconfigured" = "provider_unavailable",
    providerCode?: number
  ) {
    super(message);
    this.name = "OtpProviderError";
    this.code = code;
    this.providerCode = providerCode;
  }
}
