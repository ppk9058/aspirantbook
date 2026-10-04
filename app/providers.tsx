"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { GoalProvider } from "@/components/providers/GoalProvider"
import { MobileAuthProvider } from "@/components/auth/MobileAuthContext"
import MobileAuthModal from "@/components/auth/MobileAuthModal"

import type { Session } from "next-auth"

export function Providers({
    children,
    session,
}: {
    children: React.ReactNode
    session?: Session | null
}) {
    return (
        <SessionProvider
            basePath="/api/auth"
            session={session}
            refetchOnWindowFocus={false}
            refetchInterval={0}
            refetchWhenOffline={false}
        >
            <ThemeProvider>
                <GoalProvider>
                    <MobileAuthProvider>
                        {children}
                        <MobileAuthModal />
                    </MobileAuthProvider>
                </GoalProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}

