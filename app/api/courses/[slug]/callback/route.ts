import { NextRequest, NextResponse } from "next/server"
import { captureCallbackLead } from "@/lib/courses/callback"
import { getClientIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Public course page callback request.
 * Always answers 200 with a generic body (no enumeration, no validation oracle).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  try {
    await captureCallbackLead({ courseIdOrSlug: slug, body, ip: getClientIp(req), source: "COURSE_DETAIL" })
  } catch (error) {
    // Never leak internals to the caller; the lead is simply not stored.
    console.warn("[course-callback] capture failed:", error instanceof Error ? error.message : "unknown")
  }

  return NextResponse.json({ ok: true, message: "Thanks — our team will call you shortly." })
}
