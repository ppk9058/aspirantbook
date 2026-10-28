/**
 * A13: the API now refuses every failed credential check with one uniform
 * message, so the client must never surface a status-specific reason that
 * would reveal whether an account exists or is suspended.
 */
export const UNIFORM_LOGIN_ERROR = "Invalid email or password. Please try again.";
export const LOGIN_LOCKED_ERROR =
  "Too many failed attempts. Please wait a few minutes and try again.";

export interface LoginErrorLike {
  code?: string;
  message?: string;
}

export function loginErrorMessage(error?: LoginErrorLike | null): string {
  const code = String(error?.code || "").toUpperCase();

  if (code === "RATE_LIMITED" || code === "TOO_MANY_REQUESTS") {
    return LOGIN_LOCKED_ERROR;
  }
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    return UNIFORM_LOGIN_ERROR;
  }

  const message = error?.message?.trim();
  return message || UNIFORM_LOGIN_ERROR;
}
