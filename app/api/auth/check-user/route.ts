import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const phone = body?.phone || ""

        // Timing-safe generic response preventing user enumeration
        return NextResponse.json({
            ok: true,
            status: "ready",
            message: "Verification challenge prepared",
        })
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
    }
}
