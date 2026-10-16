"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles, Lock, Unlock, RotateCcw, Sliders } from "lucide-react"

interface BulkGateActionBarProps {
  totalItems: number
  selectedCount: number
  allSelected: boolean
  onToggleSelectAll: (checked: boolean) => void
  onBulkSetFree: () => void
  onBulkSetLocked: () => void
  onBulkSetPreview: (percentage: number) => void
  onBulkResetInherit: () => void
  onMakeFirstNFree: (n: number) => void
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
  disabled = false,
}: BulkGateActionBarProps) {
  const [customPct, setCustomPct] = useState(25)
  const [firstNCount, setFirstNCount] = useState(1)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
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
          className="font-medium text-foreground cursor-pointer select-none"
        >
          Select All ({selectedCount}/{totalItems})
        </label>
      </div>

      {/* Bulk action buttons when items are selected */}
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
            onClick={onBulkSetFree}
            disabled={disabled}
            data-testid="bulk-set-free-btn"
          >
            <Unlock className="w-3 h-3 mr-1" />
            Set Free
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
            onClick={onBulkSetLocked}
            disabled={disabled}
            data-testid="bulk-set-locked-btn"
          >
            <Lock className="w-3 h-3 mr-1" />
            Set Locked
          </Button>

          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-md border border-input px-1.5 py-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-1.5 text-indigo-600 hover:text-indigo-700"
              onClick={() => onBulkSetPreview(customPct)}
              disabled={disabled}
              data-testid="bulk-set-preview-btn"
            >
              <Sliders className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <Input
              type="number"
              min={0}
              max={100}
              value={customPct}
              onChange={(e) => setCustomPct(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
              disabled={disabled}
              className="h-6 w-12 text-xs text-center font-bold px-0.5"
            />
            <span className="text-[11px] text-muted-foreground">%</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            onClick={onBulkResetInherit}
            disabled={disabled}
            data-testid="bulk-reset-inherit-btn"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset Inherit
          </Button>
        </div>
      ) : (
        /* Quick action: Make first N items free */
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[11px] font-medium hidden sm:inline">
            Quick Action:
          </span>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-md border border-input px-1.5 py-0.5">
            <span className="text-[11px] text-muted-foreground">First</span>
            <Input
              type="number"
              min={1}
              max={totalItems || 10}
              value={firstNCount}
              onChange={(e) => setFirstNCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={disabled || totalItems === 0}
              className="h-6 w-10 text-xs text-center font-bold px-0.5"
              data-testid="first-n-count-input"
            />
            <span className="text-[11px] text-muted-foreground">free</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300"
            onClick={() => onMakeFirstNFree(firstNCount)}
            disabled={disabled || totalItems === 0}
            data-testid="make-first-n-free-btn"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}
