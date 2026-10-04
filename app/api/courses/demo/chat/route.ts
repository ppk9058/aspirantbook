import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Simple profanity/link filter (block URLs, basic banned words)
const BANNED_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /bit\.ly/i,
  /tinyurl/i,
  /\bspam\b/i,
]

function containsBannedContent(text: string): boolean {
  return BANNED_PATTERNS.some((p) => p.test(text))
}

// Per-user in-memory rate limit map: userId -> lastPostTime ms
const lastPostTime = new Map<string, number>()
const RATE_LIMIT_MS = 2000 // 1 message per 2 seconds

// ────────────────────────────────────────────────────────────────────────────
// GET /api/courses/demo/chat?slotId=<>&since=<ISO>
// Returns messages after `since` (exclusive) for incremental polling
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const slotId = searchParams.get("slotId")
  const since = searchParams.get("since") // ISO string, optional

  if (!slotId) {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 })
  }

  const userId = session.user.id
  const userRole = (session.user as any).role as string

  // Teachers and admins can always read
  const isPrivileged = userRole === "TEACHER" || userRole === "ADMIN"

  if (!isPrivileged) {
    // Must have a booking for this slot
    const booking = await prisma.demoBooking.findFirst({
      where: { slotId, studentId: userId },
    })
    if (!booking) {
      return NextResponse.json({ error: "Not authorized for this slot" }, { status: 403 })
    }
  }

  const sinceDate = since ? new Date(since) : new Date(0)

  const messages = await prisma.demoChatMessage.findMany({
    where: {
      slotId,
      createdAt: { gt: sinceDate },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      displayName: true,
      role: true,
      message: true,
      isQuestion: true,
      isPinned: true,
      createdAt: true,
      userId: true,
    },
  })

  return NextResponse.json({ messages })
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/courses/demo/chat
// Body: { slotId, message, isQuestion? }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const userRole = (session.user as any).role as string
  const isPrivileged = userRole === "TEACHER" || userRole === "ADMIN"

  // Rate limit check
  const now = Date.now()
  const lastPost = lastPostTime.get(userId) ?? 0
  if (now - lastPost < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a moment." },
      { status: 429 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { slotId, message, isQuestion } = body

  if (!slotId || !message) {
    return NextResponse.json({ error: "slotId and message are required" }, { status: 400 })
  }

  const trimmedMessage = String(message).trim()

  if (trimmedMessage.length === 0) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 })
  }

  if (trimmedMessage.length > 300) {
    return NextResponse.json({ error: "Message exceeds 300 characters" }, { status: 400 })
  }

  if (containsBannedContent(trimmedMessage)) {
    return NextResponse.json(
      { error: "Links and external URLs are not allowed in chat." },
      { status: 400 }
    )
  }

  if (!isPrivileged) {
    // Must have a booking for this slot
    const booking = await prisma.demoBooking.findFirst({
      where: { slotId, studentId: userId },
    })
    if (!booking) {
      return NextResponse.json({ error: "Not authorized for this slot" }, { status: 403 })
    }
  }

  // Determine display name: first name if real name, else Student (last 4 digits of phone)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phoneNumber: true },
  })

  let displayName = "Student"
  const rawName = user?.name?.trim() || ""
  const isGenericName = !rawName || /^student$/i.test(rawName) || /^user$/i.test(rawName)

  if (!isGenericName) {
    displayName = isPrivileged ? rawName : rawName.split(" ")[0]
  } else if (user?.phoneNumber) {
    const phone = user.phoneNumber.replace(/\D/g, "")
    const digits = phone.length >= 4 ? phone.slice(-4) : phone.slice(-2)
    displayName = `Student (${digits})`
  } else {
    displayName = "Student"
  }

  const chatMsg = await prisma.demoChatMessage.create({
    data: {
      slotId,
      userId,
      displayName,
      role: isPrivileged ? userRole : "STUDENT",
      message: trimmedMessage,
      isQuestion: Boolean(isQuestion),
      isPinned: false,
    },
    select: {
      id: true,
      displayName: true,
      role: true,
      message: true,
      isQuestion: true,
      isPinned: true,
      createdAt: true,
      userId: true,
    },
  })

  // Update rate limit
  lastPostTime.set(userId, now)

  return NextResponse.json({ message: chatMsg }, { status: 201 })
}
