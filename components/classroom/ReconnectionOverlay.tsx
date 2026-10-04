"use client"

import React from "react"
import { WifiOff, RotateCcw, AlertTriangle } from "lucide-react"
import type { NetworkQualityState } from "@/lib/webrtc/classroom-webrtc"

interface ReconnectionOverlayProps {
  networkQuality: NetworkQualityState
  onRetryConnection?: () => void
}

export default function ReconnectionOverlay({
  networkQuality,
  onRetryConnection,
}: ReconnectionOverlayProps) {
  if (networkQuality === "excellent" || networkQuality === "good") {
    return null
  }

  if (networkQuality === "weak") {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-amber-500/90 text-black text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
        <AlertTriangle className="h-4 w-4 shrink-0 fill-black" />
        <span>Connection unstable &bull; Adapting stream quality to maintain live audio</span>
      </div>
    )
  }

  // Reconnecting state
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-200 select-none">
      <div className="p-4 rounded-3xl bg-[#131D36] border border-gray-700 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
          <WifiOff className="h-7 w-7 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h3 className="font-black text-base text-white">Connection lost</h3>
          <p className="text-xs text-gray-300">
            Trying to reconnect... Restoring your video and audio stream.
          </p>
        </div>

        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-red-500 h-full w-2/3 animate-indeterminate" />
        </div>

        {onRetryConnection && (
          <button
            onClick={onRetryConnection}
            className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reconnect Now</span>
          </button>
        )}
      </div>
    </div>
  )
}
