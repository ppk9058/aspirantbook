import { prisma } from "@/lib/prisma"
import { ensureDefaultPyqData, getAllPapers } from "@/lib/pyqs-service"
import { PyqStudentListingClient } from "@/components/pyqs/PyqStudentListingClient"
import Link from "next/link"
import { ArrowLeft, BookOpen, AlertCircle, Sparkles } from "lucide-react"

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
      title: "Exam Category Not Found | TrillionSkill",
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
        <div className="p-4 bg-orange-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center text-orange-600">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Exam Category Not Found</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          We couldn't find the requested examination category. It may have been archived or moved.
        </p>
        <Link
          href="/pyqs"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Previous Year Papers
        </Link>
      </div>
    )
  }

  // Fetch real published papers for this category
  const papers = await getAllPapers({
    categoryId: category.id,
    includeAllStatuses: false,
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Link href="/pyqs" className="hover:text-orange-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          All PYQs
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{category.name}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {category.name} Official Past Papers
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {category.fullName || `${category.name} Previous Year Papers`}
          </h1>
          <p className="text-sm text-orange-100 leading-relaxed">
            {category.description || `Browse authentic official papers for ${category.name} with answer keys, solutions, and CBT mock practice.`}
          </p>
        </div>

        <div className="absolute right-6 -bottom-6 opacity-10 pointer-events-none hidden md:block">
          <BookOpen className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Sub-Exams Tabs (if available) */}
      {category.subExams.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Available Sub-Exams / Classes
          </div>
          <div className="flex flex-wrap gap-2">
            {category.subExams.map((sub) => (
              <span
                key={sub.id}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700"
              >
                {sub.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Student Listing Client */}
      <PyqStudentListingClient
        initialPapers={papers as any}
        categories={[{ id: category.id, name: category.name, slug: category.slug, badgeColor: category.badgeColor }]}
      />
    </div>
  )
}
