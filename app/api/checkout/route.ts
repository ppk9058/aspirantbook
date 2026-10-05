import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    return NextResponse.json(
        { error: "Endpoint deprecated. Use /app/checkout with Stripe Checkout action." },
        { status: 410 }
    )
}

