"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import MobileDrawer from "@/components/layout/MobileDrawer"
/**
 * Landing-page hamburger (below lg only).
 *
 * It reuses the dashboard drawer (`components/layout/MobileDrawer`) instead of
 * adding a second navigation surface.
 *
 * Renders the drawer through a React portal into document.body so that the
 * drawer's `fixed inset-0` layout is sized against the viewport rather than
 * being constrained by `<header>`'s backdrop-filter containing block.
 *
 * Handles body scroll lock, Escape key, backdrop tap, and auto-close on route change.
 */
export default function LandingMobileNav() {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const pathname = usePathname()
    useEffect(() => {
        setMounted(true)
    }, [])
    // Body scroll lock while drawer is open
    useEffect(() => {
        if (!isOpen) return
        const originalOverflow = document.body.style.overflow
        const originalPaddingRight = document.body.style.paddingRight
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
        document.body.style.overflow = "hidden"
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`
        }
        return () => {
            document.body.style.overflow = originalOverflow
            document.body.style.paddingRight = originalPaddingRight
        }
    }, [isOpen])
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleClose()
            }
        }
        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [isOpen])
    // Close on route change
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])
    const handleClose = () => {
        setIsOpen(false)
        // Return focus to trigger button
        setTimeout(() => {
            triggerRef.current?.focus()
        }, 50)
    }
    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                data-testid="landing-mobile-menu-btn"
                onClick={() => setIsOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
                className="-ml-2 flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 active:scale-95 dark:text-gray-200 dark:hover:bg-gray-800 lg:hidden"
            >
                <Menu className="h-5 w-5" />
            </button>
            {mounted && isOpen && typeof document !== "undefined"
                ? createPortal(
                    <MobileDrawer isOpen={isOpen} onClose={handleClose} />,
                    document.body
                  )
                : null}
        </>
    )
}
