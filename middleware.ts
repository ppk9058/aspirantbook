import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import { sanitizeReturnPath } from "./lib/utils/return-path"
import { isTeacherAllowedAdminPath } from "./lib/auth/roles"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const userRole = req.auth?.user?.role
    const demoRole = req.cookies.get("ts_demo_role")?.value
    const effectiveRole = userRole || (demoRole ? demoRole : undefined)
    const isAuthenticated = isLoggedIn || Boolean(demoRole)
    const subscriptionStatus = req.auth?.user?.subscriptionStatus

    // Determine actual request origin from incoming request headers (prefer host header to preserve 127.0.0.1 vs localhost)
    const reqHost = req.headers.get("host") || req.headers.get("x-forwarded-host") || nextUrl.host
    const reqProto = req.headers.get("x-forwarded-proto") || (nextUrl.protocol.replace(":", "") || "http")
    const reqOrigin = `${reqProto}://${reqHost}`

    if (reqHost && nextUrl.host !== reqHost) {
        try {
            nextUrl.host = reqHost
        } catch {}
    }

    const toRequestUrl = (path: string) => {
        return new URL(path, reqOrigin)
    }

    // Admin APIs Protection — ADMIN or allowed TEACHER studios
    if (nextUrl.pathname.startsWith("/api/admin")) {
        if (!isAuthenticated) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (effectiveRole === "TEACHER") {
            if (!isTeacherAllowedAdminPath(nextUrl.pathname)) {
                return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
            }
        } else if (effectiveRole !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }
    }

    // Admin & Studios Route Protection — All non-studio /admin/* blocked for TEACHER (redirect to /teacher)
    if (nextUrl.pathname.startsWith("/admin")) {
        if (!isAuthenticated) {
            return NextResponse.redirect(toRequestUrl("/login"))
        }

        if (effectiveRole === "TEACHER") {
            if (!isTeacherAllowedAdminPath(nextUrl.pathname)) {
                return NextResponse.redirect(toRequestUrl("/teacher"))
            }
        } else if (effectiveRole !== "ADMIN") {
            return NextResponse.redirect(toRequestUrl("/"))
        }
    }

    // Teacher Route Protection — TEACHER or ADMIN only
    if (nextUrl.pathname.startsWith("/teacher")) {
        if (!isAuthenticated) {
            return NextResponse.redirect(toRequestUrl("/login"))
        }
        if (effectiveRole !== "TEACHER" && effectiveRole !== "ADMIN") {
            return NextResponse.redirect(toRequestUrl("/"))
        }
    }


    // Private routes requiring authentication:
    // /profile, /settings, /subscription, /purchases,
    // /classroom, /learn (actual video player), /assessments (private tests/attempts),
    // /doubts (private doubt center), /forms, /tracks, /code-along, /leaderboard
    const isPrivateRoute =
        nextUrl.pathname.startsWith("/profile") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/subscription") ||
        nextUrl.pathname.startsWith("/purchases") ||
        nextUrl.pathname.startsWith("/classroom") ||
        nextUrl.pathname.startsWith("/learn") ||
        nextUrl.pathname.includes("/learn/") ||
        nextUrl.pathname.startsWith("/assessments") ||
        nextUrl.pathname.startsWith("/doubts") ||
        nextUrl.pathname.startsWith("/forms") ||
        nextUrl.pathname.startsWith("/tracks") ||
        nextUrl.pathname.startsWith("/code-along") ||
        nextUrl.pathname.startsWith("/leaderboard")

    if (isPrivateRoute) {
        if (!isAuthenticated) {
            const loginUrl = toRequestUrl("/login")
            const safeCb = sanitizeReturnPath(nextUrl.pathname + nextUrl.search, "/dashboard")
            loginUrl.searchParams.set("callbackUrl", safeCb)
            return NextResponse.redirect(loginUrl)
        }
    }

    // Redirect already authenticated users away from /login or /register
    if (nextUrl.pathname === "/login" || nextUrl.pathname === "/register") {
        if (isLoggedIn) {
            const rawCallback = nextUrl.searchParams.get("callbackUrl") || "/dashboard"
            const callback = sanitizeReturnPath(rawCallback, "/dashboard")
            return NextResponse.redirect(toRequestUrl(callback))
        }
    }

    // Premium Content Protection
    if (nextUrl.pathname.includes("/premium-course")) {
        if (subscriptionStatus !== "ACTIVE") {
            return NextResponse.redirect(toRequestUrl("/pricing?error=premium_required"))
        }
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-pathname", nextUrl.pathname)
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
})

export const config = {
    matcher: [
        "/admin/:path*",
        "/api/admin/:path*",
        "/teacher/:path*",
        "/dashboard/:path*",
        "/courses/:path*",
        "/tutorials/:path*",
        "/test-series/:path*",
        "/my-tests/:path*",
        "/my-learning/:path*",
        "/books/:path*",
        "/current-affairs-quizzes/:path*",
        "/pyqs/:path*",
        "/practice/:path*",
        "/classroom/:path*",
        "/learn/:path*",
        "/leaderboard/:path*",
        "/profile/:path*",
        "/settings/:path*",
        "/subscription/:path*",
        "/purchases/:path*",
        "/doubts/:path*",
        "/forms/:path*",
        "/tracks/:path*",
        "/code-along/:path*",
        "/assessments/:path*",
        "/premium-course/:path*",
        "/login",
        "/register",
    ],
}
