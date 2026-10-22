import { createApiClient } from "@aspirantbook/shared";
import { Storage } from "./storage";

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

// Dev logging of resolved base URL
if (typeof __DEV__ !== "undefined" && __DEV__) {
  console.log(`[API] Resolved Base URL: ${envApiUrl || "UNCONFIGURED"}`);
}

const rawApiUrl = envApiUrl ? envApiUrl.trim() : "";
// Canonical normalization: always server origin without trailing slash or duplicate /api/v1
export const API_BASE_URL = rawApiUrl ? rawApiUrl.replace(/\/$/, "").replace(/\/api\/v1\/?$/, "") : "";

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(callback: () => void) {
  unauthorizedListeners.add(callback);
  return () => unauthorizedListeners.delete(callback);
}

function notifyUnauthorized() {
  Storage.clearAllAuthTokens();
  unauthorizedListeners.forEach((cb) => cb());
}

/**
 * Single-flight token refresh mutex.
 * Guarantees exactly one network call refreshes the rotating token.
 */
async function refreshAccessTokenSingleFlight(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await Storage.getRefreshToken();
      if (!refreshToken) {
        notifyUnauthorized();
        return null;
      }

      if (!API_BASE_URL) {
        notifyUnauthorized();
        return null;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.data?.tokens) {
        // Reuse detection or expired refresh token
        notifyUnauthorized();
        return null;
      }

      const { accessToken, refreshToken: newRefreshToken } = json.data.tokens;
      await Storage.setAccessToken(accessToken);
      await Storage.setRefreshToken(newRefreshToken);

      return accessToken as string;
    } catch (err) {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: async () => {
    return Storage.getAccessToken();
  },
  onUnauthorized: async () => {
    await refreshAccessTokenSingleFlight();
  },
  fetchFn: async (url, init = {}) => {
    if (!API_BASE_URL) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "API_UNCONFIGURED",
            message: "API endpoint is not configured. Please set EXPO_PUBLIC_API_URL.",
          },
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // Attempt original request
    let response = await fetch(url, init);

    // If 401 Unauthorized, perform single-flight refresh and retry once
    const urlStr = typeof url === "string" ? url : (url as any).url || "";
    if (response.status === 401 && !urlStr.includes("/api/v1/auth/")) {
      const newAccessToken = await refreshAccessTokenSingleFlight();
      if (newAccessToken) {
        const retryHeaders = new Headers(init.headers || {});
        retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
        response = await fetch(url, { ...init, headers: retryHeaders });
      }
    }

    return response;
  },
});

export const apiClient = {
  ...api,
  baseUrl: API_BASE_URL,
  getAccessToken: async () => Storage.getAccessToken(),
};
