import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getLeaderboard, getUserRank } from '@/lib/redis'
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

        // Get leaderboard from Redis (or fallback to Postgres when Redis cache is cold)
        const leaderboard = await getLeaderboard(limit, offset)
        let enrichedLeaderboard: Array<{ rank: number; user: any; xp: number }> = []

        if (leaderboard.length > 0) {
            // Get user details for each entry (strictly excluding TEACHER and ADMIN staff)
            const userIds = leaderboard.map((entry) => entry.userId)
            const users = await prisma.user.findMany({
                where: {
                    id: { in: userIds },
                    role: { notIn: ["TEACHER", "ADMIN"] },
                },
                select: {
                    id: true,
                    name: true,
                    image: true,
                    xp: true,
                    level: true,
                    streak: true,
                },
            })

            // Combine leaderboard data with user details and re-index ranks
            enrichedLeaderboard = leaderboard
                .map((entry) => {
                    const user = users.find((u) => u.id === entry.userId)
                    if (!user) return null
                    return {
                        user,
                        xp: entry.xp,
                    }
                })
                .filter((entry): entry is { user: (typeof users)[0]; xp: number } => entry !== null)
                .map((entry, idx) => ({
                    rank: offset + idx + 1,
                    user: entry.user,
                    xp: entry.xp,
                }))
        } else {
            // DB fallback: query Postgres directly, strictly excluding staff
            const dbUsers = await prisma.user.findMany({
                where: {
                    role: { notIn: ["TEACHER", "ADMIN"] },
                    xp: { gt: 0 },
                },
                orderBy: { xp: 'desc' },
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

            enrichedLeaderboard = dbUsers.map((user, idx) => ({
                rank: offset + idx + 1,
                user,
                xp: user.xp,
            }))
        }

        // Get current user's rank (staff members receive no student rank)
        let currentUserRank = null
        const isStaff = (session.user as any).role === "TEACHER" || (session.user as any).role === "ADMIN"
        if (session.user.id && !isStaff) {
            currentUserRank = await getUserRank(session.user.id)
        }

        return NextResponse.json({
            leaderboard: enrichedLeaderboard,
            currentUserRank,
            total: enrichedLeaderboard.length,
        })
    } catch (error) {
        console.error('Leaderboard API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        )
    }
}
