import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin/AdminNav"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { cookies, headers } from "next/headers"
import { isTeacherAllowedAdminPath } from "@/lib/auth/roles"

export default async function AdminLayout({
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

    // Redirect non-admin users (Teachers get redirected to /teacher unless allowed studio, Students/guests to /)
    if (effectiveRole === "TEACHER") {
        if (!isTeacherAllowedAdminPath(pathname)) {
            redirect("/teacher")
        }
    } else if (!effectiveRole || effectiveRole !== "ADMIN") {
        redirect("/")
    }

    const effectiveUser = {
        name: session?.user?.name || (effectiveRole === "TEACHER" ? "Teacher" : "Admin Authority"),
        email: session?.user?.email || (effectiveRole === "TEACHER" ? "teacher@aspirantbook.com" : "admin@aspirantbook.com"),
        role: effectiveRole,
        image: session?.user?.image,
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <AdminNav user={effectiveUser} />
            <div className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden min-w-0">
                <AdminHeader user={effectiveUser} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
