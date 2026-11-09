"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { getDashboardHref } from "@/lib/auth/roles"

export type BrandLogoSize = "sm" | "md" | "lg" | "xl"

export interface BrandLogoProps {
    size?: BrandLogoSize
    showWordmark?: boolean
    href?: string
    collapsed?: boolean
    className?: string
    priority?: boolean
    onClick?: () => void
    "data-testid"?: string
}

const SIZE_CONFIG: Record<
    BrandLogoSize,
    {
        box: string
        img: number
        text: string
    }
> = {
    sm: {
        box: "h-7 w-7 sm:h-8 sm:w-8",
        img: 32,
        text: "text-base sm:text-lg font-black tracking-tight",
    },
    md: {
        box: "h-8 w-8 sm:h-9 sm:w-9",
        img: 36,
        text: "text-lg sm:text-xl font-black tracking-tight",
    },
    lg: {
        box: "h-9 w-9 sm:h-11 sm:w-11",
        img: 44,
        text: "text-xl sm:text-2xl font-black tracking-tight",
    },
    xl: {
        box: "h-14 w-14 sm:h-16 sm:w-16",
        img: 64,
        text: "text-2xl sm:text-3xl font-black tracking-tight",
    },
}

export default function BrandLogo({
    size = "md",
    showWordmark = true,
    href,
    collapsed = false,
    className = "",
    priority = false,
    onClick,
    "data-testid": testId,
}: BrandLogoProps) {
    const { data: session } = useSession()
    const resolvedHref = href ?? getDashboardHref(session?.user?.role, Boolean(session?.user))
    const config = SIZE_CONFIG[size] || SIZE_CONFIG.md

    const content = (
        <span className={`group inline-flex min-w-0 items-center gap-2 sm:gap-2.5 ${className}`.trim()}>
            <span
                className={`relative flex ${config.box} flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-0.5 shadow-xs ring-1 ring-black/5 transition-transform group-hover:scale-105 dark:border-gray-800 dark:bg-gray-900`}
            >
                <Image
                    src="/aspirant-logo.png"
                    alt="aspirantBook"
                    width={config.img}
                    height={config.img}
                    className="h-full w-full rounded-full object-contain"
                    priority={priority}
                />
            </span>
            {showWordmark && !collapsed && (
                <span
                    data-testid="brand-name"
                    className={`truncate text-[#ff0031] dark:text-[#ff385c] ${config.text}`}
                >
                    aspirantBook
                </span>
            )}
        </span>
    )

    if (resolvedHref) {
        return (
            <Link
                href={resolvedHref}
                onClick={onClick}
                data-testid={testId || "brand-logo"}
                className="inline-flex min-w-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg"
            >
                {content}
            </Link>
        )
    }

    return content
}
