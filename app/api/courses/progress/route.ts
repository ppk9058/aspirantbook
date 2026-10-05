import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        let body: any
        const contentType = req.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
            body = await req.json()
        } else {
            const text = await req.text()
            body = JSON.parse(text)
        }

        const { lessonId, timeSpent, completed } = body
        if (!lessonId || typeof timeSpent !== "number") {
            return NextResponse.json({ error: "Invalid payload: lessonId and numeric timeSpent required" }, { status: 400 })
        }

        const flooredTime = Math.max(0, Math.floor(timeSpent))

        const progress = await prisma.progress.upsert({
            where: {
                userId_lessonId: {
                    userId: session.user.id,
                    lessonId,
                },
            },
            update: {
                timeSpent: flooredTime,
                lastAccessed: new Date(),
                ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
            },
            create: {
                userId: session.user.id,
                lessonId,
                timeSpent: flooredTime,
                completed: Boolean(completed),
                lastAccessed: new Date(),
            },
        })

        return NextResponse.json({ success: true, data: progress })
    } catch (err: any) {
        console.error("Save progress error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
