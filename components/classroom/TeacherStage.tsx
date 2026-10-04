"use client"

import React, { useState } from "react"
import {
  Video,
  Monitor,
  PenTool,
  Layers,
} from "lucide-react"
import VideoPlayerStage from "./VideoPlayerStage"
import WhiteboardCanvas from "./WhiteboardCanvas"
import type { PresentationMode, LiveClassData } from "@/lib/classroom-service"

interface TeacherStageProps {
  classroom: LiveClassData
  presentationMode: PresentationMode
  onModeChange: (mode: PresentationMode) => void
  dataSaver: boolean
  onCurrentTimeChange: (seconds: number) => void
}

// Strictly Camera, Screen Share, Whiteboard, and Dual (No slides, No presentation mode, No documents)
const PRESENTATION_MODES: { mode: PresentationMode; label: string; icon: any }[] = [
  { mode: "camera", label: "Teacher Camera", icon: Video },
  { mode: "dual", label: "Camera + Whiteboard", icon: Layers },
  { mode: "screenshare", label: "Screen Share", icon: Monitor },
  { mode: "whiteboard", label: "Digital Whiteboard", icon: PenTool },
]

export default function TeacherStage({
  classroom,
  presentationMode,
  onModeChange,
  dataSaver,
  onCurrentTimeChange,
}: TeacherStageProps) {
  const [isPipCollapsed, setIsPipCollapsed] = useState(false)

  const allowedModes: PresentationMode[] = ["camera", "dual", "screenshare", "whiteboard"]
  const visibleModes = PRESENTATION_MODES.filter((m) => allowedModes.includes(m.mode))

  return (
    <div className="relative w-full h-full bg-[#080D1A] flex flex-col overflow-hidden select-none">
      {/* Top Presentation Mode Switcher Bar */}
      <div className="h-10 bg-[#0F172A]/90 backdrop-blur-xs border-b border-gray-800/80 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline">
            Stage View:
          </span>
          {visibleModes.map((item) => {
            const Icon = item.icon
            const isSelected = presentationMode === item.mode
            return (
              <button
                key={item.mode}
                onClick={() => onModeChange(item.mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#5B47FB] text-white shadow-xs"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{classroom.teacher.name} (Live)</span>
        </div>
      </div>

      {/* Main Stage Display Area */}
      <div className="relative flex-1 w-full h-[calc(100%-2.5rem)] overflow-hidden">
        {/* Mode 1: Teacher Camera Only */}
        {presentationMode === "camera" && (
          <VideoPlayerStage
            streamUrl={classroom.streamUrl}
            teacherName={classroom.teacher.name}
            onCurrentTimeChange={onCurrentTimeChange}
            dataSaver={dataSaver}
            isLive={classroom.status === "LIVE"}
            showLiveBadge={true}
          />
        )}

        {/* Mode 2: Whiteboard Only */}
        {presentationMode === "whiteboard" && (
          <WhiteboardCanvas isTeacherMode={false} />
        )}

        {/* Mode 3: Dual Mode (Teacher Camera + Whiteboard side-by-side) */}
        {presentationMode === "dual" && (
          <div className="w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-800">
            {/* Left 45%: Teacher Live Video Stream */}
            <div className="w-full md:w-[45%] h-1/2 md:h-full relative bg-black">
              <VideoPlayerStage
                streamUrl={classroom.streamUrl}
                teacherName={classroom.teacher.name}
                onCurrentTimeChange={onCurrentTimeChange}
                dataSaver={dataSaver}
                isLive={classroom.status === "LIVE"}
                showLiveBadge={true}
              />
            </div>
            {/* Right 55%: Digital Interactive Whiteboard */}
            <div className="w-full md:w-[55%] h-1/2 md:h-full relative">
              <WhiteboardCanvas isTeacherMode={false} />
            </div>
          </div>
        )}

        {/* Mode 4: Screen Share (Shared Screen Primary + Floating Teacher Camera PiP) */}
        {presentationMode === "screenshare" && (
          <div className="relative w-full h-full bg-[#0A0E1A] flex items-center justify-center p-4">
            <div className="w-full h-full max-w-5xl bg-[#1E293B] rounded-2xl border border-gray-700 shadow-2xl p-6 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs font-mono text-gray-400 ml-2">teacher_workspace.py</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Live Screen Share
                </span>
              </div>

              <pre className="font-mono text-xs sm:text-sm text-gray-200 py-4 overflow-x-auto leading-relaxed">
{`# Numerical Problem: Vectorized Operations & Physics Equations
import numpy as np

def calculate_motion_vectors(displacement, time_seconds):
    velocity = np.divide(displacement, time_seconds)
    acceleration = np.gradient(velocity)
    return velocity, acceleration

# Live Classroom Computation
print("Computing motion vectors in real-time...")`}
              </pre>

              <div className="pt-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                <span>Teacher workspace view &bull; Python 3.12 Engine</span>
                <span className="text-[#3AAFA9] font-bold">Interactive Screen Active</span>
              </div>
            </div>

            {/* Floating PiP Teacher Camera */}
            {!isPipCollapsed ? (
              <div className="absolute bottom-6 right-6 w-52 sm:w-64 aspect-video rounded-2xl overflow-hidden border-2 border-[#5B47FB] shadow-2xl z-30 bg-black">
                <VideoPlayerStage
                  streamUrl={classroom.streamUrl}
                  teacherName={classroom.teacher.name}
                  onCurrentTimeChange={onCurrentTimeChange}
                  dataSaver={dataSaver}
                  isLive={classroom.status === "LIVE"}
                  showLiveBadge={false}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
