"use client"

import React, { useState } from "react"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PenTool,
  BarChart2,
  ClipboardList,
  MessageSquare,
  Megaphone,
  PhoneOff,
  MoreVertical,
  CheckCircle2,
  HelpCircle,
} from "lucide-react"
import type { PresentationMode } from "@/lib/classroom-service"

interface TeacherControlBarProps {
  currentMode: PresentationMode
  onModeChange: (mode: PresentationMode) => void
  onEndClass: () => void
  onSendAnnouncement: (text: string) => void
}

export default function TeacherControlBar({
  currentMode,
  onModeChange,
  onEndClass,
  onSendAnnouncement,
}: TeacherControlBarProps) {
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [announcementText, setAnnouncementText] = useState("")

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcementText.trim()) return
    onSendAnnouncement(announcementText.trim())
    setAnnouncementText("")
    setShowAnnouncementModal(false)
  }

  return (
    <div className="bg-[#0B132B] border-t border-gray-800 px-4 py-2.5 flex items-center justify-between z-30 select-none">
      {/* Teacher Label & Mic/Camera Status */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-800/80 px-2 py-1 rounded">
          Teacher Console
        </span>
        <button
          onClick={() => setMicOn(!micOn)}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            micOn ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
          title={micOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setCamOn(!camOn)}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            camOn ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
          title={camOn ? "Turn Camera Off" : "Turn Camera On"}
        >
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Presentation Modes Quick Switcher */}
      <div className="hidden sm:flex items-center gap-1.5 bg-gray-900/60 p-1 rounded-xl border border-gray-800">
        <button
          onClick={() => onModeChange("camera")}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentMode === "camera" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
          }`}
          title="Camera View"
        >
          <Video className="h-4 w-4" />
        </button>
        <button
          onClick={() => onModeChange("whiteboard")}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentMode === "whiteboard" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
          }`}
          title="Digital Whiteboard"
        >
          <PenTool className="h-4 w-4" />
        </button>
        <button
          onClick={() => onModeChange("screenshare")}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentMode === "screenshare" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
          }`}
          title="Screen Share"
        >
          <Monitor className="h-4 w-4" />
        </button>
      </div>

      {/* Classroom Interaction Triggers */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAnnouncementModal(true)}
          className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Broadcast Pinned Announcement to Chat"
        >
          <Megaphone className="h-4 w-4" />
          <span className="hidden md:inline">Announcement</span>
        </button>

        {/* End Class Action */}
        <button
          onClick={onEndClass}
          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          title="End Live Class"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          <span>End Class</span>
        </button>
      </div>

      {/* Announcement Broadcast Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleBroadcast}
            className="bg-[#101A30] border border-gray-700 text-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-orange-400">
                <Megaphone className="h-4 w-4" />
                <span>Broadcast Teacher Announcement</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <textarea
              rows={3}
              required
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. Please solve Question 3 before the timer finishes!"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-xs font-bold"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F26522] hover:bg-[#E05310] text-white rounded-xl text-xs font-bold shadow-md"
              >
                Pin to Chat
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
