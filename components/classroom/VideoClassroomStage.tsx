"use client"

import React, { useState } from "react"
import VideoTile from "./VideoTile"
import WhiteboardCanvas from "./WhiteboardCanvas"
import VideoPlayerStage from "./VideoPlayerStage"
import {
  Video,
  Layers,
  Monitor,
  PenTool,
  Maximize2,
  Minimize2,
  Users,
  Sparkles,
} from "lucide-react"
import type { LiveClassData, ClassParticipant, PresentationMode } from "@/lib/classroom-service"

interface VideoClassroomStageProps {
  classroom: LiveClassData
  participants: ClassParticipant[]
  presentationMode: PresentationMode
  onModeChange: (mode: PresentationMode) => void
  localStream: MediaStream | null
  screenStream: MediaStream | null
  role: "student" | "teacher"
  dataSaver: boolean
  onCurrentTimeChange?: (seconds: number) => void
}

export default function VideoClassroomStage({
  classroom,
  participants,
  presentationMode,
  onModeChange,
  localStream,
  screenStream,
  role,
  dataSaver,
  onCurrentTimeChange,
}: VideoClassroomStageProps) {
  // Pinned participant ID (default host)
  const hostParticipant = participants.find((p) => p.role === "host" || p.role === "teacher") || participants[0]
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string>(hostParticipant?.id || "")

  // Interactive Stage participants (host + students invited on stage)
  const stageParticipants = participants.filter((p) => p.isOnStage || p.id === hostParticipant?.id)

  // Floating PiP position state for Screen Share Mode
  const [pipPosition, setPipPosition] = useState<"top-right" | "top-left" | "bottom-right" | "bottom-left">("bottom-right")

  const pipClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }

  return (
    <div className="relative w-full h-full bg-[#080C14] flex flex-col overflow-hidden select-none">
      
      {/* Presentation Mode Quick Selector (TEACHER ONLY) */}
      {role === "teacher" && (
        <div className="h-10 bg-[#0B1220]/80 backdrop-blur-md border-b border-gray-800/80 px-4 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline">
              Teacher Stage View:
            </span>
            <button
              onClick={() => onModeChange("camera")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                presentationMode === "camera"
                  ? "bg-[#5B47FB] text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Lecture Video</span>
            </button>
            <button
              onClick={() => onModeChange("dual")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                presentationMode === "dual"
                  ? "bg-[#5B47FB] text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Dual (Video + Board)</span>
            </button>
            <button
              onClick={() => onModeChange("screenshare")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                presentationMode === "screenshare"
                  ? "bg-[#5B47FB] text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Screen Share</span>
            </button>
            <button
              onClick={() => onModeChange("whiteboard")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                presentationMode === "whiteboard"
                  ? "bg-[#5B47FB] text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Whiteboard</span>
            </button>
          </div>

          {/* Live Stage Status */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Stage: {stageParticipants.length} on stage</span>
          </div>
        </div>
      )}

      {/* Main Stage Display */}
      <div className="relative flex-1 w-full h-[calc(100%-2.5rem)] overflow-hidden bg-black">
        
        {/* MODE 1: LECTURE / INTERACTIVE VIDEO STAGE */}
        {presentationMode === "camera" && (
          <div className="w-full h-full p-2 sm:p-4 flex flex-col">
            {stageParticipants.length <= 1 ? (
              // Solo Lecture Mode: Teacher is visually prioritized & pinned full-screen
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                {hostParticipant ? (
                  <VideoTile
                    participant={hostParticipant}
                    stream={localStream}
                    priority="primary"
                    isPinned={true}
                    className="w-full h-full"
                  />
                ) : (
                  <VideoPlayerStage
                    streamUrl={classroom.streamUrl}
                    teacherName={classroom.teacher.name}
                    dataSaver={dataSaver}
                    isLive={classroom.status === "LIVE"}
                    onCurrentTimeChange={onCurrentTimeChange}
                  />
                )}
              </div>
            ) : (
              // Interactive Stage Mode: Responsive Zoom-like Grid of Stage Participants
              <div
                className={`w-full h-full grid gap-3 sm:gap-4 ${
                  stageParticipants.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : stageParticipants.length <= 4
                    ? "grid-cols-2"
                    : "grid-cols-2 md:grid-cols-3"
                }`}
              >
                {stageParticipants.map((p) => {
                  const isHost = p.role === "host" || p.role === "teacher"
                  return (
                    <VideoTile
                      key={p.id}
                      participant={p}
                      stream={localStream}
                      isPinned={pinnedParticipantId === p.id}
                      onPin={() => setPinnedParticipantId(p.id)}
                      isSelf={p.id === "p-current" || p.id === "p-current-user"}
                      priority={isHost ? "primary" : "secondary"}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: DUAL (Teacher Video + Whiteboard side-by-side) */}
        {presentationMode === "dual" && (
          <div className="w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-800">
            {/* Left 45%: Teacher Live Video Tile */}
            <div className="w-full md:w-[45%] h-1/2 md:h-full p-2 bg-[#0A0F1D]">
              {hostParticipant ? (
                <VideoTile
                  participant={hostParticipant}
                  stream={localStream}
                  priority="primary"
                  className="w-full h-full rounded-2xl"
                />
              ) : (
                <VideoPlayerStage
                  streamUrl={classroom.streamUrl}
                  teacherName={classroom.teacher.name}
                  dataSaver={dataSaver}
                  isLive={classroom.status === "LIVE"}
                />
              )}
            </div>

            {/* Right 55%: Digital Interactive Whiteboard */}
            <div className="w-full md:w-[55%] h-1/2 md:h-full relative">
              <WhiteboardCanvas isTeacherMode={role === "teacher"} />
            </div>
          </div>
        )}

        {/* MODE 3: SCREEN SHARE (Primary Screen + Floating Teacher Webcam PiP) */}
        {presentationMode === "screenshare" && (
          <div className="relative w-full h-full bg-[#0A0E1A] flex items-center justify-center p-2 sm:p-4">
            {/* Main Screen Share Container */}
            <div className="relative w-full h-full bg-[#1E293B] rounded-2xl border border-gray-700 shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3 bg-[#0F172A]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs font-mono text-gray-300 ml-2 font-bold">
                    UPSC Polity — Article 14 Landmark Cases (Maneka Gandhi & Anwar Ali Sarkar)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Live Screen Share
                </span>
              </div>

              {/* Shared Screen Content / Slide Deck */}
              <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4 bg-radial from-[#1E293B] to-[#0F172A]">
                <div className="max-w-xl space-y-3">
                  <span className="text-xs font-black uppercase tracking-widest text-[#3AAFA9]">
                    Constitution of India &bull; Part III
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    Article 14: Equality Before Law &amp; Equal Protection of Laws
                  </h2>
                  <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-700 text-left font-mono text-xs sm:text-sm text-gray-300 space-y-2">
                    <p className="text-emerald-400 font-bold">&bull; Negative Concept (British Origin):</p>
                    <p className="text-gray-400 pl-4">Absence of special privilege in favour of any person.</p>
                    <p className="text-[#3AAFA9] font-bold">&bull; Positive Concept (American Origin):</p>
                    <p className="text-gray-400 pl-4">Equality of treatment under equal circumstances.</p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400 bg-[#0F172A]">
                <span>Shared by: {classroom.teacher.name}</span>
                <span className="text-[#3AAFA9] font-bold">High Fidelity &bull; 60 FPS</span>
              </div>
            </div>

            {/* Floating Picture-in-Picture (PiP) Teacher Camera Tile */}
            {hostParticipant && (
              <div
                className={`absolute z-30 w-44 sm:w-56 aspect-video rounded-xl shadow-2xl border-2 border-[#5B47FB]/60 overflow-hidden cursor-move transition-all duration-200 ${pipClasses[pipPosition]}`}
                onClick={() => {
                  // Cycle PiP corners on click
                  const order: ("bottom-right" | "bottom-left" | "top-left" | "top-right")[] = [
                    "bottom-right",
                    "bottom-left",
                    "top-left",
                    "top-right",
                  ]
                  const nextIndex = (order.indexOf(pipPosition) + 1) % order.length
                  setPipPosition(order[nextIndex])
                }}
                title="Click to reposition camera PiP"
              >
                <VideoTile
                  participant={hostParticipant}
                  stream={localStream}
                  priority="secondary"
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        )}

        {/* MODE 4: DIGITAL WHITEBOARD ONLY */}
        {presentationMode === "whiteboard" && (
          <div className="w-full h-full relative">
            <WhiteboardCanvas isTeacherMode={role === "teacher"} />
          </div>
        )}

      </div>
    </div>
  )
}
