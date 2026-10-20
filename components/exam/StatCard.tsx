"use client"

import React, { useState } from "react"
import { HelpCircle, TrendingUp, TrendingDown } from "lucide-react"

export interface StatCardProps {
  label: string
  value: React.ReactNode
  subtext?: string
  icon?: React.ReactNode
  tooltip?: string
  trend?: {
    value: string
    isPositive?: boolean
    text?: string
  }
  valueColor?: string
  testId?: string
  className?: string
}

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  tooltip,
  trend,
  valueColor,
  testId,
  className = "",
}: StatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      data-testid={testId ? `${testId}-card` : undefined}
      className={`relative bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full transition-all hover:border-gray-300 dark:hover:border-gray-750 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
            {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
            <span className="truncate">{label}</span>
          </span>

          {tooltip && (
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={`Information about ${label}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full focus:outline-hidden focus:ring-1 focus:ring-primary min-w-[24px] min-h-[24px] flex items-center justify-center cursor-help"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>

              {showTooltip && (
                <div
                  role="tooltip"
                  className="absolute right-0 bottom-full mb-2 z-50 w-56 p-2.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[11px] leading-relaxed shadow-xl border border-gray-800 dark:border-gray-200 pointer-events-none transition-opacity animate-in fade-in"
                >
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <p
            data-testid={testId}
            className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums truncate ${
              valueColor || "text-gray-900 dark:text-white"
            }`}
          >
            {value}
          </p>

          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold shrink-0 ${
                trend.isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value}</span>
            </span>
          )}
        </div>
      </div>

      {(subtext || (trend && trend.text)) && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500 min-h-[36px] min-w-0">
          <span className="min-w-0 break-words line-clamp-2 leading-tight">{subtext}</span>
          {trend?.text && <span className="text-[10px] text-gray-400 shrink-0 ml-1.5">{trend.text}</span>}
        </div>
      )}
    </div>
  )
}
