"use client"

import React from "react"
import Link from "next/link"
import {
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart2,
  HelpCircle,
  ClipboardCheck,
  RotateCcw,
  ArrowRight,
  FileText,
} from "lucide-react"
import type { LiveClassData } from "@/lib/classroom-service"

interface ClassCompletionSummaryProps {
  classroom: LiveClassData
  onWatchReplay: () => void
  onOpenNotes: () => void
}

export default function ClassCompletionSummary({
  classroom,
  onWatchReplay,
  onOpenNotes,
}: ClassCompletionSummaryProps) {
  const dpp = classroom.releasedDpp || {
    id: "dpp-auto",
    title: `Daily Practice Problem (DPP) — ${classroom.topicTitle}`,
    questionCount: 15,
    durationMinutes: 25,
    url: "/test-series",
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0E1A] text-white flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-[#11192E] border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Celebration Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <Trophy className="h-8 w-8" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            Class Completed 🎉
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Great Learning Session!
          </h1>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            You have completed today&apos;s live lecture with {classroom.teacher.name}. Here is your session summary.
          </p>
        </div>

        {/* Learning Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#16213D] p-4 rounded-2xl border border-gray-800 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Watch Time</span>
            <span className="text-sm sm:text-base font-black text-white mt-0.5 block">58 Mins</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Attendance</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 mt-0.5 block">96% (Present)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Polls Answered</span>
            <span className="text-sm sm:text-base font-black text-purple-400 mt-0.5 block">1 / 1 (100%)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Quiz Score</span>
            <span className="text-sm sm:text-base font-black text-[#F26522] mt-0.5 block">5 / 5 (100%)</span>
          </div>
        </div>

        {/* Automatic DPP Release Card (Core Principle) */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#F26522]/20 via-[#1C2744] to-[#16213D] border-2 border-[#F26522]/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F26522] bg-orange-500/20 px-2.5 py-0.5 rounded-full border border-orange-500/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Immediate Next Step</span>
            </span>
            <span className="text-xs font-bold text-gray-300">
              {dpp.questionCount} Questions &bull; {dpp.durationMinutes} Mins
            </span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              {dpp.title}
            </h3>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Consolidate today&apos;s live class concepts right away with practice questions and step-by-step video solutions.
            </p>
          </div>

          <Link
            href={dpp.url || "/test-series"}
            className="w-full py-3.5 bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span>Start DPP Practice Now</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onWatchReplay}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Interactive Replay</span>
          </button>
          <button
            onClick={onOpenNotes}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Review Class Notes</span>
          </button>
          <Link
            href={`/batches/${classroom.batchSlug}`}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Back to Batch</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
