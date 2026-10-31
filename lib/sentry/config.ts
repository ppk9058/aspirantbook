/**
 * Sentry Error Monitoring & PII Scrubber Configuration (R12-E)
 *
 * Operational Rules:
 * 1. Zero network calls when SENTRY_DSN is absent/empty: initSentry() returns false
 *    and does not invoke Sentry.init().
 * 2. Strict PII scrubber (beforeSend):
 *    - Request bodies completely removed
 *    - Cookies and authentication/secret headers removed
 *    - Query strings stripped from request URLs and breadcrumbs
 *    - Emails and bearer tokens masked in messages and user contexts
 */

import * as Sentry from "@sentry/nextjs";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_REGEX = /bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;

const SENSITIVE_HEADERS = new Set([
  "cookie",
  "set-cookie",
  "authorization",
  "proxy-authorization",
  "x-auth-token",
  "x-api-key",
  "x-csrf-token",
  "razorpay-signature",
  "stripe-signature",
]);

let isInitialized = false;

export function isSentryInitialized(): boolean {
  if (isInitialized) return true;
  try {
    const client = Sentry.getClient();
    return Boolean(client && client.getDsn());
  } catch {
    return false;
  }
}

export function scrubText(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(EMAIL_REGEX, "[Filtered Email]")
    .replace(BEARER_REGEX, "Bearer [Filtered]");
}

export function scrubSentryEvent(event: any, _hint?: any): any {
  if (!event) return event;

  // 1. Scrub Request
  if (event.request) {
    // Strip request body completely
    delete event.request.data;

    // Strip cookies
    delete event.request.cookies;

    // Strip sensitive headers
    if (event.request.headers && typeof event.request.headers === "object") {
      const sanitizedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(event.request.headers)) {
        const lowerKey = key.toLowerCase();
        if (!SENSITIVE_HEADERS.has(lowerKey)) {
          sanitizedHeaders[key] = value as string;
        }
      }
      event.request.headers = sanitizedHeaders;
    }

    // Strip query strings
    delete event.request.query_string;
    if (typeof event.request.url === "string" && event.request.url.includes("?")) {
      event.request.url = event.request.url.split("?")[0];
    }
  }

  // 2. Scrub User Context
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    if (typeof event.user.username === "string" && EMAIL_REGEX.test(event.user.username)) {
      event.user.username = "[Filtered Email]";
    }
  }

  // 3. Scrub Messages
  if (typeof event.message === "string") {
    event.message = scrubText(event.message);
  }

  // 4. Scrub Exceptions
  if (event.exception?.values && Array.isArray(event.exception.values)) {
    for (const exc of event.exception.values) {
      if (typeof exc.value === "string") {
        exc.value = scrubText(exc.value);
      }
    }
  }

  // 5. Scrub Breadcrumbs
  if (Array.isArray(event.breadcrumbs)) {
    for (const breadcrumb of event.breadcrumbs) {
      if (typeof breadcrumb.message === "string") {
        breadcrumb.message = scrubText(breadcrumb.message);
      }
      if (breadcrumb.data && typeof breadcrumb.data === "object") {
        if (typeof breadcrumb.data.url === "string" && breadcrumb.data.url.includes("?")) {
          breadcrumb.data.url = breadcrumb.data.url.split("?")[0];
        }
        if (breadcrumb.data.headers && typeof breadcrumb.data.headers === "object") {
          for (const key of Object.keys(breadcrumb.data.headers)) {
            if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
              delete breadcrumb.data.headers[key];
            }
          }
        }
      }
    }
  }

  return event;
}

export function getSentryConfig() {
  const dsn = process.env.SENTRY_DSN ? process.env.SENTRY_DSN.trim() : "";
  if (!dsn) return null;

  return {
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || process.env.GIT_COMMIT || undefined,
    beforeSend(event: any, hint: any) {
      return scrubSentryEvent(event, hint);
    },
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  };
}

export function initSentry(_runtime: "server" | "client" | "edge" = "server"): boolean {
  const config = getSentryConfig();
  if (!config) {
    isInitialized = false;
    return false;
  }

  try {
    Sentry.init(config);
    isInitialized = true;
    return true;
  } catch (err) {
    console.error("[Sentry Init Error]:", err);
    isInitialized = false;
    return false;
  }
}
