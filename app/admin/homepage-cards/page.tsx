import { HomePageCardStudioClient } from "@/components/admin/homepage-cards/HomePageCardStudioClient"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminHomePageCardsPage() {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }

    return <HomePageCardStudioClient />
}
