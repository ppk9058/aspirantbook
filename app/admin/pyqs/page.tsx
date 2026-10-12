import { prisma } from "@/lib/prisma"
import { ensureDefaultPyqData, getAllPapers } from "@/lib/pyqs-service"
import Link from "next/link"
import {
  FileText,
  Plus,
  Layers,
  FolderTree,
  Users,
  Eye,
  Download,
  CheckCircle,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Edit3,
} from "lucide-react"
import { auth } from "@/auth"
import { PyqPapersListClient } from "@/components/admin/pyqs/PyqPapersListClient"

export const dynamic = "force-dynamic"

export default async function AdminPyqsPage() {
  const session = await auth()
  const basePath = session?.user?.role === "TEACHER" ? "/teacher" : "/admin"
  await ensureDefaultPyqData()

  // Fetch all stats and papers
  const [categories, subExamsCount, papers, totalLeads] = await Promise.all([
    prisma.pyqCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { papers: true, subExams: true } },
      },
    }),
    prisma.pyqSubExam.count(),
    getAllPapers({ includeAllStatuses: true }),
    prisma.pyqLeadCapture.count(),
  ])

  const totalDownloads = papers.reduce((sum, p) => sum + (p.downloadCount || 0), 0)
  const paidPapersCount = papers.filter((p) => p.accessType === "PAID").length
  const cbtPapersCount = papers.filter((p) => p.hasCbtMode).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              Teacher & Admin Portal
            </span>
            <span className="text-xs text-gray-500">• Official Papers Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Previous Year Questions (PYQ) Studio
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage Major Exam Heads, Sub-Exam Types, upload official PDFs, set unlock pricing, and link CBT online test modes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`${basePath}/pyqs/categories`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <FolderTree className="w-4 h-4 text-gray-600" />
            Exam Categories & Types
          </Link>

          <Link
            href={`${basePath}/pyqs/leads`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Users className="w-4 h-4 text-gray-600" />
            Phone Leads ({totalLeads})
          </Link>

          <Link
            href={`${basePath}/pyqs/upload`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm shadow-orange-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Upload PYQ Paper
          </Link>

          <Link
            href={`${basePath}/test-series/create?type=PYQ`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Create PYQ Test (JSON)
          </Link>

          <Link
            href="/pyqs"
            target="_blank"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title="Preview Student-Facing PYQ Hub"
          >
            <ExternalLink className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Papers</span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">{papers.length}</span>
            <span className="text-xs text-emerald-600 font-medium ml-2">Active Official</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Across all civil services & boards</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exam Heads & Types</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">{categories.length}</span>
            <span className="text-xs text-blue-600 font-medium ml-2">{subExamsCount} Sub-types</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">e.g. BPSC (CCE, CDPO, AEDO)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monetization & CBT</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">{paidPapersCount}</span>
            <span className="text-xs text-purple-600 font-medium ml-2">{cbtPapersCount} CBT Live</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Paid unlock (₹49) / Pass enabled</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PDF Downloads</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Download className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">{totalDownloads.toLocaleString()}</span>
            <span className="text-xs text-emerald-600 font-medium ml-2">{totalLeads} Leads</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Phone numbers collected</p>
        </div>
      </div>

      {/* Interactive Papers Directory Client Component */}
      <PyqPapersListClient initialPapers={papers as any} categories={categories} basePath={basePath} />
    </div>
  )
}
