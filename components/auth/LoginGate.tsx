"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { LogIn } from "lucide-react"

interface LoginGateProps {
    children: React.ReactNode
    fallback?: React.ReactNode
    message?: string
    actionLabel?: string
    callbackUrl?: string
    variant?: "banner" | "card" | "inline"
}

export function LoginGate({
    children,
    fallback,
    message = "To access this section, please login with your mobile number.",
    actionLabel = "Login with Mobile",
    callbackUrl,
    variant = "card",
}: LoginGateProps) {
    const { data: session, status } = useSession()
    const { openMobileAuth } = useMobileAuth()

    if (status === "loading") {
        return (
            <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl h-32 w-full flex items-center justify-center">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        )
    }

    if (session?.user) {
        return <>{children}</>
    }

    if (fallback) {
        return <>{fallback}</>
    }

    const handleLoginClick = () => {
        const returnUrl = callbackUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard")
        openMobileAuth({
            actionType: "login",
            callbackUrl: returnUrl,
        })
    }

    if (variant === "inline") {
        return (
            <button
                type="button"
                onClick={handleLoginClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
                <LogIn className="w-4 h-4" />
                {actionLabel}
            </button>
        )
    }

    if (variant === "banner") {
        return (
            <div className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sign in to continue</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</p>
                </div>
                <button
                    type="button"
                    onClick={handleLoginClick}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg shrink-0"
                >
                    <LogIn className="w-4 h-4" />
                    {actionLabel}
                </button>
            </div>
        )
    }

    return (
        <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center max-w-md mx-auto my-8 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                <LogIn className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Login Required</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <button
                type="button"
                onClick={handleLoginClick}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg"
            >
                <LogIn className="w-4 h-4" />
                {actionLabel}
            </button>
        </div>
    )
}

export function useLoginGate() {
    const { data: session, status } = useSession()
    const { openMobileAuth } = useMobileAuth()

    const requireLogin = (actionCallback?: () => void, callbackUrl?: string) => {
        if (session?.user) {
            actionCallback?.()
            return true
        }
        const returnUrl = callbackUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard")
        openMobileAuth({
            actionType: "login",
            callbackUrl: returnUrl,
        })
        return false
    }

    return {
        isAuthenticated: !!session?.user,
        isLoading: status === "loading",
        requireLogin,
    }
}
