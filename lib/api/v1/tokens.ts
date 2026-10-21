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

// In-process tracking for single-use re-auth tokens (prevents token reuse)
const usedReauthTokens = new Map<string, number>();

export function isReauthTokenUsed(jti: string): boolean {
  const expiry = usedReauthTokens.get(jti);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    usedReauthTokens.delete(jti);
    return false;
  }
  return true;
}

export function markReauthTokenUsed(jti: string, ttlMs = 10 * 60 * 1000): void {
  usedReauthTokens.set(jti, Date.now() + ttlMs);
  if (usedReauthTokens.size > 2000) {
    const now = Date.now();
    for (const [k, exp] of usedReauthTokens.entries()) {
      if (now > exp) usedReauthTokens.delete(k);
    }
  }
}

/**
 * Creates a short-lived (<= 5 min), purpose-bound token for sensitive operations like account deletion.
 * Tied to user and active session.
 */
export async function createReauthToken(
  userId: string,
  purpose = "delete_account",
  expiresIn = "5m",
  sessionId?: string | null
): Promise<string> {
  const jti = crypto.randomUUID();
  return new SignJWT({
    purpose,
    sessionId: sessionId || undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience("aspirantbook-reauth")
    .setExpirationTime(expiresIn)
    .setJti(jti)
    .sign(JWT_SECRET);
}

/**
 * Verifies a purpose-bound re-auth token.
 * Validates expiration, user ID match, purpose match, optional session match, and single-use reuse detection.
 */
export async function verifyReauthToken(
  token: string,
  expectedUserId: string,
  expectedPurpose = "delete_account",
  expectedSessionId?: string | null
): Promise<{ valid: boolean; reason?: string; jti?: string }> {
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

    if (payload.sessionId && expectedSessionId && payload.sessionId !== expectedSessionId) {
      return { valid: false, reason: "Session mismatch" };
    }

    const jti = payload.jti as string | undefined;
    if (jti && isReauthTokenUsed(jti)) {
      return { valid: false, reason: "Token has already been used (reuse rejected)" };
    }

    return { valid: true, jti };
  } catch (err: any) {
    return { valid: false, reason: err?.message || "Token verification failed" };
  }
}
