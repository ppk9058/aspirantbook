"use client"

import React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Wifi,
  Users,
  Maximize,
  Minimize,
  Zap,
  Shield,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import type { LiveClassData } from "@/lib/classroom-service"
import type { NetworkQualityState } from "@/lib/webrtc/classroom-webrtc"

interface MeetingTopBarProps {
  classroom: LiveClassData
  role: "student" | "teacher"
  isFullscreen: boolean
  onToggleFullscreen: () => void
  networkQuality: NetworkQualityState
  rttMs: number
  dataSaver: boolean
  onToggleDataSaver: () => void
  onLeaveClass: () => void
  isChatOpen: boolean
  onToggleChat: () => void
  onSwitchRole: () => void
  participantCount: number
}

export default function MeetingTopBar({
  classroom,
  role,
  isFullscreen,
  onToggleFullscreen,
  networkQuality,
  rttMs,
  dataSaver,
  onToggleDataSaver,
  onLeaveClass,
  isChatOpen,
  onToggleChat,
  onSwitchRole,
  participantCount,
}: MeetingTopBarProps) {
  const networkStyles = {
    excellent: {
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      label: "🟢 Excellent",
    },
    good: {
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      label: "🟢 Good",
    },
    weak: {
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      label: "🟡 Unstable",
    },
    reconnecting: {
      color: "text-red-400 bg-red-500/10 border-red-500/30 animate-pulse",
      label: "🔴 Reconnecting...",
    },
  }

  const currentNetwork = networkStyles[networkQuality] || networkStyles.good

  return (
    <header className="h-14 sm:h-16 bg-[#080E1D] text-white border-b border-gray-800/80 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      
      {/* Left: Leave / Back & Class Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onLeaveClass}
          className="px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          title="Leave Class"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-xs md:max-w-md">
              {classroom.topicTitle || "Fundamental Rights — Article 14"}
            </span>
            <span className="hidden md:inline-block text-[10px] font-bold text-[#3AAFA9] bg-[#3AAFA9]/10 border border-[#3AAFA9]/30 px-2 py-0.5 rounded">
              {classroom.batchTitle}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate hidden sm:block">
            Instructor: <span className="text-gray-300 font-semibold">{classroom.teacher.name}</span>
          </p>
        </div>
      </div>

      {/* Center: Live Badge & Participant Count */}
      <div className="flex items-center gap-2 sm:gap-3">
        {classroom.status === "LIVE" && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] sm:text-xs font-black tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>LIVE</span>
          </div>
        )}

        {/* Participant Count Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/60 border border-gray-700/60 text-xs text-gray-300 font-bold">
          <Users className="h-3.5 w-3.5 text-[#3AAFA9]" />
          <span>{participantCount.toLocaleString()}</span>
          <span className="hidden sm:inline text-gray-400 font-normal">participants</span>
        </div>
      </div>

      {/* Right: Network Quality, Data Saver, Switch Role, Fullscreen */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Network Status Badge */}
        <div
          className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-lg border ${currentNetwork.color}`}
          title={`Network: ${networkQuality} (${rttMs}ms RTT)`}
        >
          <Wifi className="h-3 w-3" />
          <span className="hidden sm:inline">{currentNetwork.label}</span>
          <span className="font-mono text-[10px] text-gray-400">{rttMs}ms</span>
        </div>

        {/* Data Saver Mode Pill */}
        <button
          onClick={onToggleDataSaver}
          className={`hidden md:flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
            dataSaver
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-gray-800/50 text-gray-400 border-gray-700/60 hover:text-white"
          }`}
          title="Toggle Low Data Mode"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Low Data</span>
        </button>

        {/* Persona Switcher (Student / Teacher toggle) */}
        <button
          onClick={onSwitchRole}
          className="px-2.5 py-1 rounded-lg bg-[#5B47FB]/20 border border-[#5B47FB]/40 text-[#9B87FC] hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          title="Switch between Teacher and Student perspectives"
        >
          <Shield className="h-3.5 w-3.5 text-[#5B47FB]" />
          <span className="hidden sm:inline">{role === "teacher" ? "Teacher Mode" : "Student Mode"}</span>
          <span className="text-[10px] uppercase font-mono bg-[#5B47FB] text-white px-1 rounded ml-0.5">
            {role === "teacher" ? "Host" : "You"}
          </span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>

      </div>
    </header>
  )
}
