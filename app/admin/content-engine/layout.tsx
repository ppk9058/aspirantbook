import { redirect } from "next/navigation"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export default async function ContentEngineAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUserContext()

  // In production, ts_demo_role cookie fallback is strictly forbidden
  const isProd = process.env.NODE_ENV === "production"
  if (isProd && user.userId?.startsWith("demo-")) {
    redirect("/login")
  }

  if (!user.isAuthenticated) {
    redirect("/login")
  }

  if (user.role !== "ADMIN") {
    redirect(user.role === "TEACHER" ? "/teacher" : "/")
  }

  return <>{children}</>
}
