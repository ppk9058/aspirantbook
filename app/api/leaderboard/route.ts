import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Total eligible student count (excluding staff and users with 0 XP)
        const totalEligible = await prisma.user.count({
            where: {
                role: { notIn: ["TEACHER", "ADMIN"] },
                xp: { gt: 0 },
            },
        })

        // Query Postgres with pre-paging staff filter and deterministic ordering
        const dbUsers = await prisma.user.findMany({
            where: {
                role: { notIn: ["TEACHER", "ADMIN"] },
                xp: { gt: 0 },
            },
            orderBy: [
                { xp: 'desc' },
                { id: 'asc' },
            ],
            take: limit,
            skip: offset,
            select: {
                id: true,
                name: true,
                image: true,
                xp: true,
                level: true,
                streak: true,
            },
        })

        const enrichedLeaderboard = dbUsers.map((user, idx) => ({
            rank: offset + idx + 1,
            user,
            xp: user.xp,
        }))

        // Get current user's rank (staff members receive no student rank)
        let currentUserRank = null
        const isStaff = (session.user as any).role === "TEACHER" || (session.user as any).role === "ADMIN"
        if (session.user.id && !isStaff) {
            const currentUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { xp: true },
            })
            if (currentUser && currentUser.xp > 0) {
                const higherCount = await prisma.user.count({
                    where: {
                        role: { notIn: ["TEACHER", "ADMIN"] },
                        xp: { gt: 0 },
                        OR: [
                            { xp: { gt: currentUser.xp } },
                            { xp: currentUser.xp, id: { lt: session.user.id } },
                        ],
                    },
                })
                currentUserRank = higherCount + 1
            }
        }

        return NextResponse.json({
            leaderboard: enrichedLeaderboard,
            currentUserRank,
            total: totalEligible,
        })
    } catch (error) {
        console.error('Leaderboard API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        )
    }
}
