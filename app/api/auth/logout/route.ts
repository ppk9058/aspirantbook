import { NextRequest, NextResponse } from "next/server"
import { sanitizeReturnPath } from "@/lib/utils/return-path"

const COOKIES_TO_DELETE = [
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

function handleLogout(req: NextRequest) {
  const url = new URL(req.url)
  const rawCallback = url.searchParams.get("callbackUrl") || "/"
  const safeCallback = sanitizeReturnPath(rawCallback, "/")
  const response = NextResponse.redirect(new URL(safeCallback, req.url))

  const isHttps = url.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https"
  const isProduction = process.env.NODE_ENV === "production"
  const requestOrEnvSecure = isHttps || isProduction

  for (const cookieName of COOKIES_TO_DELETE) {
    const isPrefixed = cookieName.startsWith("__Secure-") || cookieName.startsWith("__Host-")
    response.cookies.set(cookieName, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
      httpOnly: true,
      secure: isPrefixed || requestOrEnvSecure,
    })
  }

  return response
}

export async function GET() {
  return new NextResponse(JSON.stringify({ error: "Method Not Allowed: Use POST to log out" }), {
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Allow": "POST",
    },
  })
}

export async function POST(req: NextRequest) {
  return handleLogout(req)
}

