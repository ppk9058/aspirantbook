import { NextResponse } from "next/server"

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }
    return NextResponse.json({
        status: "debug_disabled",
        message: "Debug endpoint is inactive",
    })
}
