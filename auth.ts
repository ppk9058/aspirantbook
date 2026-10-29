import { cache } from "react"
import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { authConfig } from "./auth.config"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { checkLoginLockout, recordFailedLoginAttempt, clearLoginLockout } from "@/lib/auth/rate-limiter"

export class LockedOutError extends CredentialsSignin {
    code = "account_locked"
    constructor() {
        super("account_locked")
        this.code = "account_locked"
    }
}

export class DeactivatedError extends CredentialsSignin {
    code = "account_deactivated"
    constructor() {
        super("account_deactivated")
        this.code = "account_deactivated"
    }
}

const isSecureCookie =
    process.env.NODE_ENV === "production" &&
    !process.env.NEXTAUTH_URL?.startsWith("http://") &&
    !process.env.AUTH_URL?.startsWith("http://")

export async function handleGoogleSignInCallback({
    user,
    account,
    profile,
}: {
    user: any
    account: any
    profile?: any
}): Promise<boolean> {
    const isEmailVerified = Boolean(
        profile?.email_verified === true ||
        (profile as any)?.email_verified === "true"
    )
    if (!isEmailVerified || !user.email) {
        console.warn(`[OAuth Security] Google signin rejected: email_verified is false or missing for ${user?.email}`)
        return false // Reject unverified email (prevents account takeover)
    }

    const email = user.email.toLowerCase().trim()
    const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true },
    })

    if (existingUser) {
        if (existingUser.isActive === false) {
            return false
        }
        // Link account if not already linked
        const alreadyLinked = existingUser.accounts.some(
            (acc) => acc.provider === "google" && acc.providerAccountId === account?.providerAccountId
        )
        if (!alreadyLinked && account?.providerAccountId) {
            await prisma.account.create({
                data: {
                    userId: existingUser.id,
                    type: account.type || "oauth",
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                },
            })
        }
        if (!existingUser.emailVerified) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { emailVerified: new Date() },
            })
        }
        user.id = existingUser.id
        ;(user as any).role = existingUser.role
        ;(user as any).sessionVersion = existingUser.sessionVersion
    } else {
        // New user registration via Google
        const newUser = await prisma.user.create({
            data: {
                email,
                name: user.name || (profile as any)?.name || "Student",
                image: user.image || (profile as any)?.picture || null,
                emailVerified: new Date(),
                role: "FREE",
                isActive: true,
                accounts: account?.providerAccountId
                    ? {
                          create: {
                              type: account.type || "oauth",
                              provider: account.provider,
                              providerAccountId: account.providerAccountId,
                              access_token: account.access_token,
                              refresh_token: account.refresh_token,
                              expires_at: account.expires_at,
                              token_type: account.token_type,
                              scope: account.scope,
                              id_token: account.id_token,
                          },
                      }
                    : undefined,
            },
        })
        user.id = newUser.id
        ;(user as any).role = newUser.role
        ;(user as any).sessionVersion = newUser.sessionVersion
    }
    return true
}

const nextAuthResult = NextAuth({
    ...authConfig,
    useSecureCookies: isSecureCookie,
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
        sessionToken: {
            name: isSecureCookie ? "__Secure-authjs.session-token" : "authjs.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: isSecureCookie,
            },
        },
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            const now = Date.now()
            if (user) {
                token.id = user.id as string
                token.role = (user as any).role
                token.phoneNumber = (user as any).phoneNumber
                token.subscriptionStatus = (user as any).role === "PREMIUM" ? "ACTIVE" : ((user as any).subscriptionStatus || "INACTIVE")
                token.sessionVersion = (user as any).sessionVersion ?? 1
                token.emailVerified = (user as any).emailVerified ?? null
                token.lastRoleSync = now
            }
            // Sync role, isActive status, and sessionVersion from database periodically (10s in prod, 200ms in test) or on update trigger
            const syncInterval = process.env.APP_ENV === "test" ? 200 : 10_000
            const shouldSyncRole =
                trigger === "update" ||
                !token.role ||
                !token.sessionVersion ||
                (typeof token.lastRoleSync === "number" && now - (token.lastRoleSync as number) >= syncInterval)

            if (token?.id && shouldSyncRole) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            role: true,
                            phoneNumber: true,
                            isActive: true,
                            sessionVersion: true,
                            emailVerified: true,
                            subscriptions: {
                                where: {
                                    status: "ACTIVE",
                                    endDate: { gt: new Date() },
                                },
                                take: 1,
                            },
                        },
                    })
                    // Invalidate session if user deleted, deactivated, or sessionVersion mismatch (logout all devices)
                    if (
                        !dbUser ||
                        dbUser.isActive === false ||
                        (dbUser.sessionVersion && token.sessionVersion && dbUser.sessionVersion !== token.sessionVersion)
                    ) {
                        return null
                    }

                    token.role = dbUser.role
                    if (dbUser.phoneNumber) {
                        token.phoneNumber = dbUser.phoneNumber
                    }
                    token.subscriptionStatus = dbUser.subscriptions.length > 0 ? "ACTIVE" : "INACTIVE"
                    token.sessionVersion = dbUser.sessionVersion
                    token.emailVerified = dbUser.emailVerified ? dbUser.emailVerified.toISOString() : null
                    token.lastRoleSync = now
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
            if (!token || !token.id) {
                return null as any
            }
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
                ;(session.user as any).phoneNumber = token.phoneNumber
                session.user.subscriptionStatus = token.subscriptionStatus as string | undefined
                session.user.sessionVersion = token.sessionVersion as number | undefined
                ;(session.user as any).emailVerified = token.emailVerified
            }
            return session
        },
        async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                return handleGoogleSignInCallback({ user, account, profile })
            }
            return true
        },
    },
    providers: [
        // Real Google OAuth Provider
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            allowDangerousEmailAccountLinking: false, // Strict: never link blindly
        }),

        // Standard email + password login
        Credentials({
            id: "credentials",
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(1) })
                    .safeParse(credentials)

                if (!parsedCredentials.success) {
                    return null
                }

                const rawEmail = parsedCredentials.data.email
                const email = rawEmail.trim().toLowerCase()
                const password = parsedCredentials.data.password

                let clientIp = "127.0.0.1"
                try {
                    const { headers } = await import("next/headers")
                    const h = await headers()
                    clientIp =
                        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                        h.get("x-real-ip")?.trim() ||
                        "127.0.0.1"
                } catch {
                    clientIp = "127.0.0.1"
                }

                // Check Lockout first
                const lockout = await checkLoginLockout(email, clientIp)
                if (lockout.isLocked) {
                    throw new LockedOutError()
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            image: true,
                            password: true,
                            isActive: true,
                            sessionVersion: true,
                            emailVerified: true,
                        },
                    })

                    // Constant-time failure simulation against email enumeration
                    if (!user || !user.password) {
                        const failStatus = await recordFailedLoginAttempt(email, clientIp)
                        if (failStatus.isLocked) {
                            throw new LockedOutError()
                        }
                        return null
                    }

                    // Check if account is deactivated
                    if (user.isActive === false) {
                        throw new DeactivatedError()
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password)
                    if (!passwordsMatch) {
                        const failStatus = await recordFailedLoginAttempt(email, clientIp)
                        if (failStatus.isLocked) {
                            throw new LockedOutError()
                        }
                        return null
                    }

                    // Login succeeded: reset failed attempts & clear lockout
                    await clearLoginLockout(email, clientIp)

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        image: user.image,
                        sessionVersion: user.sessionVersion,
                        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
                    }
                } catch (error) {
                    if (
                        error &&
                        (error instanceof CredentialsSignin ||
                            (error as any).code ||
                            (error as any).name === "LockedOutError" ||
                            (error as any).name === "DeactivatedError")
                    ) {
                        throw error
                    }
                    console.error("Authorize database error:", error)
                    return null
                }
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
                        select: { id: true, email: true, name: true, role: true, image: true, phoneNumber: true, sessionVersion: true },
                    })

                    if (!user) return null

                    return {
                        id: user.id,
                        email: user.email ?? syntheticEmail,
                        name: user.name,
                        role: user.role,
                        image: user.image,
                        phoneNumber: user.phoneNumber,
                        sessionVersion: user.sessionVersion,
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

export const auth: typeof nextAuthResult.auth = cache(((...args: any[]) => {
    if (mockSessionProvider && args.length === 0) {
        return Promise.resolve(mockSessionProvider())
    }
    return (nextAuthResult.auth as any)(...args)
})) as any
