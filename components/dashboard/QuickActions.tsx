"use client"

import Link from "next/link"
import { Plus, Search, TrendingUp, BookOpen } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function QuickActions() {
    const actions = [
        {
            title: "Browse Courses",
            description: "Explore our course catalog",
            icon: BookOpen,
            href: "/courses",
            color: "bg-blue-50 text-blue-600",
        },
        {
            title: "Coding Practice",
            description: "Master DSA & interview questions",
            icon: Plus,
            href: "/practice",
            color: "bg-green-50 text-green-600",
        },
        {
            title: "Mock Test Series",
            description: "Test your exam readiness",
            icon: TrendingUp,
            href: "/test-series",
            color: "bg-purple-50 text-purple-600",
        },
        {
            title: "Search Content",
            description: "Find what you need",
            icon: Search,
            href: "/search",
            color: "bg-orange-50 text-orange-600",
        },
    ]

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {actions.map((action) => {
                    const Icon = action.icon
                    return (
                        <Link key={action.title} href={action.href}>
                            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-none h-full">
                                <CardContent className="p-6">
                                    <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                                    <p className="text-sm text-gray-600">{action.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
