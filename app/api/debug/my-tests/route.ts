import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
        return NextResponse.json({ error: "Not logged in", session: null })
    }

    const attempts = await prisma.examAttempt.findMany({
        where: { userId, status: { in: ["SUBMITTED", "TIMED_OUT"] } },
        include: { test: { include: { series: true } } },
        orderBy: { submittedAt: "desc" },
    })

    return NextResponse.json({
        userId,
        email: session?.user?.email,
        role: session?.user?.role,
        attemptCount: attempts.length,
        attempts: attempts.map((a) => ({
            id: a.id,
            test: a.test.title,
            series: a.test.series?.title,
            score: a.score,
            totalMarks: a.totalMarks,
            percentile: a.percentile,
            rank: a.allIndiaRank,
            status: a.status,
        })),
    })
}
