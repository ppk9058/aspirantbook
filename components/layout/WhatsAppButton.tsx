"use client"

import { usePathname } from "next/navigation"

/**
 * WhatsApp support launcher.
 *
 * Replaces the old floating "AI assistant" button. It is a plain deep link, so
 * there is no fake chat state and no network call of our own: tapping it opens
 * WhatsApp with the message pre-filled for the support number.
 *
 * Position and layering are unchanged from the button it replaced, so the shared
 * bottom clearance in DashboardShell still keeps it clear of the tab bar.
 */
export const SUPPORT_WHATSAPP_NUMBER = "8340665934"
const SUPPORT_WHATSAPP_E164 = `91${SUPPORT_WHATSAPP_NUMBER}`
const DEFAULT_MESSAGE = "Hi AspirantBook team, I need help with my preparation."

export function whatsappSupportHref(message: string = DEFAULT_MESSAGE): string {
    return `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`
}

export function WhatsAppButton() {
    const pathname = usePathname()

    // Hide on full-screen examination flows, exactly like the button it replaced.
    const isHiddenFlow = Boolean(
        pathname && (
            pathname.includes("/attempt") ||
            pathname.includes("/result") ||
            pathname.includes("/solutions") ||
            pathname.includes("/declaration") ||
            pathname.includes("/instructions") ||
            pathname.includes("/take") ||
            pathname.startsWith("/test-execution")
        )
    )

    // Pages with their own sticky action bar keep it out of the way on phones.
    const isStickyBarPage = Boolean(
        pathname &&
        pathname.startsWith("/test-series/") &&
        !pathname.includes("/my-tests") &&
        !pathname.includes("/leaderboard")
    )

    if (isHiddenFlow) {
        return null
    }

    return (
        <a
            href={whatsappSupportHref()}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="whatsapp-fab"
            aria-label={`Chat with AspirantBook support on WhatsApp (${SUPPORT_WHATSAPP_NUMBER})`}
            className={`fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-3 sm:right-5 z-40 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1EBE5A] hover:shadow-xl items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366] ${
                isStickyBarPage ? "hidden sm:flex" : "flex"
            }`}
        >
            <WhatsAppGlyph className="h-5 w-5 sm:h-6 sm:w-6" />
        </a>
    )
}

/** WhatsApp brand glyph (inline so no extra dependency is added). */
function WhatsAppGlyph({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.9 11.9 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.894 0-3.176-1.24-6.165-3.48-8.452zM12.05 21.785h-.005a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.976 1.005-3.641-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.456-9.885 9.932-9.885 2.652 0 5.145 1.036 7.019 2.911a9.83 9.83 0 0 1 2.905 6.987c-.003 5.45-4.457 9.878-9.978 9.878z" />
        </svg>
    )
}
