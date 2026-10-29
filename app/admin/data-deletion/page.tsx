import React from "react"
import { prisma } from "@/lib/prisma"
import { DataDeletionQueueClient } from "./DataDeletionQueueClient"
import Link from "next/link"
import { Trash2, ShieldCheck, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Data Deletion Requests Queue | AspirantBook Admin",
  description: "Manage privacy erasure and account data deletion requests submitted by users.",
}

export default async function DataDeletionAdminPage() {
  const requests = await prisma.dataDeletionRequest.findMany({
    orderBy: { requestedAt: "desc" },
    take: 100,
  })

  const pendingCount = requests.filter((r) => r.status === "PENDING").length
  const inReviewCount = requests.filter((r) => r.status === "IN_REVIEW").length
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold mb-2">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Privacy &amp; Regulatory Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Data Deletion Requests Queue
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Review and govern learner account deletion requests submitted via mobile app or public web form.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/data-deletion"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span>Public Web Form</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            Pending Action
          </span>
          <p className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200">{pendingCount}</p>
        </div>
        <div className="p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-2xl">
          <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
            Under Review
          </span>
          <p className="mt-1 text-2xl font-black text-sky-900 dark:text-sky-200">{inReviewCount}</p>
        </div>
        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            Completed (Archived)
          </span>
          <p className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200">{completedCount}</p>
        </div>
      </div>

      {/* Manual Governance Notice */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200">
        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Manual Governance Standard (No Blind Auto-Hard-Delete)</p>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
            Per system policy, automatic hard deletion is not run automatically. Follow the documented checklist in{" "}
            <code className="bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded font-mono text-xs">
              docs/evidence/deletion-procedure.md
            </code>{" "}
            for statutory financial retention and academic anonymization before marking requests completed.
          </p>
        </div>
      </div>

      {/* Interactive Queue */}
      <DataDeletionQueueClient initialRequests={requests} />
    </div>
  )
}
