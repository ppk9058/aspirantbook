"use client"

import React, { useRef, useEffect } from "react"
import { Mic, MicOff, Pin, Volume2, ShieldCheck, Sparkles } from "lucide-react"
import type { ClassParticipant } from "@/lib/classroom-service"

interface VideoTileProps {
  participant: ClassParticipant
  stream?: MediaStream | null
  isPinned?: boolean
  onPin?: () => void
  isSelf?: boolean
  className?: string
  priority?: "primary" | "secondary"
}

export default function VideoTile({
  participant,
  stream,
  isPinned = false,
  onPin,
  isSelf = false,
  className = "",
  priority = "secondary",
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current) {
      if (stream && participant.isCameraOn) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.srcObject = null
      }
    }
  }, [stream, participant.isCameraOn])

  // Get monogram initial
  const initial = participant.name ? participant.name.trim().charAt(0).toUpperCase() : "U"

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden bg-[#0A0F1D] border transition-all duration-300 flex items-center justify-center select-none ${
        participant.isSpeaking
          ? "border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10"
          : "border-gray-800/80 hover:border-gray-700"
      } ${className}`}
    >
      {/* Real Video Element (if camera ON) */}
      {participant.isCameraOn && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf} // always mute self locally to avoid feedback
          className={`w-full h-full object-cover ${isSelf ? "transform -scale-x-100" : ""}`}
        />
      )}

      {/* Fallback Monogram Avatar (if camera OFF or stream absent) */}
      {(!participant.isCameraOn || !stream) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-gradient-to-b from-[#0D1527] to-[#0A0F1D]">
          {/* Avatar circle with speaking pulse */}
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-xl transition-all duration-300 ${
              participant.role === "host" || participant.role === "teacher"
                ? "bg-gradient-to-tr from-[#5B47FB] to-[#3AAFA9] border-2 border-white/20"
                : "bg-gradient-to-tr from-gray-700 to-gray-600 border border-gray-600"
            } ${participant.isSpeaking ? "scale-110 ring-4 ring-emerald-400/50" : ""}`}
          >
            {initial}
          </div>

          <div className="text-center px-4">
            <span className="text-xs sm:text-sm font-bold text-gray-200 block truncate max-w-[180px]">
              {participant.name}
            </span>
            <span className="text-[10px] text-gray-400">
              {participant.role === "host" ? "Host & Instructor" : "Student"}
            </span>
          </div>
        </div>
      )}

      {/* Speaking Glow Animation in Corner */}
      {participant.isSpeaking && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-black tracking-wide shadow-md backdrop-blur-xs animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>SPEAKING</span>
        </div>
      )}

      {/* Pin button if available */}
      {onPin && (
        <button
          onClick={onPin}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-lg backdrop-blur-md transition-all cursor-pointer ${
            isPinned
              ? "bg-[#5B47FB] text-white shadow-md"
              : "bg-black/50 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100"
          }`}
          title={isPinned ? "Unpin tile" : "Pin tile"}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bottom Info Bar: Name, Role & Mic status */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs font-bold truncate max-w-[80%]">
          {participant.role === "host" ? (
            <ShieldCheck className="h-3.5 w-3.5 text-[#3AAFA9] shrink-0" />
          ) : null}
          <span className="truncate">{participant.name}</span>
          {isSelf && <span className="text-[#3AAFA9] text-[10px]">(You)</span>}
        </div>

        {/* Mic Indicator Icon */}
        <div
          className={`p-1.5 rounded-lg backdrop-blur-md ${
            participant.isMicOn
              ? participant.isSpeaking
                ? "bg-emerald-500 text-white"
                : "bg-black/70 text-gray-300"
              : "bg-red-500/90 text-white"
          }`}
          title={participant.isMicOn ? "Microphone active" : "Microphone muted"}
        >
          {participant.isMicOn ? (
            <Mic className="h-3 w-3" />
          ) : (
            <MicOff className="h-3 w-3" />
          )}
        </div>
      </div>
    </div>
  )
}
