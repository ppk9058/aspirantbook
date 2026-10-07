import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createOrder } from "@/lib/books/bookService"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    if (!body || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Order must contain items" }, { status: 400 })
    }

    const order = await createOrder(body)
    return NextResponse.json({ success: true, data: order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record order" }, { status: 500 })
  }
}
