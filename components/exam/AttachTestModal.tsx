"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Search, Plus, Loader2, BookOpen, Check, Link2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { formatTestType } from "@/lib/exam/labels"

export interface AttachTestModalProps {
  isOpen: boolean
  onClose: () => void
  packageId: string
  existingTestIds: Set<string>
  onTestAttached: () => void
}

export default function AttachTestModal({
  isOpen,
  onClose,
  packageId,
  existingTestIds,
  onTestAttached,
}: AttachTestModalProps) {
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(null)
      fetch("/api/exam/test/list?archived=false&includeAll=true")
        .then(async (res) => {
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || "Failed to load tests")
          setTests(Array.isArray(json.data) ? json.data : [])
        })
        .catch((err: any) => {
          setError(err.message || "Failed to load tests")
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen])

  const attachTest = async (testId: string) => {
    setAttachingId(testId)
    setError(null)
    try {
      const res = await fetch(`/api/exam/series/packages/${encodeURIComponent(packageId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tests: [{ id: testId, gateMode: "inherit" }],
        }),
      })

      // Also ensure test seriesId is updated via assign endpoint
      const assignRes = await fetch(`/api/exam/test/${encodeURIComponent(testId)}/detach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageIdOrSlug: packageId }),
      })

      toast.success("Test linked to this package successfully")
      onTestAttached()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to attach test")
    } finally {
      setAttachingId(null)
    }
  }

  const unassignedAndAvailable = tests.filter(
    (t) => !existingTestIds.has(t.id)
  )

  const filtered = unassignedAndAvailable.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !attachingId && !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col bg-white dark:bg-[#0a1628] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black">Link Test to Package</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Attach an unassigned test or move an existing test into this series.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-3 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search available tests by title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
          />
        </div>

        {error && (
          <div className="my-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 my-2 pr-1 min-h-[220px]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#00A8FF]" />
              <span className="text-xs font-semibold">Loading available tests...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <BookOpen className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-700" />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                No matching available tests found
              </p>
              <p className="text-[11px]">All available tests are already linked or no tests match search.</p>
            </div>
          ) : (
            filtered.map((test) => (
              <div
                key={test.id}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {test.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {formatTestType(test.testType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                    <span>{test.questions || test.totalQuestions || 0} Questions</span>
                    <span>•</span>
                    <span>{test.duration || test.durationMinutes || 60} Mins</span>
                    {test.seriesTitle && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400">
                          Current: {test.seriesTitle}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => attachTest(test.id)}
                  disabled={attachingId !== null}
                  className="px-3 py-1.5 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 min-h-[38px]"
                >
                  {attachingId === test.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Link Test</span>
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
