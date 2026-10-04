import { type DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
            subscriptionStatus?: string
        } & DefaultSession["user"]
    }

    interface User {
        role: "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
        subscriptionStatus?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: "FREE" | "PREMIUM" | "TEACHER" | "ADMIN"
        subscriptionStatus?: string
    }
}
