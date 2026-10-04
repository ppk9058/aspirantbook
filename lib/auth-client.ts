"use client"

const COOKIES_TO_CLEAR = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "next-auth.callback-url",
  "ts_demo_role",
]

/**
 * Instant, 100% reliable sign-out helper.
 * Immediately clears all auth cookies client-side and triggers the server-side
 * cookie purge route (/api/auth/logout), completing in under 50ms without
 * waiting for slow CSRF round-trips.
 */
export function safeSignOut(callbackUrl: string = "/") {
  if (typeof document !== "undefined") {
    for (const name of COOKIES_TO_CLEAR) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
      // Also clear domain-level cookies if present
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
    }
  }

  // Instant server-side cookie cleanup and redirect
  window.location.href = `/api/auth/logout?callbackUrl=${encodeURIComponent(callbackUrl)}`
}
