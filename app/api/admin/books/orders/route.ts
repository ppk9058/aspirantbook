import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getAllOrders, updateOrderStatus } from "@/lib/books/bookService"

export async function GET() {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can view eBook orders" },
        { status: 403 }
      )
    }

    const orders = await getAllOrders()
    return NextResponse.json({ success: true, data: orders })
  } catch (error: any) {
    console.error("GET /api/admin/books/orders error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch orders" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can modify order status" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { orderId, status } = body
    if (!orderId || !status) {
      return NextResponse.json({ error: "Order ID and status are required" }, { status: 400 })
    }

    const updated = await updateOrderStatus(orderId, status)
    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated, message: "Order status updated" })
  } catch (error: any) {
    console.error("PUT /api/admin/books/orders error:", error)
    return NextResponse.json({ error: error.message || "Failed to update order" }, { status: 500 })
  }
}
