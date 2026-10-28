export type ApiUrlSource = "env" | "dotenv" | "derived" | "unconfigured";

export interface ResolvedApiUrl {
  baseUrl: string;
  source: ApiUrlSource;
  error?: string;
}

function getExpoConstants(): any {
  try {
    const c = require("expo-constants");
    return c?.default || c;
  } catch {
    return null;
  }
}

export function extractHost(uri?: string | null): string | null {
  if (!uri || typeof uri !== "string") return null;
  // Strip protocol if present (e.g. exp://, http://, https://)
  const noProto = uri.replace(/^[a-zA-Z0-9+-.]+:\/\//, "");
  // Strip path, query, hash
  const hostPart = noProto.split("/")[0].split("?")[0].split("#")[0];
  // Strip port
  const host = hostPart.split(":")[0]?.trim();
  return host || null;
}

/** Normalizes a base URL to a server origin (no trailing slash, no /api/v1). */
export function normalizeApiBaseUrl(url?: string | null): string {
  return (url || "").trim().replace(/\/+$/, "").replace(/\/api\/v1\/?$/, "");
}

/**
 * Re-targets an absolute request URL built from a stale base onto the active
 * base. The API client is constructed with the base resolved at module load,
 * but the Metro-derived host can change later (e.g. Wi-Fi switch). Without
 * this, requests keep hitting the old IP even though the guard resolved the
 * new one.
 */
export function rewriteApiRequestUrl(
  requestUrl: string,
  activeBaseUrl: string,
  staleBaseUrl: string
): string {
  if (!requestUrl) return requestUrl;
  const active = normalizeApiBaseUrl(activeBaseUrl);
  if (!active) return requestUrl;

  const stale = normalizeApiBaseUrl(staleBaseUrl);
  const matchesStale =
    Boolean(stale) &&
    (requestUrl === stale ||
      requestUrl.startsWith(`${stale}/`) ||
      requestUrl.startsWith(`${stale}?`));
  if (matchesStale) {
    return `${active}${requestUrl.slice(stale.length)}`;
  }

  // Relative path (client built before any base was configured): attach the
  // freshly resolved host instead of sending a path-only request.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(requestUrl)) {
    return `${active}${requestUrl.startsWith("/") ? requestUrl : `/${requestUrl}`}`;
  }

  return requestUrl;
}

/**
 * Resolves the API Base URL with strict precedence:
 * 1. Explicit Shell Env / process.env.EXPO_PUBLIC_API_URL (source: "env")
 * 2. Dotenv configured URL (source: "dotenv")
 * 3. In __DEV__ only: Dev-derived host from Metro bundler hostUri / linkingUri (source: "derived")
 * 4. Production (__DEV__ false) or unresolvable: explicit error / empty string (source: "unconfigured")
 */
export function resolveApiBaseUrl(options?: {
  envUrl?: string;
  envPort?: string;
  isDev?: boolean;
  constants?: any;
  sourceOverride?: ApiUrlSource;
}): ResolvedApiUrl {
  const isDev =
    options?.isDev !== undefined
      ? options.isDev
      : typeof __DEV__ !== "undefined"
      ? Boolean(__DEV__)
      : process.env.NODE_ENV !== "production";

  const rawEnv = options?.envUrl !== undefined ? options.envUrl : process.env.EXPO_PUBLIC_API_URL;
  const trimmedEnv = rawEnv?.trim();

  // 1. Explicit environment variable (.env.local or shell export)
  if (trimmedEnv) {
    const cleaned = normalizeApiBaseUrl(trimmedEnv);
    const source: ApiUrlSource =
      options?.sourceOverride ||
      (process.env.EXPO_PUBLIC_API_URL_SOURCE as ApiUrlSource) ||
      "env";
    return {
      baseUrl: cleaned,
      source: source === "dotenv" ? "dotenv" : "env",
    };
  }

  // 2. Dev-only dynamic host derivation from Metro
  if (isDev) {
    const consts = options?.constants !== undefined ? options.constants : getExpoConstants();
    const hostUri = consts?.expoConfig?.hostUri;
    const linkingUri = consts?.linkingUri;
    const debuggerHost = consts?.manifest2?.extra?.expoGo?.debuggerHost;

    const host =
      extractHost(hostUri) ||
      extractHost(linkingUri) ||
      extractHost(debuggerHost);

    if (host) {
      const port = options?.envPort || process.env.EXPO_PUBLIC_API_PORT || "3045";
      return {
        baseUrl: `http://${host}:${port}`,
        source: "derived",
      };
    }
  }

  // 3. Explicit error state (Unconfigured)
  return {
    baseUrl: "",
    source: "unconfigured",
    error: "API endpoint is not configured. Please set EXPO_PUBLIC_API_URL.",
  };
}
