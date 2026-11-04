import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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
 * B-007 class fix: single-use re-auth tokens are recorded in the database.
 *
 * The old implementation used a module-level Map, which is per serverless
 * instance: a token could be replayed once per instance inside its 5 minute
 * lifetime. The database row is now the only record, and consumption is a
 * single atomic INSERT (unique jti), so two parallel requests cannot both win.
 */

/** Throws on database errors so callers fail closed. */
export async function isReauthTokenUsed(jti: string): Promise<boolean> {
  const row = await (prisma as any).reauthTokenUse?.findUnique?.({ where: { jti }, select: { jti: true } })
  return Boolean(row)
}

/**
 * Atomically records a token as used. Returns false when it was already used.
 * Throws on database errors so the caller can fail closed.
 */
export async function consumeReauthToken(jti: string, ttlMs = 10 * 60 * 1000): Promise<boolean> {
  const expiresAt = new Date(Date.now() + ttlMs)
  try {
    await (prisma as any).reauthTokenUse?.create?.({ data: { jti, expiresAt } })
  } catch (error: any) {
    if (error?.code === "P2002") return false
    throw error
  }
  // Opportunistic cleanup of expired rows; never blocks the caller.
  (prisma as any).reauthTokenUse
    ?.deleteMany?.({ where: { expiresAt: { lt: new Date() } } })
    ?.catch?.((error: any) => console.warn("[reauth] could not prune expired token uses:", error))
  return true
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
    if (jti) {
      const consumed = await consumeReauthToken(jti);
      if (!consumed) {
        return { valid: false, reason: "Token has already been used (reuse rejected)" };
      }
    }

    return { valid: true, jti };
  } catch (err: any) {
    return { valid: false, reason: err?.message || "Token verification failed" };
  }
}
