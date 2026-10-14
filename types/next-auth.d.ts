import { type DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
            subscriptionStatus?: string
            sessionVersion?: number
        } & DefaultSession["user"]
    }

    interface User {
        role: "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
        subscriptionStatus?: string
        sessionVersion?: number
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
        subscriptionStatus?: string
        sessionVersion?: number
        lastRoleSync?: number
    }
}
