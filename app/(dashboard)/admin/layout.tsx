import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { isTeacherAllowedAdminPath } from "@/lib/auth/roles"
import { getDemoRole } from "@/lib/auth/demo-role"

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    const cookieStore = await cookies()
    const headerList = await headers()
    const demoRole = getDemoRole(cookieStore)
    const effectiveRole = session?.user?.role || demoRole
    const pathname = headerList.get("x-pathname") || ""

    // Block non-admin users (Teachers redirected to matching /teacher studio if allowed, else /teacher; others to /)
    if (effectiveRole === "TEACHER") {
        if (isTeacherAllowedAdminPath(pathname)) {
            redirect(pathname.replace(/^\/admin/, "/teacher"))
        }
        redirect("/teacher")
    } else if (!effectiveRole || effectiveRole !== "ADMIN") {
        redirect("/")
    }

    return <>{children}</>
}
