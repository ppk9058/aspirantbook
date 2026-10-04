import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

const CARDS_FILE_PATH = path.join(process.cwd(), "data", "homepage-cards.json")

export async function GET() {
    try {
        const user = await getCurrentUserContext()
        if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        let cards: any = {}
        if (fs.existsSync(CARDS_FILE_PATH)) {
            const content = fs.readFileSync(CARDS_FILE_PATH, "utf-8")
            cards = JSON.parse(content)
        }

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

        fs.writeFileSync(CARDS_FILE_PATH, JSON.stringify(body.cards, null, 2), "utf-8")

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
