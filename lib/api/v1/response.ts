import { NextResponse } from "next/server";
import { ZodError } from "zod";
import crypto from "crypto";

export function getRequestId(req?: Request | { headers: Headers }): string {
  if (req && "headers" in req && req.headers.get("x-request-id")) {
    return req.headers.get("x-request-id")!;
  }
  return crypto.randomUUID();
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
  requestId?: string
) {
  const reqId = requestId || crypto.randomUUID();
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("x-request-id", reqId);

  // Default to private, no-store for per-user data unless explicitly overridden
  if (!responseHeaders.has("Cache-Control")) {
    responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  }

  return NextResponse.json(
    {
      ok: true,
      data,
    },
    {
      status,
      headers: responseHeaders,
    }
  );
}

export function apiCachedSuccess<T>(
  req: Request | { headers: Headers },
  data: T,
  cacheControl = "public, max-age=60, stale-while-revalidate=120",
  requestId?: string
) {
  const reqId = getRequestId(req);
  const payloadStr = JSON.stringify({ ok: true, data });
  const hash = crypto.createHash("md5").update(payloadStr).digest("hex");
  const etag = `"${hash}"`;
  const ifNoneMatch = "headers" in req ? req.headers.get("if-none-match") : null;

  if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": cacheControl,
        "x-request-id": reqId,
      },
    });
  }

  return apiSuccess(
    data,
    200,
    {
      ETag: etag,
      "Cache-Control": cacheControl,
    },
    reqId
  );
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: any,
  requestId?: string,
  headers: Record<string, string> = {}
) {
  const reqId = requestId || crypto.randomUUID();
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("x-request-id", reqId);
  responseHeaders.set("Cache-Control", "no-store, max-age=0");

  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    {
      status,
      headers: responseHeaders,
    }
  );
}

/**
 * Maps any caught exception into a uniform, client-safe JSON envelope.
 * Absolute rule: never leak SQL statements, column names, or stack traces.
 */
export function handleApiError(err: unknown, requestId?: string) {
  const reqId = requestId || crypto.randomUUID();

  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return apiError("VALIDATION_ERROR", "Invalid request parameters", 400, formatted, reqId);
  }

  const errMessage = (err as any)?.message || "";

  // Prisma unique constraint violation
  if ((err as any)?.code === "P2002") {
    return apiError("CONFLICT", "A resource with these details already exists", 409, undefined, reqId);
  }

  // Record not found
  if ((err as any)?.code === "P2025") {
    return apiError("NOT_FOUND", "The requested resource was not found", 404, undefined, reqId);
  }

  // Handle known error codes thrown by business logic
  if (errMessage.includes("UNAUTHORIZED") || errMessage.includes("Unauthorized")) {
    return apiError("UNAUTHORIZED", "Authentication required", 401, undefined, reqId);
  }

  if (errMessage.includes("FORBIDDEN") || errMessage.includes("Forbidden")) {
    return apiError("FORBIDDEN", "You do not have access to this resource", 403, undefined, reqId);
  }

  if (errMessage.includes("NOT_FOUND") || errMessage.includes("Not found")) {
    return apiError("NOT_FOUND", "Resource not found", 404, undefined, reqId);
  }

  // Server error fallback - log internally, send safe message to client
  console.error(`[API v1 Error][${reqId}]:`, err);
  return apiError("INTERNAL_SERVER_ERROR", "An unexpected error occurred. Please try again.", 500, undefined, reqId);
}
