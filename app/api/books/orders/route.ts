import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createOrder, getUserCompletedBooks, getUserCompletedOrders } from "@/lib/books/bookService"

export const dynamic = "force-dynamic"

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
}

/**
 * GET /api/books/orders
 *
 * The database is the only source of truth for book ownership. Auth required;
 * the userId always comes from the session, never from the query/body.
 * Returns the user's completed orders plus the derived owned book ids using the
 * exact same ownership logic as getUserCompletedBooks().
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const userId = session.user.id
    const [orders, ownedBookIds] = await Promise.all([
      getUserCompletedOrders(userId),
      getUserCompletedBooks(userId),
    ])

    return NextResponse.json(
      { success: true, data: orders, ownedBookIds },
      { status: 200, headers: NO_STORE_HEADERS }
    )
  } catch (err: any) {
    console.error("[GET /api/books/orders] failed:", err)
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}

/** POST unchanged: clients can never mark an order completed directly. */
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

    // Security audit: Client cannot mark orders as completed directly
    if (body.status === "completed" || body.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Forbidden: Orders cannot be marked completed directly. Please complete payment via /api/books/checkout." },
        { status: 403 }
      )
    }

    const safeOrder = {
      ...body,
      userId: session.user.id,
      status: "pending_payment" as const,
      paidAt: undefined,
      razorpayPaymentId: undefined,
    }

    const order = await createOrder(safeOrder)
    return NextResponse.json({ success: true, data: order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record order" }, { status: 500 })
  }
}
