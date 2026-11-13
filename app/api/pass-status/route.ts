import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { hasActivePass } from "@/lib/auth/entitlements"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
}

/**
 * Server-side delivery of the Pass entitlement to client components.
 *
 * The value is always computed from the database through hasActivePass()
 * (single source of truth). It is never read from the session/JWT payload,
 * localStorage or any client input. Auth required; guests get 401 + false.
 */
export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { authenticated: false, hasActivePass: false },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const active = await hasActivePass(userId)

    return NextResponse.json(
      { authenticated: true, hasActivePass: active },
      { status: 200, headers: NO_STORE_HEADERS }
    )
  } catch (err) {
    console.error("[pass-status] failed to resolve pass entitlement:", err)
    return NextResponse.json(
      { authenticated: false, hasActivePass: false, error: "PASS_STATUS_UNAVAILABLE" },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
