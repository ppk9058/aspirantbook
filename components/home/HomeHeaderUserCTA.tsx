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
                <div className="w-24 h-10 rounded-xl bg-gray-100 animate-pulse" />
            </div>
        )
    }

    if (session?.user) {
        const dashboardHref =
            session.user.role === "ADMIN"
                ? "/admin"
                : session.user.role === "TEACHER"
                ? "/teacher"
                : "/dashboard"

        return (
            <div className="flex items-center gap-2 sm:gap-3">
                <Link
                    href={dashboardHref}
                    prefetch={true}
                    className="flex px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs sm:text-sm hover:opacity-95 transition-all shadow-xs items-center gap-1.5"
                    aria-label="Go to Dashboard"
                >
                    <span>Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <HomeUserDropdown user={session.user} />
            </div>
        )
    }

    return (
        <Link
            href="/login"
            prefetch={true}
            className="px-6 py-2.5 rounded-xl border-2 border-[#F26522] text-[#F26522] hover:bg-[#F26522] hover:text-white font-bold text-sm transition-all duration-200 shadow-2xs"
        >
            Login/Register
        </Link>
    )
}
