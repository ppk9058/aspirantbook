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

interface CachedViewer {
  viewer: Viewer;
  expiresAt: number;
}

// In-process cache for authenticated sessions (max 10s TTL)
const viewerCache = new Map<string, CachedViewer>();

/**
 * Invalidates cache entry for a session or user.
 */
export function invalidateViewerCache(sessionIdOrUserId: string) {
  viewerCache.delete(sessionIdOrUserId);
  // Also scan and purge any matching entries
  for (const [key, val] of viewerCache.entries()) {
    if (val.viewer.userId === sessionIdOrUserId || val.viewer.sessionId === sessionIdOrUserId) {
      viewerCache.delete(key);
    }
  }
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
        // Check in-process cache
        const cacheKey = `${payload.sessionId}:${token.slice(-12)}`;
        const cached = viewerCache.get(cacheKey);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
          return cached.viewer;
        }

        // Query database (Single indexed lookup)
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

          // Cache for up to 10 seconds
          viewerCache.set(cacheKey, {
            viewer,
            expiresAt: now + 10_000,
          });

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
