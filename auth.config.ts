import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    trustHost: true,
    pages: {
        signIn: "/login",
        newUser: "/register",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            // Authorized callback returns true here; fine-grained route gating and redirect
            // origin preservation is enforced by our outer auth wrapper in middleware.ts
            return true
        },
        redirect({ url, baseUrl }) {
            if (url.startsWith("/")) return `${baseUrl}${url}`
            try {
                const u = new URL(url)
                const b = new URL(baseUrl)
                if (
                    u.origin === baseUrl ||
                    ((u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
                     (b.hostname === "127.0.0.1" || b.hostname === "localhost") &&
                     u.port === b.port)
                ) {
                    return url
                }
            } catch {}
            return baseUrl
        },
        jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id as string
                token.role = user.role
                token.subscriptionStatus = user.subscriptionStatus
            }

            // Update token if session is updated (e.g. after payment)
            if (trigger === "update" && session) {
                token = { ...token, ...session }
            }

            return token
        },
        session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
                session.user.subscriptionStatus = token.subscriptionStatus as string | undefined
            }
            return session
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
