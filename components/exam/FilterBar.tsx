"use client"

import React from "react"
import { Search, X, Filter, RotateCcw } from "lucide-react"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterField {
  name: string
  label: string
  options: FilterOption[]
  value: string
  onChange: (val: string) => void
}

export interface FilterBarProps {
  search: string
  onSearchChange: (q: string) => void
  searchPlaceholder?: string
  filters?: FilterField[]
  onClearAll?: () => void
  isFiltered?: boolean
  className?: string
  extraActions?: React.ReactNode
}

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search tests, subjects, titles...",
  filters = [],
  onClearAll,
  isFiltered = false,
  className = "",
  extraActions,
}: FilterBarProps) {
  return (
    <div
      className={`bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs space-y-3 ${className}`}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#00A8FF] transition-all min-h-[44px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full min-w-[28px] min-h-[28px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdowns and actions */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <div key={f.name} className="relative min-w-[130px]">
              <select
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                aria-label={`Filter by ${f.label}`}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-hidden focus:border-[#00A8FF] transition-all min-h-[44px] cursor-pointer"
              >
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {isFiltered && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          {extraActions}
        </div>
      </div>
    </div>
  )
}
