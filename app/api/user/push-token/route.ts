import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const PushTokenSchema = z.object({
  token: z.string().min(10, "Push token must be at least 10 characters").max(500, "Push token too long"),
  platform: z.enum(["android", "ios", "web"]),
  deviceModel: z.string().max(100).optional(),
  appVersion: z.string().max(50).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Rate limiting (per user and client IP)
    const clientIp = getClientIp(req)
    const rateLimitKey = `push_token:${session.user.id}:${clientIp}`
    const rl = await checkRateLimit(rateLimitKey, 10, 60) // 10 updates per minute
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // 3. Payload validation
    const json = await req.json()
    const parsed = PushTokenSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { token, platform, deviceModel, appVersion } = parsed.data

    // 4. Upsert push token for the authenticated user
    const record = await prisma.devicePushToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        platform,
        deviceModel,
        appVersion,
      },
      create: {
        userId: session.user.id,
        token,
        platform,
        deviceModel,
        appVersion,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Device push token registered successfully",
      id: record.id,
    })
  } catch (error: any) {
    console.error("[PushToken API Error]:", error)
    return NextResponse.json(
      { error: "Internal server error registering push token" },
      { status: 500 }
    )
  }
}
