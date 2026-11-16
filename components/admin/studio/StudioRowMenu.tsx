"use client"

import React from "react"
import Link from "next/link"
import {
  MoreVertical,
  Pencil,
  ExternalLink,
  Archive,
  RotateCcw,
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

export interface StudioRowMenuProps {
  itemId: string
  itemTitle: string
  isArchived?: boolean
  editHref?: string
  onEdit?: () => void
  viewHref?: string
  onView?: () => void
  onToggleArchive?: () => void | Promise<void>
  onDelete?: () => void
  isProcessing?: boolean
  customMenuItems?: React.ReactNode
}

export function StudioRowMenu({
  itemId,
  itemTitle,
  isArchived = false,
  editHref,
  onEdit,
  viewHref,
  onView,
  onToggleArchive,
  onDelete,
  isProcessing = false,
  customMenuItems,
}: StudioRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isProcessing}
          aria-label={`Actions for "${itemTitle}"`}
          data-testid={`studio-row-menu-btn-${itemId}`}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#00A8FF]"
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
        className="w-52 p-1.5 rounded-2xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 shadow-xl text-xs z-50"
      >
        {/* Edit Action */}
        {editHref ? (
          <DropdownMenuItem asChild>
            <Link
              href={editHref}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
            >
              <Pencil className="h-3.5 w-3.5 text-sky-500" />
              <span>Edit</span>
            </Link>
          </DropdownMenuItem>
        ) : onEdit ? (
          <DropdownMenuItem
            onClick={onEdit}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
          >
            <Pencil className="h-3.5 w-3.5 text-sky-500" />
            <span>Edit</span>
          </DropdownMenuItem>
        ) : null}

        {/* View Action */}
        {viewHref ? (
          <DropdownMenuItem asChild>
            <Link
              href={viewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
            >
              <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
              <span>View</span>
            </Link>
          </DropdownMenuItem>
        ) : onView ? (
          <DropdownMenuItem
            onClick={onView}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
            <span>View</span>
          </DropdownMenuItem>
        ) : null}

        {/* Custom studio items */}
        {customMenuItems}

        {/* Archive / Restore Action */}
        {onToggleArchive && (
          <DropdownMenuItem
            onClick={onToggleArchive}
            data-testid={`studio-archive-menu-item-${itemId}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 min-h-[38px]"
          >
            {isArchived ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
                <span>Restore</span>
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5 text-amber-500" />
                <span>Archive</span>
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Delete Action */}
        {onDelete && (
          <>
            <DropdownMenuSeparator className="my-1 border-gray-100 dark:border-gray-800" />
            <DropdownMenuItem
              onClick={onDelete}
              data-testid={`studio-delete-menu-item-${itemId}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer min-h-[38px] font-bold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default StudioRowMenu
