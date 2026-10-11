import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { isTeacherAllowedAdminPath } from "@/lib/auth/roles"

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    const cookieStore = await cookies()
    const headerList = await headers()
    const demoRole = cookieStore.get("ts_demo_role")?.value
    const effectiveRole = session?.user?.role || demoRole
    const pathname = headerList.get("x-pathname") || ""

    // Block non-admin users (Teachers redirected to /teacher unless allowed studio, others to /)
    if (effectiveRole === "TEACHER") {
        if (!isTeacherAllowedAdminPath(pathname)) {
            redirect("/teacher")
        }
    } else if (!effectiveRole || effectiveRole !== "ADMIN") {
        redirect("/")
    }

    return <>{children}</>
}
