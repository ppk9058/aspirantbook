"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Home, BookOpen, Code, CheckSquare, User, Calendar, PlayCircle, HelpCircle, Shield, Layers, Users, Compass, Book } from "lucide-react"
import { AppRole } from "@/lib/auth/roles"

const STUDENT_TABS = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Courses", href: "/courses", icon: BookOpen },
    { name: "Book", href: "/books", icon: Book },
    { name: "My Batches", href: "/my-learning", icon: Compass },
    { name: "Profile", href: "/profile", icon: User },
]

const TEACHER_TABS = [
    { name: "Home", href: "/teacher", icon: Home },
    { name: "Classes", href: "/teacher/classes", icon: Calendar },
    { name: "Studio", href: "/classroom/half-yearly-6?role=teacher", icon: PlayCircle },
    { name: "Doubts", href: "/teacher/questions", icon: HelpCircle },
    { name: "Profile", href: "/profile", icon: User },
]

const ADMIN_TABS = [
    { name: "Control", href: "/admin", icon: Home },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Batches", href: "/admin/batches", icon: Layers },
    { name: "Audit", href: "/admin/audit", icon: Shield },
]

export default function BottomNavBar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    const rawRole = session?.user?.role
    let activeRole: AppRole = "STUDENT"
    if (rawRole === "ADMIN") {
        activeRole = pathname.startsWith("/teacher") ? "TEACHER" : "ADMIN"
    } else if (rawRole === "TEACHER") {
        activeRole = "TEACHER"
    } else {
        activeRole = "STUDENT"
    }

    const tabs = activeRole === "ADMIN" ? ADMIN_TABS : activeRole === "TEACHER" ? TEACHER_TABS : STUDENT_TABS

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/"
        return pathname.startsWith(href)
    }

    return (
        <nav data-mobile-bottom-nav="true" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#05192D]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-area-bottom select-none">
            <div className="flex items-center justify-around h-16 px-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const active = isActive(tab.href)
                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            prefetch={true}
                            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 text-xs transition-all duration-150 active:scale-90 active:opacity-70 ${
                                active
                                    ? "text-teal-700 dark:text-[#3AAFA9] font-bold"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            }`}
                        >
                            <div className="relative">
                                <Icon className={`h-5 w-5 transition-transform ${active ? "stroke-[2.5] scale-110" : "stroke-[1.75]"}`} />
                                {active && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-teal-700 dark:bg-[#3AAFA9] rounded-full" />
                                )}
                            </div>
                            <span className="mt-1 text-[11px] font-medium tracking-tight">{tab.name}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
