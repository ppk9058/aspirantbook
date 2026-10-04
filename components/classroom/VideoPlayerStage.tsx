"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Shield,
  Zap,
  Subtitles,
  RotateCcw,
  Sparkles,
} from "lucide-react"

interface VideoPlayerStageProps {
  streamUrl: string
  teacherName: string
  onCurrentTimeChange?: (seconds: number) => void
  dataSaver: boolean
  isLive?: boolean
  showLiveBadge?: boolean
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
const QUALITIES = ["Auto (1080p)", "1080p HD", "720p", "480p", "360p", "Audio Only"]

export default function VideoPlayerStage({
  streamUrl,
  teacherName,
  onCurrentTimeChange,
  dataSaver,
  isLive = true,
  showLiveBadge = true,
}: VideoPlayerStageProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.9)
  const [currentSpeed, setCurrentSpeed] = useState(1)
  const [currentQuality, setCurrentQuality] = useState("Auto (1080p)")
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showCaptions, setShowCaptions] = useState(true)
  const [playedSeconds, setPlayedSeconds] = useState(2460) // 41 min in
  const [duration, setDuration] = useState(3600) // 60 mins
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  const onCurrentTimeChangeRef = useRef(onCurrentTimeChange)
  useEffect(() => {
    onCurrentTimeChangeRef.current = onCurrentTimeChange
  }, [onCurrentTimeChange])

  // Simulation timer for elapsed playback (pure state update)
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setPlayedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying])

  // Notify parent of elapsed seconds safely in an effect cycle
  useEffect(() => {
    onCurrentTimeChangeRef.current?.(playedSeconds)
  }, [playedSeconds])

  // Auto-hide controls after inactivity
  const handleMouseMove = () => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false)
      setShowSpeedMenu(false)
      setShowQualityMenu(false)
    }, 3500)
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none group"
    >
      {/* Video Content / Iframe / Canvas */}
      <div className="relative w-full h-full">
        <iframe
          src={streamUrl}
          title="Live Lecture Stream"
          className="w-full h-full object-cover border-0 pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* Dynamic Security Watermark (Anti-Piracy) */}
      <div className="absolute top-8 right-12 z-20 pointer-events-none opacity-20 text-[11px] font-mono text-white tracking-widest select-none transform rotate-[-12deg]">
        STU-94021 • 103.21.58.x • LIVE
      </div>

      {/* Floating Live Indicator Top Left */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {showLiveBadge && (
          isLive ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-black tracking-wider shadow-lg backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>LIVE STREAM</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-purple-600/90 text-white text-xs font-bold shadow-lg">
              REPLAY
            </div>
          )
        )}
        {dataSaver && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-black text-[10px] font-black uppercase shadow-lg">
            <Zap className="h-3 w-3 fill-black" />
            <span>Data Saver</span>
          </div>
        )}
      </div>

      {/* Closed Captions / Subtitles Overlay */}
      {showCaptions && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-xl text-center px-4 py-1.5 rounded-lg bg-black/80 backdrop-blur-xs border border-white/10 text-white text-xs sm:text-sm font-medium leading-snug animate-in fade-in duration-200 pointer-events-none">
          &ldquo;Notice how the pendulum repeats its position at fixed time intervals, which defines periodic motion.&rdquo;
        </div>
      )}

      {/* Bottom Video Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Scrubber Bar */}
        <div className="relative w-full h-1.5 bg-gray-700/80 hover:h-2.5 transition-all rounded-full cursor-pointer mb-3 group/bar">
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-[#F26522] rounded-full"
            style={{ width: `${(playedSeconds / duration) * 100}%` }}
          />
          {/* Scrubber thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `${(playedSeconds / duration) * 100}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3 text-white text-xs">
          {/* Left: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            </button>

            {/* Mute/Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value))
                  setIsMuted(false)
                }}
                className="w-16 h-1 bg-gray-600 rounded-lg accent-[#F26522] cursor-pointer"
              />
            </div>

            {/* Time Stamp */}
            <span className="font-mono text-xs text-gray-300">
              {formatTime(playedSeconds)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Captions, Speed, Quality */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Captions Toggle */}
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showCaptions ? "text-[#3AAFA9] bg-white/10" : "text-gray-400 hover:text-white"
              }`}
              title="Toggle Captions"
            >
              <Subtitles className="h-4 w-4" />
            </button>

            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu)
                  setShowQualityMenu(false)
                }}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-xs transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {currentSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 bg-[#0F172A] border border-gray-700 rounded-xl p-1.5 shadow-2xl space-y-0.5 z-40 min-w-[90px]">
                  {PLAYBACK_SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setCurrentSpeed(spd)
                        setShowSpeedMenu(false)
                      }}
                      className={`w-full text-left px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        currentSpeed === spd ? "bg-[#5B47FB] font-bold text-white" : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu)
                  setShowSpeedMenu(false)
                }}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-xs transition-colors cursor-pointer"
                title="Stream Quality"
              >
                {currentQuality.split(" ")[0]}
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-10 right-0 bg-[#0F172A] border border-gray-700 rounded-xl p-1.5 shadow-2xl space-y-0.5 z-40 min-w-[130px]">
                  {QUALITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setCurrentQuality(q)
                        setShowQualityMenu(false)
                      }}
                      className={`w-full text-left px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        currentQuality === q ? "bg-[#5B47FB] font-bold text-white" : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
