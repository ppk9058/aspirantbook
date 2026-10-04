import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

export async function POST(req: Request) {
  try {
    const { path, tag } = await req.json()
    if (tag) revalidateTag(tag)
    if (path) revalidatePath(path)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Revalidation failed" }, { status: 500 })
  }
}
