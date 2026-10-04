"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Settings,
  ShieldAlert,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
} from "lucide-react"
import type { LiveClassData } from "@/lib/classroom-service"
import {
  ClassroomWebRTCClient,
  MediaDeviceInfoSummary,
} from "@/lib/webrtc/classroom-webrtc"

interface PreJoinScreenProps {
  classroom: LiveClassData
  role: "student" | "teacher"
  onJoinClass: (settings: {
    cameraEnabled: boolean
    micEnabled: boolean
    selectedVideoDevice: string
    selectedAudioDevice: string
    selectedSpeakerDevice: string
    webrtcClient: ClassroomWebRTCClient
  }) => void
}

export default function PreJoinScreen({
  classroom,
  role,
  onJoinClass,
}: PreJoinScreenProps) {
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [micLevel, setMicLevel] = useState(0) // 0 - 100
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const [devices, setDevices] = useState<MediaDeviceInfoSummary[]>([])
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("")
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("")
  const [selectedSpeakerDevice, setSelectedSpeakerDevice] = useState<string>("")

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const webrtcClientRef = useRef<ClassroomWebRTCClient | null>(null)
  const [streamReady, setStreamReady] = useState(false)

  // Countdown timer simulation if upcoming
  const [countdownSeconds, setCountdownSeconds] = useState(151) // 02:31
  useEffect(() => {
    if (classroom.status !== "UPCOMING" && countdownSeconds <= 0) return
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [classroom.status, countdownSeconds])

  const mins = Math.floor(countdownSeconds / 60)
  const secs = countdownSeconds % 60
  const formattedCountdown = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`

  // Initialize WebRTC client & MediaDevices
  useEffect(() => {
    let client: ClassroomWebRTCClient | null = null
    let isMounted = true

    const init = async () => {
      client = new ClassroomWebRTCClient({
        onAudioLevel: (lvl) => {
          if (isMounted) setMicLevel(lvl)
        },
        onDeviceChange: (devs) => {
          if (isMounted) setDevices(devs)
        },
      })
      webrtcClientRef.current = client

      try {
        const stream = await client.initializeMedia({
          enableVideo: cameraEnabled,
          enableAudio: micEnabled,
        })

        if (!isMounted) return

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream
          videoPreviewRef.current.play().catch(() => {})
        }
        setStreamReady(true)

        // Enumerate devices
        const available = await client.getAvailableDevices()
        if (isMounted) {
          setDevices(available)
          const videoDev = available.find((d) => d.kind === "videoinput")
          const audioDev = available.find((d) => d.kind === "audioinput")
          const speakerDev = available.find((d) => d.kind === "audiooutput")
          if (videoDev) setSelectedVideoDevice(videoDev.deviceId)
          if (audioDev) setSelectedAudioDevice(audioDev.deviceId)
          if (speakerDev) setSelectedSpeakerDevice(speakerDev.deviceId)
        }
      } catch (err: any) {
        console.warn("Media init notice:", err)
        if (isMounted) {
          setPermissionError("Please allow camera and microphone access to fully participate in the live classroom.")
        }
      }
    }

    init()

    return () => {
      isMounted = false
      // Note: we do not destroy client here so it transfers seamlessly into the live classroom
    }
  }, [])

  // Sync camera toggle
  const handleToggleCamera = (enabled: boolean) => {
    setCameraEnabled(enabled)
    if (webrtcClientRef.current) {
      webrtcClientRef.current.setCameraEnabled(enabled)
    }
  }

  // Sync mic toggle
  const handleToggleMic = (enabled: boolean) => {
    setMicEnabled(enabled)
    if (webrtcClientRef.current) {
      webrtcClientRef.current.setMicrophoneEnabled(enabled)
    }
  }

  // Camera device change
  const handleCameraChange = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId)
    if (webrtcClientRef.current) {
      const newStream = await webrtcClientRef.current.switchCamera(deviceId)
      if (newStream && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream
      }
    }
  }

  // Microphone device change
  const handleMicChange = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId)
    if (webrtcClientRef.current) {
      await webrtcClientRef.current.switchMicrophone(deviceId)
    }
  }

  // Test Speaker chime
  const handleTestSpeaker = async () => {
    if (!webrtcClientRef.current || isTestingSpeaker) return
    setIsTestingSpeaker(true)
    await webrtcClientRef.current.playTestSpeakerTone()
    setTimeout(() => setIsTestingSpeaker(false), 500)
  }

  // Join Action
  const handleProceed = () => {
    if (!webrtcClientRef.current) return
    onJoinClass({
      cameraEnabled,
      micEnabled,
      selectedVideoDevice,
      selectedAudioDevice,
      selectedSpeakerDevice,
      webrtcClient: webrtcClientRef.current,
    })
  }

  const videoDevices = devices.filter((d) => d.kind === "videoinput")
  const audioDevices = devices.filter((d) => d.kind === "audioinput")
  const speakerDevices = devices.filter((d) => d.kind === "audiooutput")

  // Generate 12 meter segments for visualizer (e.g. ████████░░░░)
  const activeSegments = Math.round((micLevel / 100) * 12)

  return (
    <div className="min-h-screen w-full bg-[#080C16] text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 select-none">
      <div className="w-full max-w-4xl bg-[#0F172A] border border-gray-800/90 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Section: Class & Topic Info */}
        <div className="p-6 sm:p-8 border-b border-gray-800/80 bg-gradient-to-r from-[#111C35] via-[#0F172A] to-[#111C35]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#3AAFA9] bg-[#3AAFA9]/10 border border-[#3AAFA9]/30 px-2.5 py-0.5 rounded-full">
                  {classroom.batchTitle || "UPSC FOUNDATION"}
                </span>
                <span className="text-[11px] font-semibold text-gray-400">
                  {classroom.classTag || "Polity"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {classroom.topicTitle || "Fundamental Rights — Article 14"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-2">
                <span>Teacher:</span>
                <span className="text-white font-bold">{classroom.teacher.name}</span>
                <span className="text-gray-500">&bull;</span>
                <span className="text-gray-400">{classroom.teacher.role}</span>
              </p>
            </div>

            {/* Status / Countdown */}
            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
              {classroom.status === "LIVE" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-black tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>🔴 LIVE NOW</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#172554] border border-blue-500/30 text-blue-300">
                  <Clock className="h-4 w-4 animate-pulse text-blue-400" />
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-bold text-blue-400 block">Starts in</span>
                    <span className="font-mono text-sm font-black text-white">{formattedCountdown}</span>
                  </div>
                </div>
              )}
              <div className="text-[11px] text-gray-400">
                {role === "teacher" ? "👨‍🏫 Instructor Check" : "🎓 Student Check"}
              </div>
            </div>
          </div>
        </div>

        {/* Permission Guidance Banner if blocked or missing */}
        {permissionError && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-3 flex items-center gap-3 text-amber-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1">
              <span className="font-bold">Hardware Notice:</span> {permissionError}
              <span className="text-amber-200/80 ml-1">(A simulated studio feed will be used so you can continue testing.)</span>
            </div>
          </div>
        )}

        {/* Body Section: Preview & Device Setup */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Camera Preview (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-inner flex items-center justify-center">
              {/* Video Element */}
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                  cameraEnabled ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              />

              {/* Camera OFF Avatar Fallback */}
              {!cameraEnabled && (
                <div className="absolute inset-0 bg-[#0F172A] flex flex-col items-center justify-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#5B47FB] to-[#3AAFA9] flex items-center justify-center shadow-lg border-2 border-white/20 text-2xl font-black text-white">
                    {role === "teacher"
                      ? classroom.teacher.name.charAt(0)
                      : "S"}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">
                      {role === "teacher" ? classroom.teacher.name : "You (Student)"}
                    </p>
                    <span className="text-[11px] text-gray-400">Camera is turned off</span>
                  </div>
                </div>
              )}

              {/* Active mic speaking indicator badge on preview */}
              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                <div
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-colors ${
                    micEnabled
                      ? micLevel > 14
                        ? "bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-black/60 text-gray-300"
                      : "bg-red-500/80 text-white"
                  }`}
                >
                  {micEnabled ? (
                    <>
                      <Mic className="h-3.5 w-3.5" />
                      <span>{micLevel > 14 ? "Speaking" : "Mic ON"}</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="h-3.5 w-3.5" />
                      <span>Muted</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status watermark */}
              <div className="absolute top-3 right-3 text-[10px] font-mono font-bold bg-black/60 text-gray-300 px-2 py-0.5 rounded backdrop-blur-xs">
                {cameraEnabled ? "720p HD Preview" : "Video Disabled"}
              </div>
            </div>

            {/* Direct Quick Toggle Buttons Under Preview */}
            <div className="grid grid-cols-2 gap-3">
              {/* Camera ON / OFF Toggle */}
              <div className="flex items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => handleToggleCamera(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    cameraEnabled
                      ? "bg-[#5B47FB] text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Camera ON</span>
                </button>
                <button
                  onClick={() => handleToggleCamera(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !cameraEnabled
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <VideoOff className="h-3.5 w-3.5" />
                  <span>Camera OFF</span>
                </button>
              </div>

              {/* Mic ON / OFF Toggle */}
              <div className="flex items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => handleToggleMic(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    micEnabled
                      ? "bg-[#3AAFA9] text-black shadow-sm font-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Mic ON</span>
                </button>
                <button
                  onClick={() => handleToggleMic(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !micEnabled
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <MicOff className="h-3.5 w-3.5" />
                  <span>Join Muted</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Device Selectors & Audio Test (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              
              {/* 1. Camera Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-[#5B47FB]" />
                  <span>Camera</span>
                </label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full bg-[#1E293B] border border-gray-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#5B47FB] cursor-pointer"
                >
                  {videoDevices.length > 0 ? (
                    videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))
                  ) : (
                    <option value="default">Default Built-in HD Camera</option>
                  )}
                </select>
              </div>

              {/* 2. Microphone Selector & Input Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-[#3AAFA9]" />
                    <span>Microphone</span>
                  </label>
                  <span className="text-[10px] text-gray-400">
                    {micEnabled ? "Speak to test input" : "Muted"}
                  </span>
                </div>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => handleMicChange(e.target.value)}
                  className="w-full bg-[#1E293B] border border-gray-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#3AAFA9] cursor-pointer"
                >
                  {audioDevices.length > 0 ? (
                    audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))
                  ) : (
                    <option value="default">Default Internal Microphone</option>
                  )}
                </select>

                {/* Real-Time Microphone Level Visualizer */}
                <div className="pt-1 bg-gray-900/60 p-2 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>Microphone level:</span>
                    <span className="font-mono text-emerald-400 font-bold">{micEnabled ? `${micLevel}%` : "OFF"}</span>
                  </div>
                  {/* Visual Bar segments */}
                  <div className="flex items-center gap-1 h-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-full rounded-full transition-all duration-75 ${
                          micEnabled && i < activeSegments
                            ? i > 9
                              ? "bg-red-500"
                              : i > 6
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                            : "bg-gray-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Speaker Selector & Test Sound */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-orange-400" />
                    <span>Speaker / Audio Output</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleTestSpeaker}
                    disabled={isTestingSpeaker}
                    className="text-[11px] font-bold text-[#3AAFA9] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" />
                    <span>{isTestingSpeaker ? "Playing Tone..." : "Test Speaker"}</span>
                  </button>
                </div>
                <select
                  value={selectedSpeakerDevice}
                  onChange={(e) => setSelectedSpeakerDevice(e.target.value)}
                  className="w-full bg-[#1E293B] border border-gray-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 cursor-pointer"
                >
                  {speakerDevices.length > 0 ? (
                    speakerDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))
                  ) : (
                    <option value="default">Default Built-in Speakers / Headphones</option>
                  )}
                </select>
              </div>

            </div>

            {/* Bottom Actions: Enter Classroom */}
            <div className="pt-4 border-t border-gray-800 space-y-3">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#5B47FB] to-[#3AAFA9] hover:from-[#4C38EA] hover:to-[#2F9E98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-[#5B47FB]/25 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{role === "teacher" ? "Start Class" : "Join Class"}</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>WebRTC Low Latency &bull; End-to-End Encrypted</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
