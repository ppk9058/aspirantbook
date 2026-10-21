/**
 * Centralized Web Links & External URL Helper
 * Derives the web origin from EXPO_PUBLIC_WEB_URL or EXPO_PUBLIC_API_URL,
 * with standard UTM tracking (?utm_source=mobile_app&utm_campaign=...).
 */

export const DEFAULT_WEB_ORIGIN = "https://trillionskill.com";

/**
 * Resolves the base web origin (protocol + host [+ port]).
 * 1. Checks EXPO_PUBLIC_WEB_URL
 * 2. If not set, strips `/api/v1` from EXPO_PUBLIC_API_URL
 * 3. Falls back to DEFAULT_WEB_ORIGIN
 */
export function getWebOrigin(): string {
  const envWeb = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (envWeb) {
    return envWeb.replace(/\/+$/, "");
  }

  const envApi = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envApi) {
    try {
      // Strip trailing slashes and /api/v1
      const cleaned = envApi.replace(/\/+$/, "").replace(/\/api\/v1\/?$/, "");
      return cleaned;
    } catch {
      // fallback
    }
  }

  return DEFAULT_WEB_ORIGIN;
}

/**
 * Builds an absolute web URL with utm_source=mobile_app and optional utm_campaign.
 */
export function buildWebUrl(path: string, utmCampaign?: string): string {
  const origin = getWebOrigin();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  const hasQueryParams = cleanPath.includes("?");
  const separator = hasQueryParams ? "&" : "?";

  let result = `${origin}${cleanPath}${separator}utm_source=mobile_app`;
  if (utmCampaign) {
    result += `&utm_campaign=${encodeURIComponent(utmCampaign)}`;
  }

  return result;
}
