import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getAllCoupons, createCoupon, deleteCoupon } from "@/lib/books/bookService"

export async function GET() {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can view coupons" },
        { status: 403 }
      )
    }

    const coupons = await getAllCoupons()
    return NextResponse.json({ success: true, data: coupons })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch coupons" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can create coupons" },
        { status: 403 }
      )
    }

    const body = await req.json()
    if (!body.code || !body.value) {
      return NextResponse.json({ error: "Coupon code and discount value are required" }, { status: 400 })
    }

    const created = await createCoupon(body)
    return NextResponse.json({ success: true, data: created, message: "Coupon created successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create coupon" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can delete coupons" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
    }

    const success = await deleteCoupon(code)
    if (!success) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Coupon removed" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete coupon" }, { status: 500 })
  }
}
