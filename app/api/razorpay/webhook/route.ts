import { NextRequest, NextResponse } from "next/server"
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay"
import {
  getOrderByRazorpayId,
  getOrderByOrderId,
  markBookOrderCompleted,
  markBookOrderFailed,
} from "@/lib/books/bookService"

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-razorpay-signature")

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 })
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET
    if (!webhookSecret) {
      console.warn("RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET is not configured; failing closed")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    const isValid = verifyRazorpayWebhookSignature(rawBody, signature)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const eventType = event.event
    const payment = event.payload?.payment?.entity
    const rzpOrderId = payment?.order_id || event.payload?.order?.entity?.id
    const receipt = event.payload?.order?.entity?.receipt || payment?.notes?.orderId

    if (!rzpOrderId && !receipt) {
      return NextResponse.json({ received: true, note: "No order id present in event" })
    }

    // Check if this event corresponds to a BookOrder
    let bookOrder = null
    if (rzpOrderId) {
      bookOrder = await getOrderByRazorpayId(rzpOrderId)
    }
    if (!bookOrder && receipt) {
      bookOrder = await getOrderByOrderId(receipt)
    }

    if (bookOrder) {
      if (eventType === "payment.captured" || eventType === "order.paid") {
        await markBookOrderCompleted({
          orderId: bookOrder.id,
          razorpayPaymentId: payment?.id || "webhook_captured",
        })
      } else if (eventType === "payment.failed") {
        await markBookOrderFailed(bookOrder.id)
      }
      return NextResponse.json({ received: true, processed: "book_order", orderId: bookOrder.id })
    }

    return NextResponse.json({ received: true, processed: "not_book_order" })
  } catch (err: any) {
    console.error("Error processing razorpay webhook:", err)
    return NextResponse.json({ error: err.message || "Webhook error" }, { status: 500 })
  }
}
