"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Clock,
  CheckCircle2,
  Wifi,
  Volume2,
  Video,
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import type { LiveClassData } from "@/lib/classroom-service"

interface WaitingRoomProps {
  classroom: LiveClassData
  onEnterLiveClass: () => void
}

export default function WaitingRoom({
  classroom,
  onEnterLiveClass,
}: WaitingRoomProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(272) // 4 min 32 sec

  useEffect(() => {
    if (secondsRemaining <= 0) return
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsRemaining])

  const mins = Math.floor(secondsRemaining / 60)
  const secs = secondsRemaining % 60
  const countdownFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0E1A] text-white flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-3xl w-full bg-[#11192E] border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
        
        {/* Countdown Header */}
        <div className="text-center space-y-3">
          <span className="text-xs font-black uppercase tracking-widest text-[#F26522] bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Class Waiting Room</span>
          </span>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {classroom.topicTitle}
          </h1>

          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="bg-[#1A2542] border border-gray-700 px-6 py-3 rounded-2xl flex items-center gap-3">
              <Clock className="h-6 w-6 text-[#F26522] animate-pulse" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Class Starts In</span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-white">
                  {countdownFormatted}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Card & Class Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Instructor Bio */}
          <div className="p-5 rounded-2xl bg-[#16213D] border border-gray-800 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-orange-500/20 relative shrink-0 border border-orange-500/30">
              <Image
                src={classroom.teacher.avatar || "/curious-avatar.svg"}
                alt={classroom.teacher.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#F26522] uppercase tracking-wider">
                Your Master Educator
              </span>
              <h3 className="font-extrabold text-base text-white">
                {classroom.teacher.name}
              </h3>
              <p className="text-xs text-gray-400 leading-snug">
                {classroom.teacher.bio}
              </p>
            </div>
          </div>

          {/* Device Preparation Checklist */}
          <div className="p-5 rounded-2xl bg-[#16213D] border border-gray-800 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-gray-300 block">
              Device Readiness Checklist
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>High-Speed Internet Connected (32ms latency)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Speakers / Headphones Ready</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Live Audio &amp; Video Stream Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* While You Wait: Revision Section */}
        <div className="p-5 rounded-2xl bg-[#141C33] border border-gray-800 space-y-3">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
            While You Wait (Recommended Pre-Read)
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-white block">
                  NCERT Class 6 Chapter 10 Reference Handout
                </span>
                <span className="text-gray-400 text-[11px]">
                  Formula conversions &bull; 4 pages PDF
                </span>
              </div>
            </div>
            <a
              href="/curious-hero-child.svg"
              download
              className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold shrink-0 self-start sm:self-auto transition-colors"
            >
              Download PDF
            </a>
          </div>
        </div>

        {/* Action Button: Enter Live Class Now */}
        <div className="text-center pt-2">
          <button
            onClick={onEnterLiveClass}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <span>Enter Live Classroom Now</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
