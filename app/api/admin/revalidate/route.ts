import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { revalidatePath, revalidateTag } from "next/cache"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 })
    }

    const { path, tag } = await req.json()
    if (tag) revalidateTag(tag)
    if (path) revalidatePath(path)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Revalidation failed" }, { status: 500 })
  }
}
