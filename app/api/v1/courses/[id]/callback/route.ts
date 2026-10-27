import { NextRequest, NextResponse } from "next/server"
import { captureCallbackLead } from "@/lib/courses/callback"
import { getClientIp } from "@/lib/rate-limit"
import { apiSuccess, getRequestId } from "@/lib/api/v1/response"

export const dynamic = "force-dynamic"

/**
 * Mobile app (v1) callback request. Same guarantees as the web route:
 * generic success, E.164 storage, dedupe, rate limit.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const reqId = getRequestId(req)
  const { id } = await params

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  try {
    await captureCallbackLead({ courseIdOrSlug: id, body, ip: getClientIp(req), source: "MOBILE_APP" })
  } catch (error) {
    console.warn("[course-callback:v1] capture failed:", error instanceof Error ? error.message : "unknown")
  }

  return apiSuccess({ ok: true, message: "Thanks — our team will call you shortly." }, 200, {}, reqId)
}
