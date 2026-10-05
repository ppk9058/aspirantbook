import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import { sanitizeReturnPath } from "./lib/utils/return-path"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const userRole = req.auth?.user?.role
    const demoRole = req.cookies.get("ts_demo_role")?.value
    const effectiveRole = userRole || (demoRole ? demoRole : undefined)
    const isAuthenticated = isLoggedIn || Boolean(demoRole)
    const subscriptionStatus = req.auth?.user?.subscriptionStatus

    // Admin & Studios Route Protection
    if (nextUrl.pathname.startsWith("/admin")) {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL("/login", nextUrl))
        }
        
        // Super admin only routes
        const isAdminOnly = nextUrl.pathname.startsWith("/admin/users") ||
                            nextUrl.pathname.startsWith("/admin/audit") ||
                            nextUrl.pathname.startsWith("/admin/settings")
        
        if (isAdminOnly && effectiveRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/teacher", nextUrl))
        }

        // All studio routes (courses, test-series, pyqs, exercises, assessments, batches, dashboard)
        // are open to both TEACHER and ADMIN
        const isAllowed = effectiveRole === "ADMIN" || effectiveRole === "TEACHER"
        if (!isAllowed) {
            return NextResponse.redirect(new URL("/", nextUrl))
        }
    }

    // Teacher Route Protection — TEACHER or ADMIN only
    if (nextUrl.pathname.startsWith("/teacher")) {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL("/login", nextUrl))
        }
        if (effectiveRole !== "TEACHER" && effectiveRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/", nextUrl))
        }
    }

    // Draft / Unpublished Courses Protection (Section 4):
    // Only ADMIN can access draft / unpublished courses (e.g. /courses/ai-course).
    // Non-admin (anonymous, students, enrolled students) receive 404 Not Found.
    const isAiCourse = nextUrl.pathname.startsWith("/courses/ai-course") || nextUrl.pathname.startsWith("/learn/ai-course")
    if (isAiCourse && effectiveRole !== "ADMIN") {
        return new NextResponse(
            `<!DOCTYPE html><html><head><title>404: Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:100px;"><h1>404 • PAGE NOT FOUND</h1><p>The page or resource you requested doesn't exist.</p></body></html>`,
            {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" },
            }
        )
    }

    // Public course details page (/courses/[slug]) is accessible to all students (even unlogged)
    const isCourseDetailsPage =
        nextUrl.pathname.startsWith("/courses/") && !nextUrl.pathname.includes("/learn")

    // Dashboard & Dashboard Menu Routes Protection — requires verified login (Mobile OTP, Google, or Email/Password)
    const isDashboardOrMenuRoute =
        nextUrl.pathname.startsWith("/dashboard") ||
        (nextUrl.pathname.startsWith("/courses") && !isCourseDetailsPage) ||
        nextUrl.pathname.startsWith("/tutorials") ||
        nextUrl.pathname.startsWith("/test-series") ||
        nextUrl.pathname.startsWith("/my-learning") ||
        nextUrl.pathname.startsWith("/books") ||
        nextUrl.pathname.startsWith("/current-affairs-quizzes") ||
        nextUrl.pathname.startsWith("/pyqs") ||
        nextUrl.pathname.startsWith("/practice") ||
        nextUrl.pathname.startsWith("/classroom") ||
        nextUrl.pathname.startsWith("/learn") ||
        nextUrl.pathname.startsWith("/leaderboard") ||
        nextUrl.pathname.startsWith("/profile") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/subscription") ||
        nextUrl.pathname.startsWith("/purchases") ||
        nextUrl.pathname.startsWith("/doubts") ||
        nextUrl.pathname.startsWith("/forms") ||
        nextUrl.pathname.startsWith("/tracks") ||
        nextUrl.pathname.startsWith("/code-along") ||
        nextUrl.pathname.startsWith("/assessments")

    if (isDashboardOrMenuRoute) {
        if (!isAuthenticated) {
            const loginUrl = new URL("/login", nextUrl)
            loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search)
            return NextResponse.redirect(loginUrl)
        }
    }

    // Redirect already authenticated users away from /login or /register
    if (nextUrl.pathname === "/login" || nextUrl.pathname === "/register") {
        if (isLoggedIn) {
            const rawCallback = nextUrl.searchParams.get("callbackUrl") || "/dashboard"
            const callback = sanitizeReturnPath(rawCallback, "/dashboard")
            return NextResponse.redirect(new URL(callback, nextUrl))
        }
    }

    // Premium Content Protection
    if (nextUrl.pathname.includes("/premium-course")) {
        if (subscriptionStatus !== "ACTIVE") {
            return NextResponse.redirect(new URL("/pricing?error=premium_required", nextUrl))
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        "/admin/:path*",
        "/teacher/:path*",
        "/dashboard/:path*",
        "/courses/:path*",
        "/tutorials/:path*",
        "/test-series/:path*",
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
