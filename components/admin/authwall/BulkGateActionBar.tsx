"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sparkles,
  Lock,
  Unlock,
  RotateCcw,
  Sliders,
  CheckCircle,
  EyeOff,
  Archive,
  Unlink,
  Trash2,
} from "lucide-react"

export interface BulkGateActionBarProps {
  totalItems: number
  selectedCount: number
  allSelected: boolean
  onToggleSelectAll: (checked: boolean) => void
  onBulkSetFree: () => void
  onBulkSetLocked: () => void
  onBulkSetPreview: (percentage: number) => void
  onBulkResetInherit: () => void
  onMakeFirstNFree: (n: number) => void
  onBulkPublish?: () => void
  onBulkUnpublish?: () => void
  onBulkArchive?: () => void
  onBulkRemoveFromPackage?: () => void
  onBulkDelete?: () => void
  context?: "package" | "list"
  disabled?: boolean
}

export function BulkGateActionBar({
  totalItems,
  selectedCount,
  allSelected,
  onToggleSelectAll,
  onBulkSetFree,
  onBulkSetLocked,
  onBulkSetPreview,
  onBulkResetInherit,
  onMakeFirstNFree,
  onBulkPublish,
  onBulkUnpublish,
  onBulkArchive,
  onBulkRemoveFromPackage,
  onBulkDelete,
  context = "package",
  disabled = false,
}: BulkGateActionBarProps) {
  const [customPct, setCustomPct] = useState(25)
  const [firstNCount, setFirstNCount] = useState(1)

  const handleApplyFirstNFree = () => {
    const validN = Math.max(0, Math.min(totalItems, firstNCount))
    if (confirm(`Make the first ${validN} test(s) free for student preview?`)) {
      onMakeFirstNFree(validN)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 text-xs shadow-xs">
      {/* Selection controls */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="select-all-gate-items"
          checked={allSelected}
          onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
          disabled={disabled || totalItems === 0}
          data-testid="select-all-gate-items"
        />
        <label
          htmlFor="select-all-gate-items"
          className="font-bold text-gray-800 dark:text-gray-200 cursor-pointer select-none"
        >
          Select All ({selectedCount}/{totalItems})
        </label>
      </div>

      {/* Bulk action buttons when items are selected */}
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
          {/* Status actions: Publish / Unpublish */}
          {onBulkPublish && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
              onClick={onBulkPublish}
              disabled={disabled}
              data-testid="bulk-publish-btn"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Publish
            </Button>
          )}

          {onBulkUnpublish && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
              onClick={onBulkUnpublish}
              disabled={disabled}
              data-testid="bulk-unpublish-btn"
            >
              <EyeOff className="w-3.5 h-3.5 mr-1" />
              Unpublish
            </Button>
          )}

          {/* Access Tier actions */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
            onClick={onBulkSetFree}
            disabled={disabled}
            data-testid="bulk-set-free-btn"
          >
            <Unlock className="w-3.5 h-3.5 mr-1" />
            Set Free
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
            onClick={onBulkSetLocked}
            disabled={disabled}
            data-testid="bulk-set-locked-btn"
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            Pass Locked
          </Button>

          <div className="flex items-center gap-1 bg-white dark:bg-[#0a1628] rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-1.5 text-indigo-600 hover:text-indigo-700"
              onClick={() => onBulkSetPreview(customPct)}
              disabled={disabled}
              data-testid="bulk-set-preview-btn"
            >
              <Sliders className="w-3.5 h-3.5 mr-1" />
              Preview
            </Button>
            <Input
              type="number"
              min={0}
              max={100}
              value={customPct}
              onChange={(e) => setCustomPct(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
              disabled={disabled}
              className="h-7 w-12 text-xs text-center font-bold px-0.5 rounded-lg border-gray-200 dark:border-gray-700"
            />
            <span className="text-[11px] text-gray-400">%</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs px-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            onClick={onBulkResetInherit}
            disabled={disabled}
            data-testid="bulk-reset-inherit-btn"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Inherit
          </Button>

          {/* Archive / Detach / Delete */}
          {onBulkArchive && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 text-amber-700 hover:bg-amber-50 border-amber-300 dark:border-amber-800"
              onClick={onBulkArchive}
              disabled={disabled}
              data-testid="bulk-archive-btn"
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              Archive
            </Button>
          )}

          {context === "package" && onBulkRemoveFromPackage && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 text-amber-700 hover:bg-amber-50 border-amber-300 dark:border-amber-800"
              onClick={onBulkRemoveFromPackage}
              disabled={disabled}
              data-testid="bulk-detach-btn"
            >
              <Unlink className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          )}

          {onBulkDelete && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 text-red-600 hover:bg-red-50 border-red-200 dark:border-red-900/50 dark:hover:bg-red-950/40"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedCount} selected test(s)?`)) {
                  onBulkDelete()
                }
              }}
              disabled={disabled}
              data-testid="bulk-delete-btn"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>
          )}
        </div>
      ) : (
        /* Quick action: Make first N items free */
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 text-[11px] font-bold hidden sm:inline">
            Quick Action: Make First N Tests Free
          </span>
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#0a1628] rounded-xl border border-gray-200 dark:border-gray-700 px-2.5 py-1">
            <span className="text-[11px] text-gray-500 font-medium">Make first</span>
            <Input
              type="number"
              min={0}
              max={totalItems}
              value={firstNCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                setFirstNCount(isNaN(val) ? 0 : Math.max(0, Math.min(totalItems, val)))
              }}
              disabled={disabled || totalItems === 0}
              className="h-6 w-12 text-xs text-center font-bold px-0.5 rounded-lg border-gray-200 dark:border-gray-700"
              data-testid="first-n-count-input"
            />
            <span className="text-[11px] text-gray-500 font-medium">of {totalItems} tests free</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-3 bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 text-sky-800 border-sky-200 dark:from-sky-950/40 dark:to-indigo-950/40 dark:text-sky-300 dark:border-sky-800"
            onClick={handleApplyFirstNFree}
            disabled={disabled || totalItems === 0 || firstNCount <= 0}
            data-testid="make-first-n-free-btn"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-600" />
            Apply Free Access
          </Button>
        </div>
      )}
    </div>
  )
}
export default BulkGateActionBar
