import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { runDailyAnalytics } from '@/lib/actions/admin/analytics'

export async function POST() {
    try {
        const session = await auth()
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const result = await runDailyAnalytics()

        return NextResponse.json({
            success: true,
            message: 'Analytics aggregation completed',
            ...result,
        })
    } catch (error: any) {
        console.error('Analytics aggregation error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to run analytics' },
            { status: 500 }
        )
    }
}
