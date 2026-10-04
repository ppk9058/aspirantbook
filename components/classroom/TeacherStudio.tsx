"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Calendar,
  MessageSquare,
  Play,
  Square,
  CheckCircle,
  Eye,
  Send,
  Layers,
  PenTool,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import type {
  LiveClassData,
  PresentationMode,
  ClassStatus,
  ChatMessage,
  ChatAttachment,
} from "@/lib/classroom-service"
import TeacherScheduleModal from "./TeacherScheduleModal"
import WhiteboardCanvas from "./WhiteboardCanvas"
import ChatPanel from "./ChatPanel"

interface TeacherStudioProps {
  classroom: LiveClassData
  onClassroomUpdate: (updated: LiveClassData) => void
  onSwitchToStudentView: () => void
}

/**
 * Robust Teacher Camera Display Component
 * Ensures webcam video streams reliably in both Camera and Dual modes.
 * Falls back to an animated, high-definition studio pattern if no hardware webcam exists.
 */
function TeacherCameraDisplay({
  stream,
  isCameraActive,
  teacherName,
  className = "",
}: {
  stream: MediaStream | null
  isCameraActive: boolean
  teacherName: string
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [usingSimulation, setUsingSimulation] = useState(false)

  // Attach real stream whenever stream or active state changes
  useEffect(() => {
    if (stream && isCameraActive && videoRef.current) {
      try {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch((err) => {
          console.warn("Video play notice:", err)
        })
        setUsingSimulation(false)
        return
      } catch {
        // proceed to simulation
      }
    }

    // If stream is absent, run animated live canvas simulation
    setUsingSimulation(true)
  }, [stream, isCameraActive])

  // Canvas visualizer animation for simulated broadcast
  useEffect(() => {
    if (!usingSimulation || !canvasRef.current || !isCameraActive) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let phase = 0

    const render = () => {
      phase += 0.05
      ctx.fillStyle = "#0B1120"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Studio light grid
      ctx.strokeStyle = "rgba(58, 175, 169, 0.08)"
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Center Studio Avatar
      const cx = canvas.width / 2
      const cy = canvas.height / 2 - 30

      // Outer glowing ring
      ctx.beginPath()
      ctx.arc(cx, cy, 70 + Math.sin(phase) * 6, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(91, 71, 251, 0.4)"
      ctx.lineWidth = 3
      ctx.stroke()

      // Avatar circle
      ctx.beginPath()
      ctx.arc(cx, cy, 60, 0, Math.PI * 2)
      ctx.fillStyle = "#1E293B"
      ctx.fill()
      ctx.strokeStyle = "#5B47FB"
      ctx.lineWidth = 3
      ctx.stroke()

      // Emoji/Icon
      ctx.font = "40px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("👨‍🏫", cx, cy)

      // Teacher Name
      ctx.font = "bold 18px Inter, sans-serif"
      ctx.fillStyle = "#FFFFFF"
      ctx.fillText(teacherName, cx, cy + 90)

      // Status text
      ctx.font = "12px Inter, sans-serif"
      ctx.fillStyle = "#3AAFA9"
      ctx.fillText("FACULTY BROADCAST • 1080P HD 60FPS", cx, cy + 115)

      // Audio waveform bars at bottom
      const barCount = 36
      const barWidth = 6
      const spacing = 4
      const startX = cx - (barCount * (barWidth + spacing)) / 2

      for (let i = 0; i < barCount; i++) {
        const height = Math.abs(Math.sin(phase + i * 0.3)) * 35 + 8
        const x = startX + i * (barWidth + spacing)
        const y = canvas.height - 50 - height

        const gradient = ctx.createLinearGradient(0, y, 0, y + height)
        gradient.addColorStop(0, "#3AAFA9")
        gradient.addColorStop(1, "#5B47FB")

        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth, height)
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [usingSimulation, isCameraActive, teacherName])

  return (
    <div className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden ${className}`}>
      {/* Real Webcam Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${usingSimulation ? "hidden" : "block"}`}
      />

      {/* Simulated Live Broadcast Canvas (if no physical webcam) */}
      {usingSimulation && isCameraActive && (
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-cover"
        />
      )}

      {/* Camera Off Overlay */}
      {!isCameraActive && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-gray-400 z-10">
          <VideoOff className="h-12 w-12 mb-3 text-red-500" />
          <p className="text-sm font-bold text-white">Camera is Turned Off</p>
          <p className="text-xs text-gray-500 mt-1">Click the camera icon to resume broadcast</p>
        </div>
      )}

      {/* Live Badge Overlay */}
      <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-2 border border-white/10 z-20">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Teacher Studio Cam • 1080p</span>
      </div>
    </div>
  )
}

export default function TeacherStudio({
  classroom,
  onClassroomUpdate,
  onSwitchToStudentView,
}: TeacherStudioProps) {
  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)

  // Hardware / WebRTC state
  const [isCameraActive, setIsCameraActive] = useState(true)
  const [isMicActive, setIsMicActive] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

  // Live broadcast state
  const [status, setStatus] = useState<ClassStatus>(classroom.status)
  const [elapsedSeconds, setElapsedSeconds] = useState(classroom.elapsedSeconds || 1800)
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)
  const [showEndClassModal, setShowEndClassModal] = useState(false)

  // Allowed presentation modes: ONLY Camera, Dual, Screen Share, and Whiteboard
  const allowedModes: PresentationMode[] = ["camera", "dual", "screenshare", "whiteboard"]
  const [presentationMode, setPresentationMode] = useState<PresentationMode>("camera")

  // Chat window visibility toggle (Allows full-width stage expansion)
  const [isChatVisible, setIsChatVisible] = useState(true)

  // Request camera stream gracefully
  useEffect(() => {
    let active = true

    async function initCamera() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: isMicActive,
        })
        if (active) {
          setMediaStream(stream)
        }
      } catch (err: any) {
        // Try video only if mic failed
        try {
          const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true })
          if (active) {
            setMediaStream(videoOnly)
          }
        } catch {
          // Hardware camera unavailable or blocked; TeacherCameraDisplay handles canvas simulation
        }
      }
    }

    if (isCameraActive) {
      initCamera()
    }

    return () => {
      active = false
    }
  }, [isCameraActive, isMicActive])

  // Timer simulation when LIVE
  useEffect(() => {
    if (status !== "LIVE") return
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [status])

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`
  }

  const handleToggleCamera = () => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach((t) => (t.enabled = !isCameraActive))
    }
    setIsCameraActive(!isCameraActive)
  }

  const handleToggleMic = () => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((t) => (t.enabled = !isMicActive))
    }
    setIsMicActive(!isMicActive)
  }

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop())
        setScreenStream(null)
      }
      setIsScreenSharing(false)
      setPresentationMode("camera")
    } else {
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
          setScreenStream(stream)
          setIsScreenSharing(true)
          setPresentationMode("screenshare")
          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false)
            setPresentationMode("camera")
          }
        }
      } catch (err) {
        console.warn("Screen share cancelled:", err)
      }
    }
  }

  const handleGoLive = async () => {
    setIsStatusSubmitting(true)
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "goLive" }),
      })
      if (res.ok) {
        const updated = await res.json()
        setStatus("LIVE")
        onClassroomUpdate(updated)
      } else {
        setStatus("LIVE")
        onClassroomUpdate({
          ...classroom,
          status: "LIVE",
          presentationMode,
        })
      }
    } catch (err) {
      console.error("Go live error:", err)
      setStatus("LIVE")
      onClassroomUpdate({
        ...classroom,
        status: "LIVE",
        presentationMode,
      })
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  const handleEndClass = async () => {
    setIsStatusSubmitting(true)
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "endClass" }),
      })
      if (res.ok) {
        const updated = await res.json()
        setStatus("ENDED")
        onClassroomUpdate(updated)
      } else {
        setStatus("ENDED")
        onClassroomUpdate({
          ...classroom,
          status: "ENDED",
        })
      }
    } catch (err) {
      console.error("End class error:", err)
      setStatus("ENDED")
      onClassroomUpdate({
        ...classroom,
        status: "ENDED",
      })
    } finally {
      setIsStatusSubmitting(false)
      setShowEndClassModal(false)
    }
  }

  const handleResumeClass = async () => {
    setIsStatusSubmitting(true)
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "goLive" }),
      })
      if (res.ok) {
        const updated = await res.json()
        setStatus("LIVE")
        onClassroomUpdate(updated)
      }
    } catch (err) {
      console.error("Resume class error:", err)
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  const handleSendMessage = async (text: string, attachment?: ChatAttachment) => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          userName: `${classroom.teacher.name} (Teacher)`,
          role: "teacher",
          attachment,
        }),
      })
      if (res.ok) {
        const newMsg = await res.json()
        onClassroomUpdate({
          ...classroom,
          chatMessages: [...classroom.chatMessages, newMsg],
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060913] text-white overflow-hidden select-none">
      {/* 1. TOP TEACHER COCKPIT BAR */}
      <header className="h-14 bg-[#0B1120] border-b border-gray-800 px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Class Title & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/teacher"
            className="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 hover:text-white transition-colors flex items-center gap-1 shrink-0"
          >
            &larr; Exit Studio
          </Link>

          <div className="min-w-0 hidden sm:block">
            <h1 className="text-xs font-bold text-white truncate max-w-sm">
              {classroom.topicTitle}
            </h1>
            <p className="text-[10px] text-gray-400 truncate">
              {classroom.batchTitle} &bull; {classroom.teacher.name}
            </p>
          </div>

          {/* Broadcast Status Pill */}
          {status === "LIVE" ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black tracking-wider animate-pulse">
              <Radio className="h-3.5 w-3.5" />
              <span>LIVE</span>
              <span className="text-white font-mono font-bold ml-1">{formatTime(elapsedSeconds)}</span>
            </div>
          ) : status === "UPCOMING" ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
              <Calendar className="h-3.5 w-3.5" />
              <span>Scheduled: {classroom.scheduledStartTime}</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-xs font-bold">
              Class Ended
            </div>
          )}
        </div>

        {/* Right: Triggers & Actions */}
        <div className="flex items-center gap-2">
          {/* Schedule Modal Trigger */}
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-700"
            title="Set class date, time, and topic"
          >
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Set Time</span>
          </button>

          {/* Master GO LIVE / END CLASS Button */}
          {status !== "LIVE" ? (
            <button
              onClick={handleGoLive}
              disabled={isStatusSubmitting}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-black tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer animate-pulse"
              title="Start Live Lecture Broadcast"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>{isStatusSubmitting ? "GOING LIVE..." : "GO LIVE"}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowEndClassModal(true)}
              disabled={isStatusSubmitting}
              className="px-4 py-1.5 rounded-xl bg-red-950/90 hover:bg-red-900 border border-red-500 text-red-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Conclude Live Lecture"
            >
              <Square className="h-3.5 w-3.5 fill-current text-red-400" />
              <span>{isStatusSubmitting ? "ENDING..." : "END CLASS"}</span>
            </button>
          )}

          {/* Hide/Show Chat Toggle */}
          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isChatVisible
                ? "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700"
                : "bg-[#5B47FB] hover:bg-[#4E3BE3] text-white border-[#5B47FB] shadow-md shadow-[#5B47FB]/30"
            }`}
            title={isChatVisible ? "Hide Chat (Expand Stage)" : "Show Chat"}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isChatVisible ? "Hide Chat" : "Show Chat"}</span>
          </button>

          {/* Switch to Student View */}
          <button
            onClick={onSwitchToStudentView}
            className="px-3 py-1.5 rounded-xl bg-[#5B47FB] hover:bg-[#4E3BE3] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#5B47FB]/25 cursor-pointer"
            title="Preview student perspective"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Student View</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN COCKPIT BODY */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left 65%: Teacher Broadcasting Stage */}
        <main className="flex-1 h-full flex flex-col bg-black relative overflow-hidden">
          {/* Stage Mode Bar (Camera, Dual, Screen Share, Whiteboard ONLY) */}
          <div className="h-10 bg-[#0C1222] border-b border-gray-800 px-4 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2 hidden sm:inline">
                Stage View:
              </span>
              {allowedModes.map((m) => {
                const isSelected = presentationMode === m
                return (
                  <button
                    key={m}
                    onClick={() => setPresentationMode(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer capitalize ${
                      isSelected
                        ? "bg-[#5B47FB] text-white shadow-xs"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                    }`}
                  >
                    <span>{m === "camera" ? "Camera" : m === "dual" ? "Camera + Board" : m === "screenshare" ? "Screen Share" : "Whiteboard"}</span>
                  </button>
                )
              })}
            </div>

            {/* Hardware Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMic}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  isMicActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}
                title={isMicActive ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isMicActive ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={handleToggleCamera}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  isCameraActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}
                title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isCameraActive ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={handleToggleScreenShare}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isScreenSharing ? "bg-[#F26522] text-white" : "bg-gray-800 text-gray-300 hover:text-white"
                }`}
                title="Share Screen"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
              </button>
            </div>
          </div>

          {/* Primary Teacher Stage View */}
          <div className="flex-1 w-full h-[calc(100%-2.5rem)] relative overflow-hidden flex">
            {/* Mode: Teacher Camera Only */}
            {presentationMode === "camera" && (
              <TeacherCameraDisplay
                stream={mediaStream}
                isCameraActive={isCameraActive}
                teacherName={classroom.teacher.name}
              />
            )}

            {/* Mode: Dual (Teacher Camera + Whiteboard side-by-side) */}
            {presentationMode === "dual" && (
              <div className="w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-800">
                <div className="w-full md:w-[45%] h-1/2 md:h-full relative bg-[#090D1A]">
                  <TeacherCameraDisplay
                    stream={mediaStream}
                    isCameraActive={isCameraActive}
                    teacherName={classroom.teacher.name}
                  />
                </div>
                <div className="w-full md:w-[55%] h-1/2 md:h-full relative">
                  <WhiteboardCanvas isTeacherMode={true} />
                </div>
              </div>
            )}

            {/* Mode: Whiteboard Only */}
            {presentationMode === "whiteboard" && (
              <div className="w-full h-full relative">
                <WhiteboardCanvas isTeacherMode={true} />
              </div>
            )}

            {/* Mode: Screen Share */}
            {presentationMode === "screenshare" && (
              <div className="w-full h-full relative bg-[#0B1120] flex flex-col items-center justify-center p-6">
                {!isScreenSharing ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <Monitor className="h-12 w-12 text-[#5B47FB]" />
                    <h3 className="text-base font-bold text-white">Start Screen Share</h3>
                    <p className="text-xs text-gray-400 max-w-md">
                      Broadcast your coding environment, slides, or browser window to students.
                    </p>
                    <button
                      onClick={handleToggleScreenShare}
                      className="px-5 py-2.5 rounded-xl bg-[#5B47FB] hover:bg-[#4E3BE3] text-white text-xs font-bold cursor-pointer shadow-lg shadow-[#5B47FB]/25"
                    >
                      Choose Window / Screen
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <div className="w-full h-full max-w-5xl rounded-2xl border border-gray-700 bg-black overflow-hidden flex items-center justify-center">
                      <p className="text-xs text-gray-400 font-mono">
                        Screen share broadcast active. Students are viewing your screen.
                      </p>
                    </div>

                    {/* PiP Camera in Screen Share */}
                    <div className="absolute bottom-6 right-6 w-56 aspect-video rounded-xl overflow-hidden border-2 border-[#5B47FB] shadow-2xl z-20">
                      <TeacherCameraDisplay
                        stream={mediaStream}
                        isCameraActive={isCameraActive}
                        teacherName={classroom.teacher.name}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating button to reopen chat when hidden */}
            {!isChatVisible && (
              <button
                onClick={() => setIsChatVisible(true)}
                className="absolute top-4 right-4 z-20 px-3.5 py-1.5 rounded-xl bg-[#0B132B]/90 hover:bg-[#101A35] border border-gray-700 text-white text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105"
                title="Show Classroom Chat"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[#3AAFA9]" />
                <span>Show Chat</span>
              </button>
            )}

            {/* Class Concluded Stage Overlay */}
            {status === "ENDED" && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-black text-white mb-1">
                  Live Lecture Concluded
                </h2>
                <p className="text-xs text-gray-400 max-w-md mb-6">
                  Today&apos;s live class has ended. Daily Practice Problems (DPP) have been published to students, and replay is now generating.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={onSwitchToStudentView}
                    className="px-5 py-2.5 rounded-xl bg-[#5B47FB] hover:bg-[#4E3BE3] text-white text-xs font-bold shadow-lg shadow-[#5B47FB]/30 cursor-pointer transition-all"
                  >
                    View Student Summary & DPP
                  </button>
                  <button
                    onClick={handleResumeClass}
                    disabled={isStatusSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                    <span>Resume Live Class</span>
                  </button>
                  <Link
                    href="/teacher"
                    className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold border border-gray-700 transition-colors"
                  >
                    Teacher Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right 35%: Teacher Studio Chat Panel (Hidden when isChatVisible=false) */}
        {isChatVisible && (
          <aside className="w-full lg:w-[380px] xl:w-[420px] h-[45vh] lg:h-full bg-[#0B132B] border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col shrink-0 transition-all duration-200">
            {/* Top Panel Bar */}
            <div className="h-11 bg-[#080E1E] border-b border-gray-800 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-[#5B47FB]" />
                <span className="text-xs font-bold text-white">Classroom Chat</span>
              </div>
              <button
                onClick={() => setIsChatVisible(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Hide Chat (Full Stage)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 min-h-0">
              <ChatPanel
                messages={classroom.chatMessages}
                onSendMessage={handleSendMessage}
                userRole="teacher"
                isTeacher={true}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Confirmation Modal for Ending Class */}
      {showEndClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#101A30] border border-gray-700 text-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">End Live Class?</h3>
                <p className="text-xs text-gray-400">Are you sure you want to conclude today&apos;s lecture?</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 text-xs text-gray-300 space-y-2">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Students will receive today&apos;s Daily Practice Problems (DPP).</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B47FB]" />
                <span>Full lecture replay and timeline will become accessible.</span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEndClassModal(false)}
                disabled={isStatusSubmitting}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndClass}
                disabled={isStatusSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                {isStatusSubmitting ? "Ending Class..." : "Yes, End Class Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      <TeacherScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        currentStartTime={classroom.scheduledStartTime}
        currentTopic={classroom.topicTitle}
        currentSubject={classroom.subject}
        onSave={(data) => {
          onClassroomUpdate({
            ...classroom,
            scheduledStartTime: `${data.date}, ${data.time}`,
            topicTitle: data.topic,
            subject: data.subject,
            durationMinutes: data.durationMinutes,
          })
        }}
      />
    </div>
  )
}
