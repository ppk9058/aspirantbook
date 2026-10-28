"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"

import { getDashboardHref } from "@/lib/auth/roles"

/**
 * C1: the landing page used to read the session on the server just to point the
 * brand logo at "/" for a visitor and at their dashboard for a signed-in user.
 * That single `auth()` call made the route dynamic and turned `revalidate = 60`
 * into a no-op, so the page could never be served from the ISR cache.
 *
 * The link is now resolved on the client from the session that SessionProvider
 * already loads. The server renders the guest target, which is correct for the
 * overwhelming majority of visitors to the marketing page, and a signed-in
 * visitor is redirected to their own dashboard a moment later.
 */
export default function HomeLogoLink() {
    const { data: session } = useSession()
    const href = getDashboardHref(session?.user?.role, Boolean(session?.user))

    return (
        <Link
            href={href}
            className="group flex min-w-0 items-center gap-2 sm:gap-3"
            data-testid="home-brand-link"
        >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ECDCC9] bg-[#F7EFE4] p-0.5 shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 sm:h-11 sm:w-11">
                <Image
                    src="/aspirant-logo.jpg"
                    alt="aspirantbook"
                    width={44}
                    height={44}
                    className="h-full w-full rounded-full object-contain"
                    priority
                />
            </div>
            <span className="truncate text-lg font-black tracking-tight text-gray-900 sm:text-2xl dark:text-white">
                aspirant<span className="ml-0.5 font-black text-[#F26522]">book</span>
            </span>
        </Link>
    )
}
