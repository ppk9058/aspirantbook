"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { CheckCircle2, X } from "lucide-react"

export function AuthwallUnlockToast() {
  const { data: session, status } = useSession()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || status === "loading") return

    try {
      const returnUrl = sessionStorage.getItem("authwall_return_url") || sessionStorage.getItem("authwall_scroll_pos")
      const scrollY = sessionStorage.getItem("authwall_scroll_y") || sessionStorage.getItem("authwall_scroll_pos")
      const rawTimestamp = sessionStorage.getItem("authwall_timestamp")

      // If user is NOT authenticated (e.g. guest pressed Back from login/register):
      if (status !== "authenticated" || !session?.user?.id) {
        // Silently clear keys so toast never fires falsely
        if (returnUrl || scrollY) {
          sessionStorage.removeItem("authwall_return_url")
          sessionStorage.removeItem("authwall_scroll_y")
          sessionStorage.removeItem("authwall_scroll_pos")
          sessionStorage.removeItem("authwall_gated_module")
          sessionStorage.removeItem("authwall_timestamp")
        }
        return
      }

      // Check key expiry (10 minutes)
      if (rawTimestamp) {
        const storedTime = Number(rawTimestamp)
        if (!isNaN(storedTime) && Date.now() - storedTime > 10 * 60 * 1000) {
          sessionStorage.removeItem("authwall_return_url")
          sessionStorage.removeItem("authwall_scroll_y")
          sessionStorage.removeItem("authwall_scroll_pos")
          sessionStorage.removeItem("authwall_gated_module")
          sessionStorage.removeItem("authwall_timestamp")
          return
        }
      }

      if (returnUrl || scrollY) {
        // Clear stored keys immediately so toast fires exactly once
        sessionStorage.removeItem("authwall_return_url")
        sessionStorage.removeItem("authwall_scroll_y")
        sessionStorage.removeItem("authwall_scroll_pos")
        sessionStorage.removeItem("authwall_gated_module")
        sessionStorage.removeItem("authwall_timestamp")

        // Restore scroll position smoothly
        if (scrollY && !isNaN(Number(scrollY))) {
          setTimeout(() => {
            window.scrollTo({
              top: Number(scrollY),
              behavior: "smooth",
            })
          }, 150)
        }

        setToastMessage("Welcome back! Full content unlocked.")
        const timer = setTimeout(() => {
          setToastMessage(null)
        }, 5000)
        return () => clearTimeout(timer)
      }
    } catch {
      // Safe storage access fallback
    }
  }, [status, session?.user?.id])

  if (!toastMessage) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xl border border-gray-800 dark:border-gray-200 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
      <span>{toastMessage}</span>
      <button
        onClick={() => setToastMessage(null)}
        className="ml-2 p-1 text-gray-400 hover:text-white dark:hover:text-gray-900 rounded-lg"
        aria-label="Dismiss toast"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
