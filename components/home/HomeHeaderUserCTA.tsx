"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowRight } from "lucide-react"
import HomeUserDropdown from "./HomeUserDropdown"

interface HomeHeaderUserCTAProps {
    initialSession?: {
        user?: {
            id?: string
            name?: string | null
            email?: string | null
            image?: string | null
            role?: string | null
        }
    } | null
}

export default function HomeHeaderUserCTA({ initialSession }: HomeHeaderUserCTAProps = {}) {
    const { data: clientSession, status } = useSession()
    const session = clientSession ?? initialSession
    const isLoading = status === "loading" && !initialSession

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-11 w-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
        )
    }

    const dashboardHref =
        session?.user?.role === "ADMIN"
            ? "/admin"
            : session?.user?.role === "TEACHER"
            ? "/teacher"
            : "/dashboard"

    return (
        <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Desktop-only dashboard shortcut; on phones it lives inside the avatar menu */}
            <Link
                href={dashboardHref}
                prefetch={true}
                className="hidden min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F26522] to-amber-500 px-4 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95 sm:inline-flex"
                aria-label="Go to Dashboard"
            >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {session?.user ? (
                <HomeUserDropdown user={session.user} />
            ) : (
                <Link
                    href="/login"
                    prefetch={true}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-xl border-2 border-[#F26522] px-3 text-xs font-bold whitespace-nowrap text-[#F26522] transition-all duration-200 hover:bg-[#F26522] hover:text-white active:scale-95 sm:px-5 sm:text-sm dark:border-orange-400 dark:text-orange-300 dark:hover:bg-orange-500 dark:hover:text-white"
                >
                    <span>Login</span>
                    <span className="hidden sm:inline">/Register</span>
                </Link>
            )}
        </div>
    )
}
