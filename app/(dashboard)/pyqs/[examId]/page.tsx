import { prisma } from "@/lib/prisma"
import { safeJsonLdStringify } from "@/lib/seo/core"
import { ensureDefaultPyqData, getAllPapers } from "@/lib/pyqs-service"
import { PyqStudentListingClient } from "@/components/pyqs/PyqStudentListingClient"
import Link from "next/link"
import { ArrowLeft, BookOpen, AlertCircle, Sparkles, Layers } from "lucide-react"
import { auth } from "@/auth"
import { hasActivePass, isPaperPaid } from "@/lib/pyqs/pyq-access"

import { Metadata } from "next"
import { adaptPyqCategorySeo } from "@/lib/seo/adapters/pyqs"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string }>
}): Promise<Metadata> {
  const { examId } = await params
  const category = await prisma.pyqCategory.findFirst({
    where: {
      OR: [
        { slug: examId.toLowerCase() },
        { id: examId },
        { name: { equals: examId, mode: "insensitive" } },
      ],
    },
    select: { name: true, slug: true, description: true, isPublished: true },
  })

  if (!category) {
    return {
      title: "Exam Category Not Found | AspirantBook",
    }
  }

  return adaptPyqCategorySeo(category).metadata
}

export default async function ExamCategoryDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  await ensureDefaultPyqData()
  const { examId } = await params

  // Find category by slug or id
  const category = await prisma.pyqCategory.findFirst({
    where: {
      OR: [
        { slug: examId.toLowerCase() },
        { id: examId },
        { name: { equals: examId, mode: "insensitive" } },
      ],
    },
    include: {
      subExams: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-card border border-border text-card-foreground rounded-3xl p-8 max-w-lg mx-auto shadow-sm">
          <div className="p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl w-14 h-14 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Exam Category Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
            We couldn't find the requested examination category. It may have been archived or moved.
          </p>
          <Link
            href="/pyqs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Previous Year Papers
          </Link>
        </div>
      </div>
    )
  }

  // Fetch real published papers for this category
  const papers = await getAllPapers({
    categoryId: category.id,
    includeAllStatuses: false,
  })

  const session = await auth()
  const user = session?.user
  const isAdmin = user?.role === "ADMIN"
  const passActive = user?.id ? await hasActivePass(user.id) : false
  const userUnlocks = user?.id && papers.some((p: any) => isPaperPaid(p.accessType))
    ? new Set(
        (
          await prisma.pyqUnlock.findMany({
            where: {
              userId: user.id,
              paperId: { in: papers.map((p: any) => p.id) },
            },
            select: { paperId: true },
          })
        ).map((u) => u.paperId)
      )
    : new Set<string>()

  const sanitizedPapers = papers.map((paper: any) => {
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

  const seo = adaptPyqCategorySeo(category)

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {seo.jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdStringify(Array.isArray(seo.jsonLd) ? seo.jsonLd[0] : seo.jsonLd),
          }}
        />
      )}
      {/* Navigation Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link href="/pyqs" className="hover:text-primary transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1.5 py-0.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All PYQs</span>
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-semibold px-1 py-0.5 rounded-md bg-muted/60">{category.name}</span>
      </nav>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 p-6 sm:p-8 lg:p-10 text-white border border-blue-900/40 shadow-xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              {category.name} Official Past Papers
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {category.fullName || `${category.name} Previous Year Papers`}
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-2xl font-normal">
              {category.description || `Browse authentic official papers for ${category.name} with answer keys, solutions, and CBT mock practice.`}
            </p>
          </div>

          <div className="hidden lg:flex lg:col-span-4 justify-end">
            <div className="w-full max-w-xs rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur-md shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-200 uppercase tracking-wider">
                <span>Category Overview</span>
                <BookOpen className="w-4 h-4 text-blue-300" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs">
                <span className="text-blue-100">Papers Available</span>
                <span className="font-bold text-white">{papers.length}</span>
              </div>
              {category.subExams.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <span className="text-blue-100">Sub-Exams</span>
                  <span className="font-bold text-white">{category.subExams.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-6 -bottom-6 opacity-5 pointer-events-none hidden md:block">
          <BookOpen className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* Sub-Exams Tabs (if available) */}
      {category.subExams.length > 0 && (
        <div className="bg-card border border-border text-card-foreground rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
            <Layers className="w-4 h-4 text-primary" />
            <span>Available Sub-Exams &amp; Streams</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {category.subExams.map((sub) => (
              <span
                key={sub.id}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border/80 text-foreground hover:border-primary/40 transition-colors"
              >
                {sub.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Student Listing Client */}
      <PyqStudentListingClient
        initialPapers={sanitizedPapers as any}
        categories={[{ id: category.id, name: category.name, slug: category.slug, badgeColor: category.badgeColor }]}
        isAuthenticated={Boolean(user)}
      />
    </div>
  )
}
