"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { getDashboardHref } from "@/lib/auth/roles"

interface BrandLogoLinkProps {
    collapsed?: boolean
    className?: string
}

export default function BrandLogoLink({ collapsed = false, className = "" }: BrandLogoLinkProps) {
    const { data: session } = useSession()
    const homeHref = getDashboardHref(session?.user?.role, !!session?.user)

    return (
        <Link
            href={homeHref}
            data-testid="brand-logo"
            className={`flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${className}`.trim()}
        >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#1448d8] to-[#1DB954] rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-base sm:text-lg">T</span>
            </div>
            {!collapsed && (
                <span
                    data-testid="brand-name"
                    className="text-xl font-bold text-[#05192D] dark:text-white tracking-tight hidden md:inline"
                >
                    aspirantbook
                </span>
            )}
        </Link>
    )
}
