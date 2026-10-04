import { NextResponse } from "next/server"
import goalsData from "@/data/goals-config.json"

export async function GET() {
    try {
        return NextResponse.json(
            {
                success: true,
                data: goalsData,
            },
            {
                headers: {
                    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                },
            }
        )
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to fetch goals configuration" },
            { status: 500 }
        )
    }
}
