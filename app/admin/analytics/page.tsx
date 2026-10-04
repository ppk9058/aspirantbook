import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    TrendingUp,
    Users,
    DollarSign,
    BookOpen,
    Award,
    Activity,
    Clock
} from "lucide-react"
import { subDays } from "date-fns"

export default async function AnalyticsPage() {
    const today = new Date()
    const last7Days = subDays(today, 7)
    const last30Days = subDays(today, 30)

    // Get overall stats
    const [
        totalUsers,
        activeUsers,
        premiumUsers,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        recentEnrollments,
        totalRevenue,
        activeSubscriptions,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
            where: {
                lastActive: {
                    gte: last7Days,
                },
            },
        }),
        prisma.user.count({
            where: {
                role: "PREMIUM",
            },
        }),
        prisma.course.count(),
        prisma.course.count({
            where: { status: "PUBLISHED" },
        }),
        prisma.enrollment.count(),
        prisma.enrollment.count({
            where: {
                enrolledAt: {
                    gte: last30Days,
                },
            },
        }),
        prisma.payment.aggregate({
            where: {
                status: "COMPLETED",
            },
            _sum: {
                amount: true,
            },
        }),
        prisma.subscription.count({
            where: { status: "ACTIVE" },
        }),
    ])

    // Get top courses by enrollment
    const topCourses = await prisma.course.findMany({
        where: { status: "PUBLISHED" },
        orderBy: {
            enrollmentCount: "desc",
        },
        take: 5,
        select: {
            id: true,
            title: true,
            enrollmentCount: true,
            rating: true,
            isPremium: true,
        },
    })

    // Get recent users
    const recentUsers = await prisma.user.findMany({
        orderBy: {
            createdAt: "desc",
        },
        take: 5,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            xp: true,
        },
    })

    // Calculate MRR (simplified)
    const mrr = activeSubscriptions * 9.99

    // Calculate growth (simplified - comparing last 7 days to previous 7)
    const previous7DaysEnrollments = await prisma.enrollment.count({
        where: {
            enrolledAt: {
                gte: subDays(last7Days, 7),
                lt: last7Days,
            },
        },
    })

    const enrollmentGrowth = previous7DaysEnrollments > 0
        ? ((recentEnrollments - previous7DaysEnrollments) / previous7DaysEnrollments) * 100
        : 0

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">Platform performance and insights</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${(totalRevenue._sum.amount || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            ${mrr.toFixed(2)} MRR
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {activeUsers} active this week
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Active Subscriptions
                        </CardTitle>
                        <Award className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeSubscriptions}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {premiumUsers} premium users
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Enrollments
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEnrollments}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className={enrollmentGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                                {enrollmentGrowth >= 0 ? "+" : ""}{enrollmentGrowth.toFixed(1)}%
                            </span>{" "}
                            from last week
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total</span>
                                <span className="font-medium">{totalCourses}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Published</span>
                                <span className="font-medium">{publishedCourses}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Draft</span>
                                <span className="font-medium">{totalCourses - publishedCourses}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">All Time</span>
                                <span className="font-medium">{totalEnrollments}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Last 30 Days</span>
                                <span className="font-medium">{recentEnrollments}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Avg per Course</span>
                                <span className="font-medium">
                                    {publishedCourses > 0 ? Math.round(totalEnrollments / publishedCourses) : 0}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">User Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Free Users</span>
                                <span className="font-medium">{totalUsers - premiumUsers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Premium Users</span>
                                <span className="font-medium">{premiumUsers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Conversion Rate</span>
                                <span className="font-medium">
                                    {totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Courses and Recent Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Performing Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topCourses.length > 0 ? (
                                topCourses.map((course, index) => (
                                    <div key={course.id} className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900">{course.title}</p>
                                                {course.isPremium && (
                                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                                                        Premium
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {course.enrollmentCount} enrollments • {course.rating.toFixed(1)} ⭐
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No courses published yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{user.name || "Anonymous"}</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === "PREMIUM"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : user.role === "ADMIN"
                                                    ? "bg-purple-100 text-purple-800"
                                                    : "bg-gray-100 text-gray-800"
                                            }`}>
                                            {user.role}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">{user.xp} XP</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
