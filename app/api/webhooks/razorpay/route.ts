import { NextRequest } from "next/server"
import { handleRazorpayWebhook } from "@/lib/payments/razorpay-webhook"

// Canonical Razorpay webhook endpoint.
export async function POST(request: NextRequest) {
    return handleRazorpayWebhook(request)
}
