import { NextRequest } from "next/server"
import { handleRazorpayWebhook } from "@/lib/payments/razorpay-webhook"

// Legacy alias kept for deployments whose Razorpay dashboard points at this URL.
// It delegates to the canonical handler so both URLs share one code path.
export async function POST(request: NextRequest) {
    return handleRazorpayWebhook(request)
}
