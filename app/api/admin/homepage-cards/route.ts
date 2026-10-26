import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { prisma } from "@/lib/prisma"
import { getPlatformSetting, setPlatformSetting, PLATFORM_SETTING_KEYS } from "@/lib/platform-settings"

// B-006: homepage card configuration lives in the database (PlatformSetting).
// It used to be written to data/homepage-cards.json with fs.writeFileSync, which
// is per-instance and ephemeral on serverless.

export async function GET() {
    try {
        const user = await getCurrentUserContext()
        if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const stored = await getPlatformSetting<Record<string, unknown>>(PLATFORM_SETTING_KEYS.homepageCards)
        const cards = stored ?? {}

        // Fetch DB courses to allow easy 1-click linking
        const courses = await prisma.course.findMany({
            where: { status: "PUBLISHED" },
            select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                originalPrice: true,
                discountPercent: true,
                thumbnailUrl: true,
                technology: true,
                description: true,
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ cards, courses })
    } catch (error: any) {
        console.error("GET /api/admin/homepage-cards error:", error)
        return NextResponse.json({ error: error.message || "Failed to load cards" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUserContext()
        if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
            return NextResponse.json({ error: "Unauthorized: Admins and Teachers only" }, { status: 403 })
        }

        const body = await req.json()
        if (!body.cards || typeof body.cards !== "object") {
            return NextResponse.json({ error: "Invalid cards payload" }, { status: 400 })
        }

        await setPlatformSetting(PLATFORM_SETTING_KEYS.homepageCards, body.cards, user.userId)

        try {
            revalidatePath("/")
        } catch {
            // Ignore cache revalidation errors
        }

        return NextResponse.json({ success: true, message: "Homepage cards saved successfully" })
    } catch (error: any) {
        console.error("POST /api/admin/homepage-cards error:", error)
        return NextResponse.json({ error: error.message || "Failed to save cards" }, { status: 500 })
    }
}
