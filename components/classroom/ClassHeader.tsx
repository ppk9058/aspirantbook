"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Wifi,
  Users,
  Clock,
  CheckCircle2,
  Moon,
  Sun,
  Maximize,
  Minimize,
  Settings,
  Shield,
  Zap,
  MessageSquare,
} from "lucide-react"
import type { LiveClassData } from "@/lib/classroom-service"

interface ClassHeaderProps {
  classroom: LiveClassData
  isFullscreen: boolean
  onToggleFullscreen: () => void
  networkQuality: "excellent" | "good" | "weak" | "reconnecting"
  dataSaver: boolean
  onToggleDataSaver: () => void
  onSwitchToTeacherStudio?: () => void
  isChatVisible?: boolean
  onToggleChat?: () => void
}

export default function ClassHeader({
  classroom,
  isFullscreen,
  onToggleFullscreen,
  networkQuality,
  dataSaver,
  onToggleDataSaver,
  onSwitchToTeacherStudio,
  isChatVisible = true,
  onToggleChat,
}: ClassHeaderProps) {
  const [isDark, setIsDark] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
    }
  }

  const networkColors = {
    excellent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    good: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    weak: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    reconnecting: "text-red-400 border-red-500/30 bg-red-500/10 animate-pulse",
  }

  return (
    <header className="h-16 bg-[#0B132B] text-white border-b border-gray-800/80 px-3 sm:px-6 flex items-center justify-between z-40 shrink-0 select-none">
      {/* Left: Back & Batch Info */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={`/batches/${classroom.batchSlug}`}
          className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold"
          title="Back to Batch"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden md:inline">Back</span>
        </Link>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-white truncate max-w-[140px] sm:max-w-xs">
              {classroom.batchTitle}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold text-[#F26522] bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded">
              {classroom.classTag}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate max-w-[200px] sm:max-w-md">
            {classroom.topicTitle}
          </p>
        </div>
      </div>

      {/* Center: Live Status & Attendance (Desktop / Tablet) */}
      <div className="hidden lg:flex items-center gap-3">
        {classroom.status === "LIVE" && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>LIVE</span>
          </div>
        )}
        {classroom.status === "REPLAY" && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <span>REPLAY</span>
          </div>
        )}
        {classroom.status === "UPCOMING" && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <span>UPCOMING</span>
          </div>
        )}

        {/* Auto Attendance Tracking */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Attendance: {classroom.attendancePercentage}% (Present)</span>
        </div>
      </div>

      {/* Right: Controls, Network, Settings & Fullscreen */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Network Quality Badge */}
        <div
          className={`hidden sm:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${networkColors[networkQuality]}`}
          title="Network Connection Health"
        >
          <Wifi className="h-3.5 w-3.5" />
          <span className="capitalize">{networkQuality}</span>
          <span className="text-[10px] text-gray-400 font-mono">32ms</span>
        </div>

        {/* Data Saver Mode Pill */}
        <button
          onClick={onToggleDataSaver}
          className={`hidden md:flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
            dataSaver
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-gray-800/40 text-gray-400 border-gray-700/40 hover:text-white"
          }`}
          title="Toggle Low Data Mode (saves 70% data)"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>{dataSaver ? "Data Saver: ON" : "Data Saver"}</span>
        </button>

        {/* Switch to Teacher Studio */}
        {onSwitchToTeacherStudio && (
          <button
            onClick={onSwitchToTeacherStudio}
            className="px-3 py-1.5 rounded-xl bg-[#5B47FB]/20 hover:bg-[#5B47FB]/30 border border-[#5B47FB]/50 text-[#5B47FB] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Open Teacher Studio"
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Teacher Studio</span>
          </button>
        )}

        {/* Hide/Show Chat Toggle Button */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isChatVisible
                ? "bg-gray-800/70 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700/60"
                : "bg-[#5B47FB] hover:bg-[#4E3BE3] text-white border-[#5B47FB] shadow-md shadow-[#5B47FB]/30"
            }`}
            title={isChatVisible ? "Hide Chat (Expand Video)" : "Show Chat"}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isChatVisible ? "Hide Chat" : "Show Chat"}</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-gray-300" />}
        </button>

        {/* Settings Modal Toggle */}
        <button
          onClick={() => setShowSettingsModal(!showSettingsModal)}
          className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Classroom Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* Settings Dialog Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101A30] border border-gray-700 text-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#5B47FB]" />
                <span>Classroom Preferences</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Low Latency Audio/Video</span>
                <span className="text-emerald-400 font-bold">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Quality Switching (ABR)</span>
                <span className="text-emerald-400 font-bold">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>In-App Sound Alerts (Polls)</span>
                <span className="text-gray-300 font-bold">On</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Watermark Content Protection</span>
                <span className="text-gray-400 font-mono text-[10px]">Active (STU-94021)</span>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2 bg-[#5B47FB] hover:bg-[#4A38E8] text-white rounded-xl text-xs font-bold transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
