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

        // Get leaderboard from Redis
        const leaderboard = await getLeaderboard(limit, offset)

        // Get user details for each entry
        const userIds = leaderboard.map((entry) => entry.userId)
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                name: true,
                image: true,
                xp: true,
                level: true,
                streak: true,
            },
        })

        // Combine leaderboard data with user details
        const enrichedLeaderboard = leaderboard.map((entry) => {
            const user = users.find((u) => u.id === entry.userId)
            return {
                rank: entry.rank,
                user: user || null,
                xp: entry.xp,
            }
        }).filter((entry) => entry.user !== null)

        // Get current user's rank
        let currentUserRank = null
        if (session.user.id) {
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
