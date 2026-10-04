import { NextResponse } from "next/server"
import { submitPollVote } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { pollId, optionId } = body
    if (!pollId || !optionId) {
      return NextResponse.json({ error: "pollId and optionId are required" }, { status: 400 })
    }
    const updated = await submitPollVote(id, pollId, optionId)
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/polls error:", error)
    return NextResponse.json({ error: "Failed to submit poll vote" }, { status: 500 })
  }
}
