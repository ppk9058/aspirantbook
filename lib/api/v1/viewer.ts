import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "./tokens";

export interface Viewer {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: string;
  isGuest: boolean;
  sessionId?: string | null;
  authMethod: "bearer" | "cookie" | "guest";
}

/**
 * Kept for API compatibility with existing callers.
 *
 * Viewer identity is deliberately NOT cached in-process: a revoked device session
 * must stop working immediately on every serverless instance. Each request
 * re-validates the session against the database.
 */
export function invalidateViewerCache(_sessionIdOrUserId: string) {
  // No-op: there is no cache to invalidate.
}

/**
 * Central authentication resolver for API v1.
 * Resolves viewer identity from Bearer JWT access token or NextAuth cookie session.
 * Fully supports public/guest endpoints when unauthenticated.
 */
export async function getViewer(req: NextRequest): Promise<Viewer> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

  // 1. Check Bearer token
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload?.sub) {
        // Query database on every request so a revoked session is rejected immediately.
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            sessionVersion: true,
            deviceSessions: payload.sessionId
              ? {
                  where: {
                    id: payload.sessionId,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                  },
                  select: { id: true },
                }
              : false,
          },
        });

        if (
          user &&
          user.isActive &&
          user.sessionVersion === payload.sessionVersion &&
          (!payload.sessionId || (Array.isArray(user.deviceSessions) && user.deviceSessions.length > 0))
        ) {
          const viewer: Viewer = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isGuest: false,
            sessionId: payload.sessionId,
            authMethod: "bearer",
          };

          return viewer;
        }
      }
    }
  }

  // 2. Fall back to NextAuth cookie session (for browser callers)
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        userId: session.user.id,
        email: session.user.email || null,
        name: session.user.name || null,
        role: (session.user as any)?.role || "STUDENT",
        isGuest: false,
        authMethod: "cookie",
      };
    }
  } catch (err) {
    // If NextAuth session check fails, fall through to guest
  }

  // 3. Unauthenticated guest
  return {
    userId: null,
    email: null,
    name: null,
    role: "GUEST",
    isGuest: true,
    authMethod: "guest",
  };
}
