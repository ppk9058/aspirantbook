"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import MobileDrawer from "@/components/layout/MobileDrawer"

/**
 * Landing-page hamburger (below lg only).
 *
 * It reuses the dashboard drawer (`components/layout/MobileDrawer`) instead of
 * adding a second navigation surface. MobileDrawer already renders public
 * destinations for a logged-out visitor and a "Get Started" CTA, so the landing
 * page needs no extra state or duplicated link list.
 */
export default function LandingMobileNav() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                data-testid="landing-mobile-menu-btn"
                onClick={() => setIsOpen(true)}
                aria-label="Open navigation menu"
                className="-ml-2 flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 active:scale-95 dark:text-gray-200 dark:hover:bg-gray-800 lg:hidden"
            >
                <Menu className="h-5 w-5" />
            </button>

            <MobileDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}
