import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { runDailyAnalytics } from '@/lib/actions/admin/analytics'

export async function POST() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const result = await runDailyAnalytics()

        return NextResponse.json({
            message: 'Analytics aggregation completed',
            ...result,
        })
    } catch (error: any) {
        console.error('Analytics aggregation error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Analytics service temporarily unavailable' },
            { status: 503 }
        )
    }
}
