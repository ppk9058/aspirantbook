import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CurrentAffairsStudioClient } from "@/components/admin/current-affairs/CurrentAffairsStudioClient"

export const dynamic = "force-dynamic"

export default async function AdminCurrentAffairsPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
    redirect("/auth/signin")
  }

  const role = session.user.role
  const userId = session.user.id

  const where: any = {
    status: { not: "ARCHIVED" },
  }

  if (role === "TEACHER") {
    where.createdById = userId
  }

  const items = await prisma.currentAffairsPdf.findMany({
    where,
    orderBy: [
      { year: "desc" },
      { month: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const basePath = role === "TEACHER" ? "/teacher" : "/admin"

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <CurrentAffairsStudioClient
        initialItems={JSON.parse(JSON.stringify(items))}
        basePath={basePath}
        userRole={role}
        userId={userId}
      />
    </div>
  )
}
