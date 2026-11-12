"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  Archive,
  Trash2,
  Loader2,
  ShieldAlert,
} from "lucide-react"

export interface StudioImpactMetric {
  label: string
  count: number | string
  icon?: React.ReactNode
}

export interface StudioDeleteImpactDialogProps {
  isOpen: boolean
  onClose: () => void
  itemType: string // e.g. "PYQ Paper", "Book", "Document", "Question"
  itemName: string
  itemId: string
  impactMetrics?: StudioImpactMetric[]
  hasDependencies?: boolean
  dependencyNotice?: string
  isArchivedAlready?: boolean
  onConfirmArchive?: () => Promise<void>
  onConfirmHardDelete?: () => Promise<void>
}

export function StudioDeleteImpactDialog({
  isOpen,
  onClose,
  itemType,
  itemName,
  itemId: _itemId,
  impactMetrics = [],
  hasDependencies = false,
  dependencyNotice,
  isArchivedAlready: _isArchivedAlready = false,
  onConfirmArchive,
  onConfirmHardDelete,
}: StudioDeleteImpactDialogProps) {
  const [typedName, setTypedName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTypedName("")
      setError(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  const isConfirmed = typedName.trim() === itemName.trim()

  const handleAction = async () => {
    if (!isConfirmed) return
    setIsSubmitting(true)
    setError(null)

    try {
      if (hasDependencies && onConfirmArchive) {
        await onConfirmArchive()
      } else if (!hasDependencies && onConfirmHardDelete) {
        await onConfirmHardDelete()
      } else if (onConfirmHardDelete) {
        await onConfirmHardDelete()
      } else if (onConfirmArchive) {
        await onConfirmArchive()
      }
      onClose()
    } catch (err: any) {
      setError(err.message || "Operation failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const defaultNotice = hasDependencies
    ? `Hard delete is blocked to protect historical records. Archiving safely hides this ${itemType.toLowerCase()} from public listings while preserving existing records.`
    : undefined

  const finalNotice = dependencyNotice || defaultNotice

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#0a1628] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                hasDependencies
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                  : "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
              }`}
            >
              {hasDependencies ? (
                <Archive className="h-6 w-6" />
              ) : (
                <Trash2 className="h-6 w-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-black leading-snug">
                {hasDependencies
                  ? `Archive ${itemType}`
                  : `Permanently Delete ${itemType}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {hasDependencies
                  ? `Existing learner records protect this ${itemType.toLowerCase()} from hard deletion.`
                  : "No blocking dependencies detected. This action cannot be undone."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Impact Breakdown */}
        {impactMetrics.length > 0 && (
          <div className="my-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-[#060f1c] border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
            <span className="font-bold text-[10px] uppercase text-gray-400 tracking-wider block">
              Impact Analysis
            </span>
            <div className="grid grid-cols-2 gap-2">
              {impactMetrics.map((metric, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                >
                  {metric.icon}
                  <span>
                    <strong>{metric.count}</strong> {metric.label}
                  </span>
                </div>
              ))}
            </div>

            {finalNotice && (
              <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-800 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{finalNotice}</span>
              </div>
            )}
          </div>
        )}

        {/* Confirmation prompt */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Please type <strong className="text-gray-900 dark:text-white select-all">{itemName}</strong> to confirm:
          </label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            disabled={isSubmitting}
            placeholder={itemName}
            data-testid="delete-confirm-input"
            aria-label={`Confirm deletion of ${itemName}`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#071d33] text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors min-h-[44px] cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAction}
            disabled={!isConfirmed || isSubmitting}
            data-testid="confirm-impact-action-btn"
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all min-h-[44px] cursor-pointer ${
              !isConfirmed || isSubmitting
                ? "bg-gray-400 cursor-not-allowed opacity-60"
                : hasDependencies
                ? "bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20"
                : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
            }`}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {hasDependencies
                ? "Archive Instead"
                : `Delete Permanently`}
            </span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StudioDeleteImpactDialog
