/**
 * Centralized Web Links & External URL Helper
 * Derives the web origin dynamically from EXPO_PUBLIC_WEB_URL, or in __DEV__ from EXPO_PUBLIC_API_URL,
 * with standard UTM tracking (?utm_source=mobile_app&utm_campaign=...).
 * When origin is not configured in environment, returns null (never a hardcoded domain).
 */

import { resolveApiBaseUrl } from "./api-url";

export const DEFAULT_WEB_ORIGIN: string | null = null;

/** Neutral user-facing message when external website link is unconfigured */
export const WEBLINK_UNAVAILABLE_NOTE = "Website link not available yet";

/**
 * Resolves the base web origin (protocol + host [+ port]).
 * 1. Checks EXPO_PUBLIC_WEB_URL
 * 2. If not set, checks EXPO_PUBLIC_API_URL or dev-derived Metro host ONLY when __DEV__
 * 3. Falls back to null if unconfigured
 */
export function getWebOrigin(): string | null {
  const envWeb = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (envWeb) {
    return envWeb.replace(/\/+$/, "");
  }

  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
  if (isDev) {
    const envApi = process.env.EXPO_PUBLIC_API_URL?.trim() || resolveApiBaseUrl().baseUrl;
    if (envApi) {
      try {
        const cleaned = envApi.replace(/\/+$/, "").replace(/\/api\/v1\/?$/, "");
        if (cleaned) return cleaned;
      } catch {
        // fallback
      }
    }
  }

  return DEFAULT_WEB_ORIGIN;
}

/**
 * Builds an absolute web URL with utm_source=mobile_app and optional utm_campaign.
 * Returns null if the web origin is not configured.
 */
export function buildWebUrl(path: string, utmCampaign?: string): string | null {
  const origin = getWebOrigin();
  if (!origin) return null;

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const hasQueryParams = cleanPath.includes("?");
  const separator = hasQueryParams ? "&" : "?";

  let result = `${origin}${cleanPath}${separator}utm_source=mobile_app`;
  if (utmCampaign) {
    result += `&utm_campaign=${encodeURIComponent(utmCampaign)}`;
  }

  return result;
}

/**
 * Opens a web URL or relative path in an in-app browser with proper UTM tagging.
 * Displays graceful error feedback if the web origin is not configured.
 */
export async function openWebUrl(
  pathOrUrl: string,
  utmCampaign?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  let finalUrl: string | null = null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    finalUrl = pathOrUrl;
  } else {
    finalUrl = buildWebUrl(pathOrUrl, utmCampaign);
  }

  if (!finalUrl) {
    return {
      success: false,
      error: "Web address not configured.",
      message: WEBLINK_UNAVAILABLE_NOTE,
    };
  }

  try {
    const WebBrowser = require("expo-web-browser") as typeof import("expo-web-browser");
    await WebBrowser.openBrowserAsync(finalUrl);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: (err as Error)?.message || "Failed to open web browser.",
    };
  }
}

export const openWebLink = openWebUrl;

/* ── Support (WhatsApp) ──────────────────────────────────────────────────
 * The web app replaced its floating "AI assistant" launcher with a direct
 * WhatsApp support link. The native app has no floating launcher, so the same
 * support channel lives in the account sheet that opens from the header on
 * every screen. One number, one URL builder, no duplicated literals.
 */
export const SUPPORT_WHATSAPP_NUMBER = "8340665934";
export const SUPPORT_WHATSAPP_E164 = `91${SUPPORT_WHATSAPP_NUMBER}`;
export const DEFAULT_SUPPORT_MESSAGE =
  "Hi aspirantBook team, I need help with my preparation.";

/** Builds the wa.me deep link (optionally with a pre-filled message). */
export function buildWhatsAppSupportUrl(
  message: string = DEFAULT_SUPPORT_MESSAGE
): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}
