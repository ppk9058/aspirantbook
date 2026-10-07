import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClassroomData } from "@/lib/classroom-service"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const data = await getClassroomData(id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("GET /api/classroom/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch classroom" }, { status: 500 })
  }
}

