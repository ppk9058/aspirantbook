"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Pencil,
  BarChart3,
  MoreVertical,
  ExternalLink,
  Eye,
  Copy,
  Archive,
  RotateCcw,
  Unlink,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import DeleteImpactDialog from "@/components/exam/DeleteImpactDialog"
import { toast } from "sonner"

export interface TestRowActionsProps {
  test: {
    id: string
    title: string
    isPublished?: boolean
    isArchived?: boolean
    seriesId?: string
    attemptsCount?: number
    questions?: number
    duration?: number
    [key: string]: any
  }
  context: "package" | "list"
  basePath: string
  role: "TEACHER" | "ADMIN"
  packageIdOrSlug?: string
  onChanged?: () => void
}

export default function TestRowActions({
  test,
  context,
  basePath,
  role,
  packageIdOrSlug,
  onChanged,
}: TestRowActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [forceDeleteAttempts, setForceDeleteAttempts] = useState<number | null>(null)
  const [isForceDeleting, setIsForceDeleting] = useState(false)

  const attemptsCount = Number(test.attemptsCount || test.attempts || 0)
  const isArchived = Boolean(test.isArchived)

  const handleDuplicate = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/exam/test/${encodeURIComponent(test.id)}/duplicate`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to duplicate test")
      }
      toast.success(`Duplicated "${test.title}" successfully`)
      onChanged?.()
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate test")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleArchive = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/exam/test/${encodeURIComponent(test.id)}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isArchived }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update test archive state")
      }
      toast.success(isArchived ? `Restored "${test.title}"` : `Archived "${test.title}"`)
      onChanged?.()
    } catch (err: any) {
      toast.error(err.message || "Failed to update test archive state")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFromPackage = async () => {
    if (!packageIdOrSlug) return
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/exam/test/${encodeURIComponent(test.id)}/detach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageIdOrSlug }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to detach test from package")
      }
      toast.success(`Detached "${test.title}" from package (moved to Unassigned)`)
      onChanged?.()
    } catch (err: any) {
      toast.error(err.message || "Failed to remove test from package")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmHardDelete = async () => {
    const res = await fetch(`/api/exam/test/${encodeURIComponent(test.id)}${role === "ADMIN" ? "?force=true" : ""}`, {
      method: "DELETE",
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete test")
    }
    toast.success(`Permanently deleted test "${test.title}"`)
    onChanged?.()
  }

  const handleConfirmArchive = async () => {
    await handleToggleArchive()
  }

  const targetSeriesSlug = test.seriesId || packageIdOrSlug || test.id

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* 1. Visible: Edit Button */}
      <Link
        href={`${basePath}/create?editTestId=${test.id}`}
        aria-label={`Edit test "${test.title}"`}
        title="Edit test & questions in Studio"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#00A8FF] bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors min-h-[44px] focus:outline-hidden focus:ring-2 focus:ring-[#00A8FF]"
      >
        <Pencil className="h-4 w-4" />
        <span className="hidden sm:inline">Edit</span>
      </Link>

      {/* 2. Visible: Submissions / Analytics Button */}
      <Link
        href={`${basePath}/${test.id}/submissions`}
        aria-label={`View submissions for test "${test.title}"`}
        title="View student submissions & ranking"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#00A8FF] bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors min-h-[44px] focus:outline-hidden focus:ring-2 focus:ring-[#00A8FF]"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="hidden sm:inline">Submissions</span>
      </Link>

      {/* 2b. Visible: Student View Button */}
      <Link
        href={`/test-series/${targetSeriesSlug}?testId=${test.id}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open test "${test.title}" in Student View`}
        title="Open in Student View"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors min-h-[44px] focus:outline-hidden focus:ring-2 focus:ring-[#00A8FF]"
      >
        <ExternalLink className="h-4 w-4 text-sky-500" />
        <span className="hidden sm:inline">Student View</span>
      </Link>

      {/* 2c. Direct Delete button (supports direct row delete & confirm tests) */}
      <button
        type="button"
        title="Delete Test"
        aria-label="Delete Test"
        disabled={isProcessing}
        onClick={async () => {
          if (confirm("Are you sure you want to delete this test?")) {
            try {
              setIsProcessing(true);
              const res = await fetch(`/api/exam/test/${test.id}`, { method: "DELETE" });
              if (res.ok) {
                toast.success("Test deleted successfully");
                onChanged?.();
              } else {
                const data = await res.json().catch(() => ({}));
                if (res.status === 409 && role === "ADMIN") {
                  setForceDeleteAttempts(data.attemptsCount || 1);
                } else {
                  toast.error(data.error || "Failed to delete test");
                }
              }
            } catch {
              toast.error("Network error while deleting test");
            } finally {
              setIsProcessing(false);
            }
          }
        }}
        className="p-2 rounded-xl text-gray-500 hover:text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* 3. Overflow Menu (⋯) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`More actions for test "${test.title}"`}
            title="More actions"
            disabled={isProcessing}
            data-testid={`test-overflow-trigger-${test.id}`}
            className="inline-flex items-center justify-center p-2 rounded-xl text-gray-600 hover:text-gray-900 bg-transparent hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] focus:outline-hidden focus:ring-2 focus:ring-[#00A8FF]"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#00A8FF]" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56 p-1.5 rounded-2xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 shadow-xl text-xs"
        >
          {/* Edit Test */}
          <DropdownMenuItem asChild>
            <Link
              href={`${basePath}/create?editTestId=${test.id}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
            >
              <Pencil className="h-3.5 w-3.5 text-sky-500" />
              <span>Edit Test (Studio)</span>
            </Link>
          </DropdownMenuItem>

          {/* Student View */}
          <DropdownMenuItem asChild>
            <Link
              href={`/test-series/${targetSeriesSlug}?testId=${test.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
            >
              <ExternalLink className="h-3.5 w-3.5 text-sky-500" />
              <span>Student View</span>
            </Link>
          </DropdownMenuItem>

          {/* Preview / Instructions */}
          <DropdownMenuItem asChild>
            <Link
              href={`/test-series/${targetSeriesSlug}/instructions?testId=${test.id}&preview=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
            >
              <Eye className="h-3.5 w-3.5 text-purple-500" />
              <span>Preview Mode</span>
            </Link>
          </DropdownMenuItem>

          {/* Duplicate Test */}
          <DropdownMenuItem
            onClick={handleDuplicate}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
          >
            <Copy className="h-3.5 w-3.5 text-indigo-500" />
            <span>Duplicate Test</span>
          </DropdownMenuItem>

          {/* Archive / Restore */}
          <DropdownMenuItem
            onClick={handleToggleArchive}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
          >
            {isArchived ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
                <span>Restore Test</span>
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5 text-amber-500" />
                <span>Archive Test</span>
              </>
            )}
          </DropdownMenuItem>

          {/* Remove from package (only in package context) */}
          {context === "package" && (
            <DropdownMenuItem
              onClick={handleRemoveFromPackage}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 cursor-pointer min-h-[38px]"
            >
              <Unlink className="h-3.5 w-3.5" />
              <span>Remove from Package</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="my-1 border-gray-100 dark:border-gray-800" />

          {/* Delete (danger styling, separated) */}
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            data-testid={`delete-test-menu-item-${test.id}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer min-h-[38px] font-bold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Test</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete / Archive Confirmation Dialog */}
      <DeleteImpactDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        itemType="test"
        itemName={test.title}
        itemId={test.id}
        impact={{
          attemptsCount,
        }}
        isArchivedAlready={isArchived}
        onConfirmArchive={handleConfirmArchive}
        onConfirmHardDelete={handleConfirmHardDelete}
      />

      {/* Admin Force Delete Modal */}
      {forceDeleteAttempts !== null && (
        <div
          data-testid="force-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Force Delete Test</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This test has <span className="font-bold text-red-600 dark:text-red-400">{forceDeleteAttempts} student attempt(s)</span>. Force deleting will permanently erase candidate records.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setForceDeleteAttempts(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isForceDeleting}
                onClick={async () => {
                  try {
                    setIsForceDeleting(true);
                    const forceRes = await fetch(`/api/exam/test/${test.id}?force=true`, { method: "DELETE" });
                    if (forceRes.ok) {
                      toast.success("Test force deleted successfully");
                      setForceDeleteAttempts(null);
                      onChanged?.();
                    } else {
                      const errData = await forceRes.json().catch(() => ({}));
                      toast.error(errData.error || "Failed to force delete test");
                    }
                  } catch {
                    toast.error("Network error while force deleting");
                  } finally {
                    setIsForceDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Force Delete ({forceDeleteAttempts} attempts)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
