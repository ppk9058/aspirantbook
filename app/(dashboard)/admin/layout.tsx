import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    const cookieStore = await cookies()
    const demoRole = cookieStore.get("ts_demo_role")?.value
    const effectiveRole = session?.user?.role || demoRole

    // Block non-admin users (Teachers redirected to /teacher, others to /)
    if (effectiveRole === "TEACHER") {
        redirect("/teacher")
    }
    if (!effectiveRole || effectiveRole !== "ADMIN") {
        redirect("/")
    }

    return <>{children}</>
}
