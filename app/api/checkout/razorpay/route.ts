import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    return NextResponse.json(
        { error: "Endpoint deprecated. Use /app/checkout with Razorpay Checkout order actions." },
        { status: 410 }
    )
}

