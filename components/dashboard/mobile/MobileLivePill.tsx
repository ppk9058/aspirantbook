"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Radio, ArrowRight } from "lucide-react"

export default function MobileLivePill() {
  const [liveInfo, setLiveInfo] = useState<{
    count: number
    liveClass: {
      id: string
      slug: string
      title: string
      classroomUrl: string
      teachers?: string[]
    } | null
  } | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchLiveStatus = async () => {
      try {
        const res = await fetch("/api/classroom/live-status")
        if (res.ok && isMounted) {
          const data = await res.json()
          if (data && data.success && typeof data.count === "number") {
            setLiveInfo(data)
          }
        }
      } catch (e) {
        // Silently catch network failures, keep hidden
      }
    }

    fetchLiveStatus()
    // Poll lightly every 60 seconds
    const interval = setInterval(fetchLiveStatus, 60000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Hide completely when 0 live classes per rule 5
  if (!liveInfo || liveInfo.count <= 0) {
    return null
  }

  const destination = liveInfo.liveClass?.classroomUrl || "/classroom/upsc-foundation"

  return (
    <div className="lg:hidden px-3 pt-1 pb-1">
      <Link
        href={destination}
        className="group flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-amber-500/10 border border-rose-500/30 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-rose-500/50 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>

          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-2xs shrink-0 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5" />
            <span>LIVE NOW</span>
          </span>

          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {liveInfo.liveClass?.title || "Masterclass broadcast in progress"}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-rose-600 dark:text-rose-400 font-extrabold text-[11px]">
          <span>Join</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </div>
  )
}
