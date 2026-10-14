import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SettingsClient from "./SettingsClient"

export default async function SettingsPage() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/settings")
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            selectedGoal: true,
            image: true,
            role: true,
            sessionVersion: true,
        },
    })

    if (!user) {
        redirect("/login")
    }

    return <SettingsClient user={user} />
}
