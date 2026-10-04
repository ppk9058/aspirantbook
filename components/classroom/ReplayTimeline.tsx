"use client"

import React from "react"
import {
  BarChart2,
  Bookmark,
  HelpCircle,
  ClipboardList,
  Clock,
  Sparkles,
} from "lucide-react"

interface ReplayMarker {
  timeSeconds: number
  label: string
  type: "poll" | "note" | "question" | "assessment"
}

interface ReplayTimelineProps {
  currentSeconds: number
  totalDuration: number
  onSeek: (seconds: number) => void
  onSelectTab: (tab: "chat" | "polls" | "questions" | "notes" | "resources" | "quiz") => void
}

const MARKERS: ReplayMarker[] = [
  { timeSeconds: 120, label: "02:00 Pinned Intro", type: "note" },
  { timeSeconds: 620, label: "10:20 SI Units Formula", type: "note" },
  { timeSeconds: 1450, label: "24:10 Concept Poll", type: "poll" },
  { timeSeconds: 1720, label: "28:40 Student Doubt Answer", type: "question" },
  { timeSeconds: 2700, label: "45:00 5-Min Mini Quiz", type: "assessment" },
]

export default function ReplayTimeline({
  currentSeconds,
  totalDuration,
  onSeek,
  onSelectTab,
}: ReplayTimelineProps) {
  const getMarkerIcon = (type: string) => {
    switch (type) {
      case "poll":
        return <BarChart2 className="h-3 w-3 text-purple-400" />
      case "question":
        return <HelpCircle className="h-3 w-3 text-cyan-400" />
      case "assessment":
        return <ClipboardList className="h-3 w-3 text-emerald-400" />
      default:
        return <Bookmark className="h-3 w-3 text-amber-400" />
    }
  }

  const handleMarkerClick = (marker: ReplayMarker) => {
    onSeek(marker.timeSeconds)
    if (marker.type === "poll") onSelectTab("polls")
    else if (marker.type === "question") onSelectTab("questions")
    else if (marker.type === "assessment") onSelectTab("quiz")
    else onSelectTab("notes")
  }

  return (
    <div className="bg-[#0B132B] border-t border-gray-800 p-3 flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-purple-300 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Interactive Replay Scrubber</span>
        </span>
        <span className="text-[11px] text-gray-400">
          Click any marker to jump straight to that classroom moment
        </span>
      </div>

      {/* Markers Buttons Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {MARKERS.map((m, idx) => (
          <button
            key={idx}
            onClick={() => handleMarkerClick(m)}
            className="px-2.5 py-1 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-700/60 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            {getMarkerIcon(m.type)}
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
