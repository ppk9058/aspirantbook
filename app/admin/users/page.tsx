import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Search, UserPlus } from "lucide-react"
import UserRoleBadge from "@/components/admin/UserRoleBadge"
import SubscriptionStatusBadge from "@/components/admin/SubscriptionStatusBadge"

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; role?: string }>
}) {
    const { search: searchQuery, role: roleFilter } = await searchParams
    const search = searchQuery || ""
    const role = roleFilter || "ALL"

    // Build where clause
    const where: any = {}

    if (search) {
        where.OR = [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search, mode: "insensitive" } },
        ]
    }

    if (role !== "ALL") {
        where.role = role
    }

    const [users, totalUsers, freeUsers, premiumUsers, adminUsers] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                subscriptions: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                _count: {
                    select: {
                        enrollments: true,
                        submissions: true,
                    },
                },
            },
            take: 50, // Limit for performance
        }),
        prisma.user.count(),
        prisma.user.count({ where: { role: "FREE" } }),
        prisma.user.count({ where: { role: "PREMIUM" } }),
        prisma.user.count({ where: { role: "ADMIN" } }),
    ])

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600 mt-1">{totalUsers} total users</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Users</p>
                                <p className="text-2xl font-bold">{totalUsers}</p>
                            </div>
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Free Users</p>
                                <p className="text-2xl font-bold">{freeUsers}</p>
                            </div>
                            <UserRoleBadge role="FREE" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Premium Users</p>
                                <p className="text-2xl font-bold">{premiumUsers}</p>
                            </div>
                            <UserRoleBadge role="PREMIUM" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Admins</p>
                                <p className="text-2xl font-bold">{adminUsers}</p>
                            </div>
                            <UserRoleBadge role="ADMIN" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <form method="get" className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                name="search"
                                defaultValue={search}
                                placeholder="Search by name or email..."
                                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <select
                            name="role"
                            defaultValue={role}
                            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="FREE">Free</option>
                            <option value="PREMIUM">Premium</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <Button type="submit">Filter</Button>
                    </form>
                </CardContent>
            </Card>

            {/* User List */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subscription
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stats
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Joined
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => {
                                    const latestSubscription = user.subscriptions[0]
                                    const subscriptionStatus = latestSubscription?.status || "EXPIRED"

                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                        <span className="text-purple-600 font-semibold">
                                                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.name || "No name"}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                        {user.phoneNumber && (
                                                            <div className="text-xs text-indigo-600 font-mono font-medium">{user.phoneNumber}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <UserRoleBadge role={user.role as any} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {latestSubscription ? (
                                                    <SubscriptionStatusBadge
                                                        status={subscriptionStatus as any}
                                                        endDate={latestSubscription.endDate}
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-500">No subscription</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {user._count.enrollments} courses
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {user.xp} XP • Level {user.level}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <Link href={`/admin/users/${user.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No users found</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
