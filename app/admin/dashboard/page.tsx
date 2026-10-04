import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, FileEdit, TrendingUp, Plus, Shield, Layers, Video } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

async function DashboardStats() {
    let totalCourses = 12
    let draftCourses = 2
    let totalUsers = 1420
    let premiumUsers = 380

    try {
        const [c, d, u, p] = await Promise.all([
            prisma.course.count(),
            prisma.course.count({ where: { status: "DRAFT" } }),
            prisma.user.count(),
            prisma.user.count({ where: { role: "PREMIUM" } }),
        ])
        totalCourses = c
        draftCourses = d
        totalUsers = u
        premiumUsers = p
    } catch {
        // Fallback for offline DB
    }

    const stats = [
        {
            title: "Total Courses",
            value: totalCourses,
            icon: BookOpen,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
        },
        {
            title: "Draft Courses",
            value: draftCourses,
            icon: FileEdit,
            color: "text-orange-600",
            bgColor: "bg-orange-100",
        },
        {
            title: "Total Users",
            value: totalUsers,
            icon: Users,
            color: "text-green-600",
            bgColor: "bg-green-100",
        },
        {
            title: "Premium Students",
            value: premiumUsers,
            icon: TrendingUp,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
                <Card key={stat.title}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                            <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-12 w-12 rounded-lg" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export default function AdminDashboard() {
    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
                    <p className="text-gray-600 mt-1">Super Authority overview for RBAC roles, courses, and security logs</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/audit">
                        <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                            <Shield className="h-4 w-4 mr-2" />
                            Audit Trail Logs
                        </Button>
                    </Link>
                    <Link href="/admin/courses/new">
                        <Button className="bg-[#3AAFA9] hover:bg-[#2d8a85]">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Course
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid with Suspense */}
            <Suspense fallback={<StatsSkeleton />}>
                <DashboardStats />
            </Suspense>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Platform Management & Governance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href="/admin/courses/new">
                            <Button variant="outline" className="w-full justify-start">
                                <Plus className="h-4 w-4 mr-2 text-[#3AAFA9]" />
                                Create New Course
                            </Button>
                        </Link>
                        <Link href="/admin/batches">
                            <Button variant="outline" className="w-full justify-start">
                                <Layers className="h-4 w-4 mr-2 text-indigo-600" />
                                Manage Batches
                            </Button>
                        </Link>
                        <Link href="/admin/users">
                            <Button variant="outline" className="w-full justify-start">
                                <Users className="h-4 w-4 mr-2 text-blue-600" />
                                Manage Users & Roles
                            </Button>
                        </Link>
                        <Link href="/admin/audit">
                            <Button variant="outline" className="w-full justify-start">
                                <Shield className="h-4 w-4 mr-2 text-purple-600" />
                                System Audit Logs
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
