import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPlatformSettings, getSystemDiagnostics } from "@/lib/actions/admin/settings"
import { SettingsClient } from "./SettingsClient"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
    const session = await auth()

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        redirect("/")
    }

    const [settings, diagnostics] = await Promise.all([
        getPlatformSettings(),
        getSystemDiagnostics(),
    ])

    return (
        <div className="min-h-screen bg-[#FFFDF9] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <SettingsClient
                    initialSettings={settings}
                    diagnostics={diagnostics}
                    isAdmin={session.user.role === "ADMIN"}
                />
            </div>
        </div>
    )
}
