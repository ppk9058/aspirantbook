import { auth } from "@/auth"
import { exportUsersCsv } from "@/lib/actions/admin/users"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const csvData = await exportUsersCsv()
        return new NextResponse(csvData, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="users-export-${Date.now()}.csv"`,
            },
        })
    } catch (err: any) {
        return new NextResponse(err.message || "Failed to export users", { status: 500 })
    }
}
