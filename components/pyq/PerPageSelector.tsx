"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { PER_PAGE_OPTIONS } from "@/lib/pyq/pagination"

/** Per-page selector (10 / 20 / 50) — updates ?per= and resets to page 1. */
export function PerPageSelector({ current }: { current: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const change = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("per", value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 print:hidden">
      <span className="hidden sm:inline">Questions per page</span>
      <span className="sm:hidden">Per page</span>
      <select
        value={String(current)}
        onChange={(e) => change(e.target.value)}
        className="min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#071d33] px-2.5 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
        aria-label="Questions per page"
      >
        {PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}
