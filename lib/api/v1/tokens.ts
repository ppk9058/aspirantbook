import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "fallback_secret_must_be_set_in_production_min32chars!"
);

const ISSUER = "https://aspirantbook.com";
const AUDIENCE = "aspirantbook-mobile-app";

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: string;
  sessionVersion: number;
  familyId: string;
  sessionId: string;
}

/**
 * Creates a short-lived (15 minute) JWT access token for mobile API calls.
 */
export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
    familyId: payload.familyId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT access token. Returns decoded payload if valid, null otherwise.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    return {
      sub: payload.sub,
      email: (payload.email as string) || "",
      role: (payload.role as string) || "STUDENT",
      sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : 1,
      familyId: (payload.familyId as string) || "",
      sessionId: (payload.sessionId as string) || "",
    };
  } catch (err) {
    return null;
  }
}

/**
 * Generates an opaque, cryptographically secure 256-bit random refresh token.
 */
export function generateOpaqueRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes deterministic SHA-256 hash of refresh token for safe database storage.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a short-lived (<= 5 min), purpose-bound token for sensitive operations like account deletion.
 */
export async function createReauthToken(
  userId: string,
  purpose = "delete_account",
  expiresIn = "5m"
): Promise<string> {
  return new SignJWT({
    purpose,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience("aspirantbook-reauth")
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

/**
 * Verifies a purpose-bound re-auth token.
 */
export async function verifyReauthToken(
  token: string,
  expectedUserId: string,
  expectedPurpose = "delete_account"
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: "aspirantbook-reauth",
    });

    if (payload.sub !== expectedUserId) {
      return { valid: false, reason: "Token subject mismatch" };
    }

    if (payload.purpose !== expectedPurpose) {
      return { valid: false, reason: "Invalid token purpose" };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: err?.message || "Token verification failed" };
  }
}
