import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { aiConfig } from "@/lib/ai/config"
import { AiBatchStudioClient } from "@/components/admin/ai/AiBatchStudioClient"

export const dynamic = "force-dynamic"

export default async function AdminAiBatchPage() {
  await requireRole("ADMIN")

  const [jobs, examSections, currentAffairsCount] = await Promise.all([
    prisma.aiBatchJob.findMany({
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.examSection.findMany({
      include: {
        test: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      take: 30,
      orderBy: { order: "asc" },
    }),
    prisma.currentAffairsPdf.count(),
  ])

  const providersConfigured = (
    ["gemini", "groq", "cerebras", "mistral", "openrouter"] as const
  ).filter((p) => !!aiConfig.providers[p].apiKey)

  return (
    <AiBatchStudioClient
      jobs={jobs}
      examSections={examSections}
      currentAffairsCount={currentAffairsCount}
      aiEnabled={aiConfig.isEnabled}
      killSwitchActive={aiConfig.isKillSwitchActive}
      providersConfigured={providersConfigured}
    />
  )
}
