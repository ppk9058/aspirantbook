import crypto from "crypto";
import { consumeReauthToken } from "@/lib/api/v1/tokens";

/**
 * Server-signed proof that a phone number passed a real OTP verification.
 *
 * The web NextAuth `mobile` Credentials provider accepts a session ONLY when the
 * caller presents this proof. A bare `phoneNumber` can never sign anyone in.
 *
 * Format: base64url(payloadJson) + "." + base64url(HMAC-SHA256(secret, payload))
 * Payload: { v, p: "otp-mobile-login", phone, exp, jti }
 *
 * The `jti` is consumed atomically in the database (ReauthTokenUse), so a proof
 * cannot be replayed, including across serverless instances.
 */

export const OTP_PROOF_TTL_MS = 2 * 60 * 1000;
const PROOF_PURPOSE = "otp-mobile-login";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[otp] AUTH_SECRET/NEXTAUTH_SECRET is required to sign OTP proofs in production");
    }
    // Development/test only. Production never reaches this branch.
    return "dev_only_otp_proof_secret_do_not_use_in_production";
  }
  return secret;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadPart: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payloadPart).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface OtpProofPayload {
  v: 1;
  p: typeof PROOF_PURPOSE;
  phone: string;
  exp: number;
  jti: string;
}

export function createOtpProof(phoneE164: string, ttlMs: number = OTP_PROOF_TTL_MS): string {
  const payload: OtpProofPayload = {
    v: 1,
    p: PROOF_PURPOSE,
    phone: phoneE164,
    exp: Date.now() + ttlMs,
    jti: crypto.randomUUID(),
  };
  const payloadPart = base64url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
}

export interface OtpProofVerification {
  valid: boolean;
  reason?: string;
  phone?: string;
}

export async function consumeOtpProof(
  token: unknown,
  expectedPhoneE164: string
): Promise<OtpProofVerification> {
  if (typeof token !== "string" || token.length > 2048) {
    return { valid: false, reason: "Missing or malformed proof" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "Missing or malformed proof" };
  }

  const [payloadPart, signature] = parts;
  if (!safeEqual(signature, sign(payloadPart))) {
    return { valid: false, reason: "Invalid proof signature" };
  }

  let payload: OtpProofPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "Invalid proof payload" };
  }

  if (payload.v !== 1 || payload.p !== PROOF_PURPOSE) {
    return { valid: false, reason: "Invalid proof purpose" };
  }
  if (typeof payload.phone !== "string" || payload.phone !== expectedPhoneE164) {
    return { valid: false, reason: "Proof does not match this phone number" };
  }
  if (typeof payload.exp !== "number" || payload.exp <= Date.now()) {
    return { valid: false, reason: "Proof has expired" };
  }
  if (typeof payload.jti !== "string" || !payload.jti) {
    return { valid: false, reason: "Invalid proof id" };
  }

  let consumed = false;
  try {
    consumed = await consumeReauthToken(`otp-proof:${payload.jti}`, 10 * 60 * 1000);
  } catch (error) {
    console.error("[otp] could not record proof use:", error);
    return { valid: false, reason: "Proof could not be consumed" };
  }
  if (!consumed) {
    return { valid: false, reason: "Proof has already been used" };
  }

  return { valid: true, phone: payload.phone };
}
