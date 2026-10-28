import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  createAccessToken,
  generateOpaqueRefreshToken,
  hashRefreshToken,
} from "@/lib/api/v1/tokens";
import { invalidateViewerCache } from "@/lib/api/v1/viewer";
import { logAuditEvent } from "@/lib/api/v1/audit";
import {
  checkLoginLockout,
  clearLoginLockout,
  recordFailedLoginAttempt,
} from "@/lib/auth/rate-limiter";
import {
  LoginRequest,
  RegisterRequest,
  LoginResponseDto,
  DeviceSessionDto,
} from "@aspirantbook/shared";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_EXPIRES_IN_SECS = 15 * 60; // 15 minutes
const BCRYPT_COST = 12; // same cost as the web auth path
const DEVICE_SESSION_RETENTION_DAYS = 30;
const EXPIRED_SESSION_GRACE_DAYS = 7;

/**
 * A13: one uniform failure message for every rejected login (unknown email,
 * inactive account, wrong password). The caller cannot learn whether an
 * account exists or is disabled.
 */
export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
export const LOGIN_LOCKED_MESSAGE =
  "Too many failed login attempts. Please try again later.";

function invalidCredentials(): Error {
  return new Error(`UNAUTHORIZED: ${INVALID_CREDENTIALS_MESSAGE}`);
}

/**
 * A13: retention pruning for device sessions. Rotation updates a row in place,
 * so the only rows that accumulate are old devices, revoked families and
 * sessions that already expired. Never touches a live, unexpired session.
 */
export async function pruneDeviceSessions(now: Date = new Date()): Promise<number> {
  const revokedCutoff = new Date(
    now.getTime() - DEVICE_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const expiredCutoff = new Date(
    now.getTime() - EXPIRED_SESSION_GRACE_DAYS * 24 * 60 * 60 * 1000
  );

  const result = await prisma.deviceSession.deleteMany({
    where: {
      OR: [
        { revokedAt: { not: null, lt: revokedCutoff } },
        { revokedAt: null, expiresAt: { lt: expiredCutoff } },
      ],
    },
  });
  return result.count;
}

/** Fire-and-forget pruning: a failure is logged, never swallowed or fatal. */
function scheduleDeviceSessionPrune(): void {
  void pruneDeviceSessions().catch((error) => {
    console.warn("[auth] device session pruning failed:", error);
  });
}

export async function loginWithEmailPassword(
  input: LoginRequest,
  ip?: string | null,
  userAgent?: string | null
): Promise<LoginResponseDto> {
  const email = input.email.trim().toLowerCase();
  const clientIp = ip || "";

  // A13: per-account lockout parity with the web credentials provider.
  const lockout = await checkLoginLockout(email, clientIp);
  if (lockout.isLocked) {
    throw new Error(`TOO_MANY_REQUESTS: ${LOGIN_LOCKED_MESSAGE}`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      image: true,
      phoneNumber: true,
      selectedGoal: true,
      emailVerified: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!user || !user.password) {
    // Count the failure too, so an unknown email is throttled exactly like a
    // real one (no enumeration through lockout behaviour).
    const status = await recordFailedLoginAttempt(email, clientIp);
    if (status.isLocked) {
      throw new Error(`TOO_MANY_REQUESTS: ${LOGIN_LOCKED_MESSAGE}`);
    }
    throw invalidCredentials();
  }

  // Always hash-compare first so an inactive account costs the same as an
  // active one and cannot be distinguished by timings.
  const isValidPassword = await bcrypt.compare(input.password, user.password);
  if (!isValidPassword) {
    const status = await recordFailedLoginAttempt(email, clientIp);
    if (status.isLocked) {
      throw new Error(`TOO_MANY_REQUESTS: ${LOGIN_LOCKED_MESSAGE}`);
    }
    throw invalidCredentials();
  }

  // Deactivated accounts are refused with the same message as a bad password.
  if (!user.isActive) {
    throw invalidCredentials();
  }

  // Successful login clears the failure counter for this account + IP.
  await clearLoginLockout(email, clientIp);

  // Create session
  const familyId = crypto.randomUUID();
  const rawRefreshToken = generateOpaqueRefreshToken();
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const session = await prisma.deviceSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      familyId,
      deviceName: input.deviceName || null,
      platform: input.platform || "android",
      appVersion: input.appVersion || null,
      ip: ip || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  });

  scheduleDeviceSessionPrune();

  const accessToken = await createAccessToken({
    sub: user.id,
    email: user.email || "",
    role: user.role,
    sessionVersion: user.sessionVersion,
    familyId,
    sessionId: session.id,
  });

  await logAuditEvent({
    actorId: user.id,
    action: "USER_LOGIN_MOBILE",
    targetId: session.id,
    ip,
    details: { platform: input.platform, deviceName: input.deviceName },
  });

  return {
    tokens: {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECS,
      tokenType: "Bearer",
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      phoneNumber: user.phoneNumber,
      goal: user.selectedGoal,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    },
  };
}

export async function registerUser(
  input: RegisterRequest,
  ip?: string | null,
  userAgent?: string | null
): Promise<LoginResponseDto> {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new Error("CONFLICT: An account with this email address already exists");
  }

  const hashedPassword = await bcrypt.hash(input.password, BCRYPT_COST);
  const familyId = crypto.randomUUID();
  const rawRefreshToken = generateOpaqueRefreshToken();
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        password: hashedPassword,
        phoneNumber: input.phoneNumber || null,
        selectedGoal: input.selectedGoal || null,
        role: "FREE",
        isActive: true,
        sessionVersion: 1,
      },
    });

    const session = await tx.deviceSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        familyId,
        deviceName: input.deviceName || null,
        platform: input.platform || "android",
        appVersion: input.appVersion || null,
        ip: ip || null,
        userAgent: userAgent || null,
        expiresAt,
      },
    });

    return { user, session };
  });

  const accessToken = await createAccessToken({
    sub: newUser.user.id,
    email: newUser.user.email || "",
    role: newUser.user.role,
    sessionVersion: 1,
    familyId,
    sessionId: newUser.session.id,
  });

  await logAuditEvent({
    actorId: newUser.user.id,
    action: "USER_REGISTER_MOBILE",
    targetId: newUser.session.id,
    ip,
    details: { platform: input.platform, consentAccepted: true },
  });

  return {
    tokens: {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECS,
      tokenType: "Bearer",
    },
    user: {
      id: newUser.user.id,
      name: newUser.user.name,
      email: newUser.user.email,
      role: newUser.user.role,
      image: null,
      phoneNumber: newUser.user.phoneNumber,
      goal: newUser.user.selectedGoal,
      emailVerified: null,
      isActive: newUser.user.isActive,
    },
  };
}

async function revokeRefreshFamily(params: {
  userId: string;
  familyId: string;
  sessionId: string;
  ip?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  await prisma.$transaction([
    prisma.deviceSession.updateMany({
      where: { familyId: params.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: { sessionVersion: { increment: 1 } },
    }),
  ]);

  invalidateViewerCache(params.userId);

  await logAuditEvent({
    actorId: params.userId,
    action: "SECURITY_REFRESH_TOKEN_REUSE_DETECTED",
    targetId: params.familyId,
    ip: params.ip ?? null,
    details: { compromisedSessionId: params.sessionId, ...(params.details || {}) },
  });
}

function refreshReuseError(): Error {
  return new Error(
    "UNAUTHORIZED: Token reuse detected. All sessions revoked for your security. Please log in again."
  );
}

export async function refreshSession(
  refreshToken: string,
  ip?: string | null,
  userAgent?: string | null
): Promise<LoginResponseDto> {
  const tokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.deviceSession.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          phoneNumber: true,
          selectedGoal: true,
          emailVerified: true,
          isActive: true,
          sessionVersion: true,
        },
      },
    },
  });

  if (!session) {
    // A13: rotation updates the row in place, so a replay of the immediately
    // previous token is detected through previousRefreshTokenHash instead of
    // through a spent sibling row.
    const previous = await prisma.deviceSession.findFirst({
      where: { previousRefreshTokenHash: tokenHash, revokedAt: null },
      select: { id: true, userId: true, familyId: true },
    });

    if (previous) {
      console.warn(
        `[SECURITY ALERT] Refresh token reuse detected for family ${previous.familyId}! Revoking family.`
      );
      await revokeRefreshFamily({
        userId: previous.userId,
        familyId: previous.familyId,
        sessionId: previous.id,
        ip,
        details: { previousTokenReplay: true },
      });
      throw refreshReuseError();
    }

    throw new Error("UNAUTHORIZED: Invalid or expired refresh token");
  }

  // REUSE DETECTION: If this refresh token was already revoked or replaced,
  // someone is replaying an old token. Immediately revoke the entire token family!
  if (session.revokedAt !== null || session.replacedById !== null) {
    console.warn(`[SECURITY ALERT] Refresh token reuse detected for family ${session.familyId}! Revoking family.`);

    await revokeRefreshFamily({
      userId: session.userId,
      familyId: session.familyId,
      sessionId: session.id,
      ip,
    });

    throw refreshReuseError();
  }

  // Check expiry & user status
  if (session.expiresAt < new Date()) {
    throw new Error("UNAUTHORIZED: Refresh token has expired. Please log in again.");
  }

  if (!session.user.isActive) {
    throw new Error("FORBIDDEN: Account is suspended or inactive");
  }

  // ROTATION (A13): the row is updated in place instead of creating a new
  // DeviceSession per refresh. The conditional updateMany is still the atomic
  // guard: exactly one concurrent refresh can match the old token hash.
  const newRawRefreshToken = generateOpaqueRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  try {
    const claim = await prisma.deviceSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: tokenHash,
        revokedAt: null,
        replacedById: null,
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        previousRefreshTokenHash: tokenHash,
        lastUsedAt: new Date(),
        expiresAt: newExpiresAt,
        ip: ip || session.ip,
        userAgent: userAgent || session.userAgent,
      },
    });

    if (claim.count !== 1) {
      const race = new Error("REFRESH_REUSE_RACE");
      (race as any).code = "REFRESH_REUSE_RACE";
      throw race;
    }
  } catch (err: any) {
    if (err?.code === "REFRESH_REUSE_RACE" || err?.message === "REFRESH_REUSE_RACE") {
      // A concurrent caller already spent this token. Treat it exactly like
      // reuse: revoke the whole family so a stolen token cannot be replayed.
      console.warn(`[SECURITY ALERT] Concurrent refresh reuse detected for family ${session.familyId}! Revoking family.`);

      await revokeRefreshFamily({
        userId: session.userId,
        familyId: session.familyId,
        sessionId: session.id,
        ip,
        details: { concurrent: true },
      });

      throw refreshReuseError();
    }
    throw err;
  }

  scheduleDeviceSessionPrune();

  invalidateViewerCache(session.userId);

  const accessToken = await createAccessToken({
    sub: session.user.id,
    email: session.user.email || "",
    role: session.user.role,
    sessionVersion: session.user.sessionVersion,
    familyId: session.familyId,
    sessionId: session.id,
  });

  return {
    tokens: {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECS,
      tokenType: "Bearer",
    },
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      image: session.user.image,
      phoneNumber: session.user.phoneNumber,
      goal: session.user.selectedGoal,
      emailVerified: session.user.emailVerified,
      isActive: session.user.isActive,
    },
  };
}

export async function logoutSession(refreshToken: string): Promise<boolean> {
  const tokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.deviceSession.findUnique({
    where: { refreshTokenHash: tokenHash },
    select: { id: true, userId: true },
  });

  if (session) {
    await prisma.deviceSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    invalidateViewerCache(session.id);
  }

  return true;
}

export async function logoutAllSessions(userId: string): Promise<boolean> {
  await prisma.$transaction([
    prisma.deviceSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    }),
  ]);

  invalidateViewerCache(userId);

  await logAuditEvent({
    actorId: userId,
    action: "USER_LOGOUT_ALL_DEVICES",
    targetId: userId,
  });

  return true;
}

export async function listDeviceSessions(
  userId: string,
  currentSessionId?: string | null
): Promise<DeviceSessionDto[]> {
  const sessions = await prisma.deviceSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      deviceName: true,
      platform: true,
      appVersion: true,
      ip: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    deviceName: s.deviceName,
    platform: s.platform,
    appVersion: s.appVersion,
    ip: s.ip ? s.ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, "$1.$2.*.*") : null,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
    isCurrent: currentSessionId ? s.id === currentSessionId : false,
  }));
}

export async function revokeDeviceSession(userId: string, sessionId: string): Promise<boolean> {
  const res = await prisma.deviceSession.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (res.count > 0) {
    invalidateViewerCache(sessionId);
    return true;
  }
  return false;
}
