export type ErrorCategory =
  | "CONNECTION_REFUSED"
  | "TIMEOUT"
  | "DNS_UNREACHABLE"
  | "HTTP_STATUS"
  | "INVALID_JSON"
  | "NOT_CONFIGURED"
  | "UNKNOWN";

export interface ClassifiedError {
  category: ErrorCategory;
  isNetwork: boolean;
  displayTitle: string;
  displayMessage: string;
  userMessage: string;
  devReason: string;
  baseUrl: string;
  statusCode?: number;
}

export const PRODUCTION_NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";

export function extractHostPort(url: string): string {
  try {
    const clean = url.replace(/^[a-zA-Z0-9+-.]+:\/\//, "");
    const hostPort = clean.split("/")[0].split("?")[0];
    return hostPort || url;
  } catch {
    return url;
  }
}

export function classifyError(
  error: unknown,
  baseUrl: string = "",
  isDev?: boolean
): ClassifiedError {
  const isDevMode =
    isDev !== undefined
      ? isDev
      : typeof __DEV__ !== "undefined"
      ? Boolean(__DEV__)
      : process.env.NODE_ENV !== "production";

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : (error as any)?.message || JSON.stringify(error || "");

  const statusCode = (error as any)?.status || (error as any)?.statusCode;
  const hostPort = extractHostPort(baseUrl);

  let category: ErrorCategory = "UNKNOWN";
  let isNetwork = false;
  let devReason = "";

  if (
    /API_UNCONFIGURED/i.test(rawMessage) ||
    /API endpoint is not configured/i.test(rawMessage) ||
    !baseUrl
  ) {
    category = "NOT_CONFIGURED";
    isNetwork = true;
    devReason = "API endpoint is not configured. Set EXPO_PUBLIC_API_URL or run with Metro dev host.";
  } else if (
    /ECONNREFUSED/i.test(rawMessage) ||
    /ConnectException/i.test(rawMessage) ||
    /failed to connect/i.test(rawMessage) ||
    /refused to connect/i.test(rawMessage) ||
    /connection refused/i.test(rawMessage)
  ) {
    category = "CONNECTION_REFUSED";
    isNetwork = true;
    devReason = `Backend not running on ${hostPort}. Start it with npm run dev:mobile-api`;
  } else if (
    /ETIMEDOUT/i.test(rawMessage) ||
    /timeout/i.test(rawMessage) ||
    /timed out/i.test(rawMessage) ||
    /SocketTimeoutException/i.test(rawMessage) ||
    /AbortError/i.test(rawMessage)
  ) {
    category = "TIMEOUT";
    isNetwork = true;
    devReason = `Request timed out (firewall/isolation check required for ${baseUrl})`;
  } else if (
    /ENOTFOUND/i.test(rawMessage) ||
    /EAI_AGAIN/i.test(rawMessage) ||
    /UnknownHostException/i.test(rawMessage) ||
    /NoRouteToHostException/i.test(rawMessage) ||
    /host unreachable/i.test(rawMessage) ||
    /dns/i.test(rawMessage)
  ) {
    category = "DNS_UNREACHABLE";
    isNetwork = true;
    devReason = `Host unreachable / DNS failure resolving ${baseUrl}`;
  } else if (
    (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600) ||
    /HTTP (?:4\d\d|5\d\d)/i.test(rawMessage)
  ) {
    category = "HTTP_STATUS";
    isNetwork = false;
    devReason = `HTTP ${statusCode || "status"} error from ${baseUrl}`;
  } else if (
    /JSON Parse error/i.test(rawMessage) ||
    /Unexpected token/i.test(rawMessage) ||
    /SyntaxError/i.test(rawMessage) ||
    /invalid json/i.test(rawMessage)
  ) {
    category = "INVALID_JSON";
    isNetwork = false;
    devReason = `Invalid JSON response received from ${baseUrl}`;
  } else if (
    /fetch failed/i.test(rawMessage) ||
    /Network request failed/i.test(rawMessage) ||
    /NetworkError/i.test(rawMessage) ||
    /ECONNRESET/i.test(rawMessage)
  ) {
    category = "CONNECTION_REFUSED";
    isNetwork = true;
    devReason = `Network transport failed connecting to ${baseUrl}`;
  }

  const userMessage = isNetwork
    ? PRODUCTION_NETWORK_MESSAGE
    : rawMessage || "Failed to complete request. Please try again.";

  const displayTitle = isNetwork ? "Connection Unavailable" : "Something went wrong";

  let displayMessage: string;
  if (!isDevMode) {
    // Production: friendly text only, never leak stack traces or internal host details
    displayMessage = userMessage;
  } else {
    // Dev: friendly text + classified reason + base URL used
    if (isNetwork) {
      displayMessage = `${userMessage}\n\n[Dev Reason]: ${devReason || rawMessage}\n[Base URL]: ${baseUrl || "UNCONFIGURED"}`;
    } else {
      displayMessage = userMessage;
    }
  }

  return {
    category,
    isNetwork,
    displayTitle,
    displayMessage,
    userMessage,
    devReason,
    baseUrl,
    statusCode,
  };
}
