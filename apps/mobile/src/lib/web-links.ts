/**
 * Centralized Web Links & External URL Helper
 * Derives the web origin dynamically from EXPO_PUBLIC_WEB_URL or EXPO_PUBLIC_API_URL,
 * with standard UTM tracking (?utm_source=mobile_app&utm_campaign=...).
 * When origin is not configured in environment, returns null (never a hardcoded domain).
 */

export const DEFAULT_WEB_ORIGIN: string | null = null;

/**
 * Resolves the base web origin (protocol + host [+ port]).
 * 1. Checks EXPO_PUBLIC_WEB_URL
 * 2. If not set, strips `/api/v1` from EXPO_PUBLIC_API_URL
 * 3. Falls back to null if unconfigured
 */
export function getWebOrigin(): string | null {
  const envWeb = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (envWeb) {
    return envWeb.replace(/\/+$/, "");
  }

  const envApi = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envApi) {
    try {
      const cleaned = envApi.replace(/\/+$/, "").replace(/\/api\/v1\/?$/, "");
      if (cleaned) return cleaned;
    } catch {
      // fallback
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
): Promise<{ success: boolean; error?: string }> {
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
