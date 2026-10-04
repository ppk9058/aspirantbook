import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/exam/series/enroll  — enroll in a free series or buy pass
export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    }
    const userId = session.user.id

    let body: { seriesId: string; enrollType?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { seriesId, enrollType = "FREE" } = body
    if (!seriesId) {
        return NextResponse.json({ error: "seriesId required" }, { status: 400 })
    }

    // Validate series exists
    const series = await prisma.examSeries.findUnique({ where: { id: seriesId } })
    if (!series) {
        // try by slug
        const bySlug = await prisma.examSeries.findFirst({ where: { slug: seriesId } })
        if (!bySlug) {
            return NextResponse.json({ error: "Series not found" }, { status: 404 })
        }
    }
    const resolvedId = series?.id || seriesId

    const validType = ["FREE", "PASS", "PURCHASED"].includes(enrollType)
        ? (enrollType as "FREE" | "PASS" | "PURCHASED")
        : "FREE"

    // Upsert enrollment — idempotent
    const enrollment = await prisma.examSeriesEnrollment.upsert({
        where: { userId_seriesId: { userId, seriesId: resolvedId } },
        create: {
            userId,
            seriesId: resolvedId,
            enrollType: validType,
            status: "ACTIVE",
            expiresAt:
                validType === "FREE"
                    ? null
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for paid
        },
        update: {
            status: "ACTIVE",
            enrollType: validType,
        },
    })

    // Bump usersCount on series
    await prisma.examSeries.update({
        where: { id: resolvedId },
        data: { usersCount: { increment: 1 } },
    }).catch(() => {}) // non-fatal

    return NextResponse.json({ success: true, enrollment })
}

// GET /api/exam/series/enroll?seriesId=xxx  — check if user is enrolled
export async function GET(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ enrolled: false })
    }
    const userId = session.user.id
    const seriesId = req.nextUrl.searchParams.get("seriesId")
    if (!seriesId) return NextResponse.json({ enrolled: false })

    const enrollment = await prisma.examSeriesEnrollment.findFirst({
        where: {
            userId,
            status: "ACTIVE",
            OR: [
                { seriesId },
                { series: { slug: seriesId } },
            ],
        },
        select: { id: true, enrollType: true, enrolledAt: true, expiresAt: true },
    })

    return NextResponse.json({ enrolled: !!enrollment, enrollment })
}
