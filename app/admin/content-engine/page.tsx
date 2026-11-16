import { auth } from "@/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ContentEngineStudioClient } from "@/components/admin/content-engine/ContentEngineStudioClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Content Engine Studio | Admin Panel",
  description: "Manage questions, multilingual translations, and programmatic content taxonomy",
}

export default async function AdminContentEnginePage() {
  const session = await auth()
  const cookieStore = await cookies()
  const demoRole = cookieStore.get("ts_demo_role")?.value
  const effectiveRole = session?.user?.role || demoRole

  if (effectiveRole !== "ADMIN") {
    redirect("/teacher?error=unauthorized_content_engine")
  }

  const questions = await prisma.contentEngineQuestion.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: {
        select: {
          translations: true,
        },
      },
      override: {
        select: {
          id: true,
          sub: true,
          top: true,
        },
      },
    },
  })

  return (
    <ContentEngineStudioClient
      initialQuestions={JSON.parse(JSON.stringify(questions))}
    />
  )
}
