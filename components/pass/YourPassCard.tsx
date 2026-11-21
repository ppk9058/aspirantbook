import React from "react"
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react"
import type { ActivePassData } from "@/lib/pass/pass-card-data"

export interface YourPassCardProps {
  passData?: ActivePassData | null
  className?: string
}

/**
 * Reusable card displaying active AspirantBook Pass entitlement.
 * Server or client friendly. Returns null if user has no active pass.
 * Never displays auto-renewal date or invented pricing.
 */
export function YourPassCard({ passData, className = "" }: YourPassCardProps) {
  if (!passData) {
    return null
  }

  return (
    <div
      data-testid="your-pass-card"
      className={`rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{passData.status}</span>
            </span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {passData.planLabel}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-foreground">
            AspirantBook All-Access Pass
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Valid until {passData.validUntil}</span>
          </p>
        </div>

        {passData.formattedAmount ? (
          <div className="sm:text-right shrink-0 bg-background/60 dark:bg-card/60 border border-border/80 rounded-2xl p-3.5 sm:px-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Amount Paid
            </span>
            <span className="text-lg sm:text-xl font-black text-foreground">
              {passData.formattedAmount}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default YourPassCard
