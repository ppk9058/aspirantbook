/**
 * Resolves the application base URL for auth workflows (verification emails, password resets).
 * Fails closed in production if neither NEXT_PUBLIC_APP_URL nor NEXTAUTH_URL is configured.
 * In development and test environments, falls back to http://127.0.0.1:3045.
 */
export function getAuthAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[SECURITY REFUSAL] Missing NEXT_PUBLIC_APP_URL or NEXTAUTH_URL in production environment. Refusing localhost fallback."
    );
  }

  return "http://127.0.0.1:3045";
}
