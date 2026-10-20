"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Layers,
  Plus,
  Search,
  Users,
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Archive,
  RotateCcw,
} from "lucide-react"
import CreateSeriesModal from "@/components/exam/CreateSeriesModal"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { StatusBadge, AccessBadge } from "@/lib/exam/labels"

interface PackageSummary {
  id: string
  slug: string
  title: string
  description: string | null
  category: string
  examName: string | null
  isPublished: boolean
  isArchived?: boolean
  isFree?: boolean
  isPro?: boolean
  createdById: string | null
  createdAt: string
  metrics: {
    testsTotal: number
    testsPublished: number
    enrolled: number
    paid: number
    pass: number
    free: number
    attempts: number
    uniqueStudents: number
    avgScore: number
  }
}

interface PackageListViewProps {
  basePath: string
  role: "TEACHER" | "ADMIN"
}

export default function PackageListView({ basePath, role }: PackageListViewProps) {
  const [packages, setPackages] = useState<PackageSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [archivedTab, setArchivedTab] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPackages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/exam/series/packages?archived=${archivedTab}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load packages")
      }
      if (Array.isArray(data.packages)) {
        setPackages(data.packages)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load packages")
    } finally {
      setLoading(false)
    }
  }, [archivedTab])

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  const filtered = packages.filter(
    (pkg) =>
      pkg.title.toLowerCase().includes(search.toLowerCase()) ||
      pkg.category.toLowerCase().includes(search.toLowerCase()) ||
      (pkg.examName && pkg.examName.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-3 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
              {role === "ADMIN" ? "Admin Authority" : "Teacher Studio"}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">• Series Packages</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1">
            Test Series Packages
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {role === "ADMIN"
              ? "Manage all test series packages across the platform, monitor enrollments, attempts, and performance."
              : "Manage your authored test series packages, track enrollments, and inspect student performance."}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={basePath}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold text-sm shadow-xs transition-all min-h-[44px] flex items-center"
          >
            Individual Tests
          </Link>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="create-package-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0080ff] hover:from-[#0096e6] hover:to-[#0070e6] text-white font-bold text-sm shadow-lg shadow-[#00A8FF]/20 transition-all cursor-pointer min-h-[44px]"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Create New Package</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search toolbar */}
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#071d33] border border-gray-200 dark:border-gray-700/60 w-fit">
          <button
            type="button"
            onClick={() => setArchivedTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
              archivedTab === "ACTIVE"
                ? "bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Active Packages
          </button>
          <button
            type="button"
            onClick={() => setArchivedTab("ARCHIVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 ${
              archivedTab === "ARCHIVED"
                ? "bg-white dark:bg-[#0a1628] text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Archive className="h-3 w-3" />
            <span>Archived</span>
          </button>
          <button
            type="button"
            onClick={() => setArchivedTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
              archivedTab === "ALL"
                ? "bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            All
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search packages by title, exam, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-between gap-3 text-sm flex-wrap">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadPackages}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors min-h-[36px] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Packages Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#00A8FF]" />
          <p className="text-sm font-semibold">Loading series packages...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Packages Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search
              ? "No packages match your search filter."
              : archivedTab === "ARCHIVED"
              ? "No archived packages found."
              : "You haven't created any test series packages yet. Click 'Create New Package' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="packages-grid">
          {filtered.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-700 transition-all space-y-4 ${
                pkg.isArchived ? "opacity-80 border-dashed" : ""
              }`}
              data-testid={`package-card-${pkg.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                    {pkg.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {pkg.isArchived ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-500/10 text-neutral-600 dark:text-neutral-400">
                        Archived
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pkg.isPublished
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {pkg.isPublished ? "Published" : "Draft"}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white line-clamp-1">
                    {pkg.title}
                  </h3>
                  {pkg.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {pkg.description}
                    </p>
                  )}
                </div>

                {/* Metric indicators */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> Tests
                    </span>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">
                      {pkg.metrics.testsPublished} / {pkg.metrics.testsTotal}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                      <Users className="h-3 w-3" /> Enrolled
                    </span>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">
                      {pkg.metrics.enrolled}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Attempts
                    </span>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">
                      {pkg.metrics.attempts}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                      <Award className="h-3 w-3" /> Class Avg
                    </span>
                    <p className="text-sm font-extrabold text-sky-700 dark:text-sky-400 mt-0.5">
                      {pkg.metrics.attempts > 0 ? `${pkg.metrics.avgScore}%` : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={`${basePath}/package/${pkg.slug || pkg.id}`}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-[#00A8FF] hover:text-white dark:bg-gray-800 dark:hover:bg-[#00A8FF] text-gray-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
              >
                <span>Manage Package</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      <CreateSeriesModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setIsCreateModalOpen(false)
          loadPackages()
        }}
      />
    </div>
  )
}
