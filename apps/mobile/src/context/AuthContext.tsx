import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { ApiResponse, ViewerProfileDto } from "@aspirantbook/shared";
import { Storage } from "../lib/storage";
import { api } from "../lib/api";
import { clearPersistedQueryCache } from "../lib/query-persistence";

export interface UserProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  role?: string;
  hasActivePass?: boolean;
  avatarUrl?: string | null;
}

export interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasActivePass: boolean;
  isLoading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, userProfile: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /**
   * The viewer response of the refresh that AuthProvider already started.
   * BootstrapScreen uses it so cold start asks /me once instead of twice.
   * Resolves null when no refresh has been started (caller must fall back).
   */
  awaitViewerProfile: () => Promise<ApiResponse<ViewerProfileDto> | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
  skipStorage = false,
  queryClient,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
  skipStorage?: boolean;
  queryClient?: import("@tanstack/react-query").QueryClient;
}) {
  const mountedRef = React.useRef(true);
  // Monotonic nonce: only the newest refreshProfile call may write state. An
  // in-flight api.getMe() from an older call (or a previous mount) must never
  // overwrite the current user after a fast unmount/remount cycle.
  const refreshRequestRef = React.useRef(0);
  // F3: cold start used to ask for the viewer twice (BootstrapScreen for the
  // initial redirect, AuthProvider to hydrate the context). This deferred is
  // resolved with the provider's single in-flight /me promise so the bootstrap
  // screen can await the very same response instead of issuing its own request.
  const viewerDeferredRef = React.useRef<{
    promise: Promise<Promise<ApiResponse<ViewerProfileDto>> | null>;
    resolve: (value: Promise<ApiResponse<ViewerProfileDto>> | null) => void;
  } | null>(null);
  if (!viewerDeferredRef.current) {
    let resolveDeferred!: (value: Promise<ApiResponse<ViewerProfileDto>> | null) => void;
    const promise = new Promise<Promise<ApiResponse<ViewerProfileDto>> | null>((resolve) => {
      resolveDeferred = resolve;
    });
    viewerDeferredRef.current = { promise, resolve: resolveDeferred };
  }
  const resolveViewer = useCallback((value: Promise<ApiResponse<ViewerProfileDto>> | null) => {
    // Promise resolvers ignore repeat calls, so this is idempotent.
    viewerDeferredRef.current?.resolve(value);
  }, []);
  const [user, setUser] = useState<UserProfile | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(!skipStorage);

  const refreshProfile = useCallback(async () => {
    if (skipStorage) {
      resolveViewer(null);
      return;
    }
    const requestId = ++refreshRequestRef.current;
    const isCurrent = () => mountedRef.current && requestId === refreshRequestRef.current;

    try {
      const token = await Storage.getAccessToken();
      if (!isCurrent()) return;
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Fetch fresh viewer profile via API. The request starts here (before the
      // cached-user read) so the bootstrap screen waits for exactly the same
      // round trip it used to wait for, and shares it instead of duplicating it.
      const viewerPromise = api.getMe();
      resolveViewer(viewerPromise);

      // Check stored user cache first
      const cached = await Storage.getUser();
      if (!isCurrent()) return;
      if (cached) {
        setUser(cached);
      }

      const res = await viewerPromise;
      if (!isCurrent()) return;
      if (res.ok && res.data) {
        const u = res.data;
        const profile: UserProfile = {
          id: u.id,
          name: u.name,
          email: u.email,
          phoneNumber: (u as any).phoneNumber || null,
          role: u.role,
          hasActivePass: Boolean((u as any).hasActivePass || (u as any).subscription?.status === "active"),
          avatarUrl: (u as any).avatarUrl || null,
        };
        setUser(profile);
        await Storage.setUser(profile);
      } else if (res.error?.code === "UNAUTHORIZED") {
        await Storage.clearAllAuthTokens();
        if (!isCurrent()) return;
        setUser(null);
      }
    } catch {
      // Offline fallback: keep cached user if present
      if (!isCurrent()) return;
      const cached = await Storage.getUser();
      if (cached && isCurrent()) setUser(cached);
    } finally {
      // No-op when the caller already received the shared /me promise.
      resolveViewer(null);
      if (isCurrent()) setIsLoading(false);
    }
  }, [skipStorage, resolveViewer]);

  const awaitViewerProfile = useCallback(async () => {
    const viewerPromise = await viewerDeferredRef.current!.promise;
    return viewerPromise ? await viewerPromise : null;
  }, []);

  useEffect(() => {
    if (skipStorage) return;
    mountedRef.current = true;
    void refreshProfile();
    return () => {
      mountedRef.current = false;
      // Invalidate any in-flight refresh so it cannot write after unmount.
      refreshRequestRef.current += 1;
      // Release any bootstrap waiter that is still blocked on this provider.
      resolveViewer(null);
    };
  }, [refreshProfile, skipStorage, resolveViewer]);

  const login = useCallback(
    async (tokens: { accessToken: string; refreshToken: string }, userProfile: UserProfile) => {
      await Storage.setAccessToken(tokens.accessToken);
      await Storage.setRefreshToken(tokens.refreshToken);
      await Storage.setUser(userProfile);
      setUser(userProfile);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = (await Storage.getRefreshToken()) || "";
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    } catch {
      // Best effort network call
    } finally {
      await Storage.clearAllAuthTokens();
      await clearPersistedQueryCache(queryClient);
      setUser(null);
    }
  }, [queryClient]);

  const hasActivePass = Boolean(user?.hasActivePass);
  const isAuthenticated = Boolean(user && user.id);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      hasActivePass,
      isLoading,
      login,
      logout,
      refreshProfile,
      awaitViewerProfile,
    }),
    [user, isAuthenticated, hasActivePass, isLoading, login, logout, refreshProfile, awaitViewerProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      hasActivePass: false,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
      refreshProfile: async () => {},
      awaitViewerProfile: async () => null,
    };
  }
  return context;
}
