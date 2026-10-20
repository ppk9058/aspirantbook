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
  LoginRequest,
  RegisterRequest,
  LoginResponseDto,
  DeviceSessionDto,
} from "@aspirantbook/shared";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_EXPIRES_IN_SECS = 15 * 60; // 15 minutes

export async function loginWithEmailPassword(
  input: LoginRequest,
  ip?: string | null,
  userAgent?: string | null
): Promise<LoginResponseDto> {
  const email = input.email.trim().toLowerCase();

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
    throw new Error("UNAUTHORIZED: Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("FORBIDDEN: Your account has been suspended or deactivated");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.password);
  if (!isValidPassword) {
    throw new Error("UNAUTHORIZED: Invalid email or password");
  }

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

  const hashedPassword = await bcrypt.hash(input.password, 10);
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
    throw new Error("UNAUTHORIZED: Invalid or expired refresh token");
  }

  // REUSE DETECTION: If this refresh token was already revoked or replaced,
  // someone is replaying an old token. Immediately revoke the entire token family!
  if (session.revokedAt !== null || session.replacedById !== null) {
    console.warn(`[SECURITY ALERT] Refresh token reuse detected for family ${session.familyId}! Revoking family.`);

    await prisma.$transaction([
      prisma.deviceSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: session.userId },
        data: { sessionVersion: { increment: 1 } },
      }),
    ]);

    invalidateViewerCache(session.userId);

    await logAuditEvent({
      actorId: session.userId,
      action: "SECURITY_REFRESH_TOKEN_REUSE_DETECTED",
      targetId: session.familyId,
      ip,
      details: { compromisedSessionId: session.id },
    });

    throw new Error("UNAUTHORIZED: Token reuse detected. All sessions revoked for your security. Please log in again.");
  }

  // Check expiry & user status
  if (session.expiresAt < new Date()) {
    throw new Error("UNAUTHORIZED: Refresh token has expired. Please log in again.");
  }

  if (!session.user.isActive) {
    throw new Error("FORBIDDEN: Account is suspended or inactive");
  }

  // ROTATION: Create new refresh token and retire current one atomically
  const newRawRefreshToken = generateOpaqueRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const updatedSession = await prisma.$transaction(async (tx) => {
    const created = await tx.deviceSession.create({
      data: {
        userId: session.userId,
        refreshTokenHash: newRefreshTokenHash,
        familyId: session.familyId,
        deviceName: session.deviceName,
        platform: session.platform,
        appVersion: session.appVersion,
        ip: ip || session.ip,
        userAgent: userAgent || session.userAgent,
        expiresAt: newExpiresAt,
      },
    });

    await tx.deviceSession.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedById: created.id,
        lastUsedAt: new Date(),
      },
    });

    return created;
  });

  invalidateViewerCache(session.id);

  const accessToken = await createAccessToken({
    sub: session.user.id,
    email: session.user.email || "",
    role: session.user.role,
    sessionVersion: session.user.sessionVersion,
    familyId: session.familyId,
    sessionId: updatedSession.id,
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
