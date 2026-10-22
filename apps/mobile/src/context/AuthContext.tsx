import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Storage } from "../lib/storage";
import { api } from "../lib/api";

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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
  skipStorage = false,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
  skipStorage?: boolean;
}) {
  const mountedRef = React.useRef(true);
  const [user, setUser] = useState<UserProfile | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(!skipStorage);

  const refreshProfile = useCallback(async () => {
    if (skipStorage) return;
    try {
      const token = await Storage.getAccessToken();
      if (!token) {
        setUser(null);
        if (mountedRef.current) setIsLoading(false);
        return;
      }

      // Check stored user cache first
      const cached = await Storage.getUser();
      if (cached) {
        setUser(cached);
      }

      // Fetch fresh viewer profile via API
      const res = await api.getMe();
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
        setUser(null);
      }
    } catch {
      // Offline fallback: keep cached user if present
      const cached = await Storage.getUser();
      if (cached) setUser(cached);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipStorage) return;
    mountedRef.current = true;
    void refreshProfile();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshProfile]);

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
      setUser(null);
    }
  }, []);

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
    }),
    [user, isAuthenticated, hasActivePass, isLoading, login, logout, refreshProfile]
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
    };
  }
  return context;
}
