import { prisma } from "@/lib/prisma"
import { ensureDefaultPyqData, getAllPapers } from "@/lib/pyqs-service"
import { PyqStudentListingClient } from "@/components/pyqs/PyqStudentListingClient"
import { BookOpen, Sparkles, ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Previous Year Question Papers (PYQs) | TrillionSkill",
  description: "Download and practice verified previous year examination papers for BPSC, UPSC, NCERT, and State Boards with answer keys and CBT simulations.",
}

export default async function PreviousYearQuestionsPage() {
  await ensureDefaultPyqData()

  const [categories, papers] = await Promise.all([
    prisma.pyqCategory.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        badgeColor: true,
        _count: { select: { papers: true } },
      },
    }),
    getAllPapers({ includeAllStatuses: false }), // PUBLISHED only
  ])

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Official Question Papers & CBT Simulations
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Previous Year Question Papers (PYQs)
          </h1>
          <p className="text-sm text-orange-100 leading-relaxed">
            Access authentic previous year papers with official answer keys, detailed solutions, and real-time Computer Based Test (CBT) practice.
          </p>
        </div>

        <div className="absolute right-6 -bottom-6 opacity-10 pointer-events-none hidden md:block">
          <BookOpen className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Main Student Listing Client */}
      <PyqStudentListingClient
        initialPapers={papers as any}
        categories={categories as any}
      />
    </div>
  )
}
