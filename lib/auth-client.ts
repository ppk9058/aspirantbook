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
 * Sign-out helper.
 * Clears all auth cookies client-side, POSTs to the server-side cookie purge
 * route (/api/auth/logout), then hard-navigates to "/" whether that request
 * succeeds or fails so the UI cannot keep a stale signed-in shell.
 */
export function safeSignOut(callbackUrl: string = "/") {
  if (typeof document !== "undefined") {
    for (const name of COOKIES_TO_CLEAR) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
      // Also clear domain-level cookies if present
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
    }
  }

  if (typeof window === "undefined") return

  // Always finish with a hard navigation to a fixed same-origin path. This
  // discards any cached RSC/router state so the header cannot keep showing the
  // signed-in UI. The destination is deliberately NOT derived from callbackUrl
  // (or any query param), so sign-out can never become an open redirect.
  const hardNavigateHome = () => window.location.assign("/")

  // Follow the logout route's redirect so its Set-Cookie headers are applied
  // before we navigate. Any response (or network failure) still ends in the
  // hard navigation below, so the UI can never be left showing a stale session.
  void fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    redirect: "follow",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).then(hardNavigateHome, hardNavigateHome)

  // Keep the parameter in the public signature for existing callers, but it is
  // intentionally ignored: the post-logout target is always "/".
  void callbackUrl
}

