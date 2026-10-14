import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { verifyRazorpaySignature } from "@/lib/payments/razorpay"
import { getOrderByOrderId, getOrderByRazorpayId, markBookOrderCompleted } from "@/lib/books/bookService"

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 })
    }

    const body = await req.json()
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {}

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters" },
        { status: 400 }
      )
    }

    // 1. Verify Razorpay HMAC SHA256 signature
    const isValidSignature = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    if (!isValidSignature) {
      console.warn(`Payment signature verification failed for order ${razorpay_order_id}`)
      return NextResponse.json(
        { error: "Invalid payment signature. Verification failed." },
        { status: 400 }
      )
    }

    // 2. Fetch the corresponding order
    let order = null
    if (orderId) {
      order = await getOrderByOrderId(orderId)
    }
    if (!order && razorpay_order_id) {
      order = await getOrderByRazorpayId(razorpay_order_id)
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found for the given payment details" },
        { status: 404 }
      )
    }

    // 3. Verify user ownership
    if (order.userId && order.userId !== userId) {
      return NextResponse.json(
        { error: "Access Denied: This order belongs to a different account." },
        { status: 403 }
      )
    }

    // 4. Mark completed idempotently (increments salesCount once, prevents duplicate completion)
    const result = await markBookOrderCompleted({
      orderId: order.id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to update order status." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      alreadyCompleted: result.alreadyCompleted || false,
      order: result.order,
    })
  } catch (err: any) {
    console.error("Error verifying book payment:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
