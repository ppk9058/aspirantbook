import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const nextAuthResult = NextAuth({
    ...authConfig,
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            const now = Date.now()
            if (user) {
                token.id = user.id as string
                token.role = (user as any).role
                token.phoneNumber = (user as any).phoneNumber
                token.subscriptionStatus = (user as any).subscriptionStatus
                token.lastRoleSync = now
            }
            // Sync fresh role and verified subscription from database only on explicit update trigger or periodically (every 5 mins)
            const shouldSyncRole = trigger === "update" || !token.role || (typeof token.lastRoleSync === "number" && now - (token.lastRoleSync as number) > 300_000)
            if (token?.id && shouldSyncRole) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            role: true,
                            phoneNumber: true,
                            subscriptions: {
                                where: {
                                    status: "ACTIVE",
                                    endDate: { gt: new Date() },
                                },
                                take: 1,
                            },
                        }
                    })
                    if (dbUser) {
                        token.role = dbUser.role
                        if (dbUser.phoneNumber) {
                            token.phoneNumber = dbUser.phoneNumber
                        }
                        token.subscriptionStatus = dbUser.subscriptions.length > 0 ? "ACTIVE" : "INACTIVE"
                        token.lastRoleSync = now
                    }
                } catch (err) {
                    console.error("JWT role refresh error:", err)
                }
            }
            if (trigger === "update" && session) {
                token = { ...token, ...session }
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
                ;(session.user as any).phoneNumber = token.phoneNumber
                session.user.subscriptionStatus = token.subscriptionStatus as string | undefined
            }
            return session
        },
    },
    providers: [
        // Standard email + password login
        Credentials({
            id: "credentials",
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials)

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data

                    try {
                        const user = await prisma.user.findUnique({ where: { email } })
                        if (!user || !user.password) return null

                        const passwordsMatch = await bcrypt.compare(password, user.password)
                        if (passwordsMatch) {
                            return {
                                id: user.id,
                                email: user.email,
                                name: user.name,
                                role: user.role,
                                image: user.image,
                            }
                        }
                    } catch (error) {
                        console.error("Authorize database error:", error)
                        return null
                    }
                }

                console.log("Invalid credentials")
                return null
            },
        }),

        // Mobile-only login — dev/test bypass only, strictly disabled in production
        Credentials({
            id: "mobile",
            async authorize(credentials) {
                const isProduction = process.env.NODE_ENV === "production"
                let isLocalTestDb = false
                try {
                    const dbUrl = process.env.DATABASE_URL || ""
                    const parsed = new URL(dbUrl)
                    isLocalTestDb = (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.pathname.endsWith("_test")
                } catch {
                    isLocalTestDb = false
                }
                const isDevBypassEnabled =
                    (!isProduction && process.env.ALLOW_DEV_MOBILE_LOGIN === "true") ||
                    (process.env.APP_ENV === "test" && isLocalTestDb)

                if (!isDevBypassEnabled) {
                    console.warn("[Auth] Dev mobile login bypass is disabled or blocked in production")
                    return null
                }

                const parsed = z
                    .object({ phoneNumber: z.string().regex(/^[0-9]{10}$/) })
                    .safeParse(credentials)

                if (!parsed.success) return null

                const { phoneNumber } = parsed.data
                const syntheticEmail = `mobile_${phoneNumber}@aspirantbook.local`

                try {
                    const user = await prisma.user.findUnique({
                        where: { phoneNumber },
                        select: { id: true, email: true, name: true, role: true, image: true, phoneNumber: true },
                    })

                    if (!user) return null

                    return {
                        id: user.id,
                        email: user.email ?? syntheticEmail,
                        name: user.name,
                        role: user.role,
                        image: user.image,
                        phoneNumber: user.phoneNumber,
                    }
                } catch (error) {
                    console.error("Mobile authorize error:", error)
                    return null
                }
            },
        }),
    ],
})

export const { signIn, signOut, handlers } = nextAuthResult

let mockSessionProvider: (() => any) | null = null

export function setMockSessionProvider(provider: (() => any) | null) {
    mockSessionProvider = provider
}

export const auth: typeof nextAuthResult.auth = ((...args: any[]) => {
    if (mockSessionProvider && args.length === 0) {
        return Promise.resolve(mockSessionProvider())
    }
    return (nextAuthResult.auth as any)(...args)
}) as any
