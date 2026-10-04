import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    trustHost: true,
    pages: {
        signIn: "/login",
        newUser: "/register",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/learn")
            const isOnAdmin = nextUrl.pathname.startsWith("/admin")
            const isOnTeacher = nextUrl.pathname.startsWith("/teacher")

            if (isOnAdmin) {
                if (isLoggedIn && (auth?.user?.role === "ADMIN" || (auth?.user?.role === "TEACHER" && nextUrl.pathname.startsWith("/admin/pyqs")))) return true
                return false // Redirect to login or 403
            }

            if (isOnTeacher) {
                if (isLoggedIn && (auth?.user?.role === "TEACHER" || auth?.user?.role === "ADMIN")) return true
                return false // Only TEACHER and ADMIN can access teacher routes
            }

            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            }

            return true
        },
        redirect({ url, baseUrl }) {
            if (url.startsWith("/")) return `${baseUrl}${url}`
            else if (new URL(url).origin === baseUrl) return url
            return baseUrl
        },
        jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
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
