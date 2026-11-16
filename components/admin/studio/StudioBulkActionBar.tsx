"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckCircle,
  EyeOff,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react"

export interface StudioBulkActionBarProps {
  totalItems: number
  selectedCount: number
  allSelected: boolean
  onToggleSelectAll: (checked: boolean) => void
  onBulkPublish?: () => void
  onBulkUnpublish?: () => void
  onBulkArchive?: () => void
  onBulkRestore?: () => void
  onBulkDelete?: () => void
  itemLabel?: string
  disabled?: boolean
  children?: React.ReactNode
}

export function StudioBulkActionBar({
  totalItems,
  selectedCount,
  allSelected,
  onToggleSelectAll,
  onBulkPublish,
  onBulkUnpublish,
  onBulkArchive,
  onBulkRestore,
  onBulkDelete,
  itemLabel = "item",
  disabled = false,
  children,
}: StudioBulkActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 text-xs shadow-xs">
      {/* Selection controls */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="select-all-studio-items"
          checked={allSelected}
          onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
          disabled={disabled || totalItems === 0}
          data-testid="select-all-studio-items"
          aria-label={`Select all ${itemLabel}s`}
        />
        <label
          htmlFor="select-all-studio-items"
          className="font-bold text-gray-800 dark:text-gray-200 cursor-pointer select-none"
        >
          Select All ({selectedCount}/{totalItems})
        </label>
      </div>

      {/* Bulk action buttons when items are selected */}
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
          {onBulkPublish && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 min-h-[36px]"
              onClick={onBulkPublish}
              disabled={disabled}
              data-testid="bulk-publish-btn"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Publish ({selectedCount})
            </Button>
          )}

          {onBulkUnpublish && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 min-h-[36px]"
              onClick={onBulkUnpublish}
              disabled={disabled}
              data-testid="bulk-unpublish-btn"
            >
              <EyeOff className="w-3.5 h-3.5 mr-1" />
              Unpublish ({selectedCount})
            </Button>
          )}

          {onBulkRestore && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 text-emerald-700 hover:bg-emerald-50 border-emerald-300 dark:border-emerald-800 dark:text-emerald-300 min-h-[36px]"
              onClick={onBulkRestore}
              disabled={disabled}
              data-testid="bulk-restore-btn"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Restore ({selectedCount})
            </Button>
          )}

          {onBulkArchive && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 text-amber-700 hover:bg-amber-50 border-amber-300 dark:border-amber-800 dark:text-amber-300 min-h-[36px]"
              onClick={onBulkArchive}
              disabled={disabled}
              data-testid="bulk-archive-btn"
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              Archive ({selectedCount})
            </Button>
          )}

          {children}

          {onBulkDelete && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2.5 text-red-600 hover:bg-red-50 border-red-200 dark:border-red-900/50 dark:hover:bg-red-950/40 min-h-[36px]"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedCount} selected ${itemLabel}(s)?`)) {
                  onBulkDelete()
                }
              }}
              disabled={disabled}
              data-testid="bulk-delete-btn"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete ({selectedCount})
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default StudioBulkActionBar
