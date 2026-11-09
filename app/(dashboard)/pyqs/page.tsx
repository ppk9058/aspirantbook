import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { ensureDefaultPyqData, getAllPapers } from "@/lib/pyqs-service"
import { PyqStudentListingClient } from "@/components/pyqs/PyqStudentListingClient"
import { BookOpen, Sparkles, ShieldCheck, FileText, Zap } from "lucide-react"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { getStudentGoals } from "@/lib/goals/student-goals"
import { applyPyqGoalFilter } from "@/lib/goals/goal-filters"

import { adaptPyqsCatalogSeo } from "@/lib/seo/adapters/pyqs"
import { hasActivePass, isPaperPaid } from "@/lib/pyqs/pyq-access"

export const dynamic = "force-dynamic"

export const metadata = adaptPyqsCatalogSeo().metadata

async function fetchPyqCatalog(sortedGoalsStr: string) {
  const goalIds = sortedGoalsStr ? sortedGoalsStr.split(",").filter(Boolean) : []
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

  const filteredPapers = goalIds.length > 0 ? applyPyqGoalFilter(papers, goalIds) : papers
  const filteredCategories = goalIds.length > 0
    ? categories.filter((cat) => {
        const text = `${cat.name} ${cat.slug}`.toLowerCase()
        return goalIds.some((gid) => {
          const norm = gid.toLowerCase()
          if (norm === "upsc") return text.includes("upsc") && !text.includes("bpsc") && !text.includes("bihar")
          if (norm === "bpsc") return text.includes("bpsc") || text.includes("bihar")
          if (norm === "ssc") return text.includes("ssc") || text.includes("cgl")
          return text.includes(norm)
        })
      })
    : categories

  return {
    papers: filteredPapers,
    categories: filteredCategories,
  }
}

const getCachedPyqCatalog = unstable_cache(
  fetchPyqCatalog,
  ["pyqs-catalog-v1"],
  { revalidate: 60, tags: ["pyqs"] }
)

const getPyqCatalog =
  process.env.APP_ENV === "test" ? fetchPyqCatalog : getCachedPyqCatalog

export default async function PreviousYearQuestionsPage() {
  const session = await auth()
  const cookieStore = await cookies()
  const cookieGoal = cookieStore.get("trillion_selected_goal")?.value || null
  const { goalIds } = await getStudentGoals(session?.user?.id, cookieGoal)
  const sortedGoalsStr = [...goalIds].sort().join(",")

  const { papers: filteredPapers, categories: filteredCategories } = await getPyqCatalog(sortedGoalsStr)

  const user = session?.user
  const isAdmin = user?.role === "ADMIN"
  const passActive = user?.id ? await hasActivePass(user.id) : false
  const userUnlocks = user?.id && filteredPapers.some((p: any) => isPaperPaid(p.accessType))
    ? new Set(
        (
          await prisma.pyqUnlock.findMany({
            where: {
              userId: user.id,
              paperId: { in: filteredPapers.map((p: any) => p.id) },
            },
            select: { paperId: true },
          })
        ).map((u) => u.paperId)
      )
    : new Set<string>()

  const sanitizedPapers = filteredPapers.map((paper: any) => {
    const isOwner = Boolean(user && user.role === "TEACHER" && paper.creatorId === user.id)
    const isPrivileged = isAdmin || isOwner
    const isPaid = isPaperPaid(paper.accessType)
    const canAccess = !isPaid || isPrivileged || passActive || userUnlocks.has(paper.id)

    return {
      ...paper,
      canAccess,
      // Strip raw storage URLs for non-privileged viewers to prevent payload leaks
      paperPdfUrl: isPrivileged ? paper.paperPdfUrl : "",
      solutionPdfUrl: isPrivileged ? paper.solutionPdfUrl : null,
    }
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner - Rich Composition */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 p-6 sm:p-8 lg:p-10 text-white border border-blue-900/40 shadow-xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Official Question Papers &amp; CBT Simulations
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Previous Year Question Papers
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-2xl font-normal">
              Access verified past exam papers with official answer keys, step-by-step solutions, and computer-based test (CBT) practice mode.
            </p>
            {/* Feature Highlights Row */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-blue-200/90 font-medium">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                100% Authentic Papers
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Detailed Solutions
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                CBT Practice Ready
              </span>
            </div>
          </div>

          {/* Side Feature Highlight Card */}
          <div className="hidden lg:flex lg:col-span-4 justify-end">
            <div className="w-full max-w-xs rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur-md shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-200 uppercase tracking-wider">
                <span>Catalogue Highlights</span>
                <BookOpen className="w-4 h-4 text-blue-300" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-blue-100">Exam Categories</span>
                  <span className="font-bold text-white">{filteredCategories.length}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-blue-100">Total Papers</span>
                  <span className="font-bold text-white">{filteredPapers.length}</span>
                </div>
              </div>
              <p className="text-[11px] text-blue-200/70 leading-normal">
                Curated and syllabus-mapped for competitive exam preparation.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute right-6 -bottom-6 opacity-5 pointer-events-none hidden md:block">
          <BookOpen className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* Main Student Listing Client */}
      <PyqStudentListingClient
        initialPapers={sanitizedPapers as any}
        categories={filteredCategories as any}
        isAuthenticated={Boolean(user)}
      />
    </div>
  )
}
