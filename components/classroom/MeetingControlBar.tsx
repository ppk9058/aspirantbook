"use client"

import React, { useState } from "react"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Hand,
  HelpCircle,
  BarChart2,
  Monitor,
  MonitorOff,
  Users,
  ClipboardList,
  PenTool,
  MoreVertical,
  PhoneOff,
  Radio,
  Sparkles,
  ChevronUp,
  Settings,
  AlertTriangle,
} from "lucide-react"

interface MeetingControlBarProps {
  role: "student" | "teacher"
  isCameraOn: boolean
  onToggleCamera: () => void
  isMicOn: boolean
  onToggleMic: () => void
  isSharingScreen: boolean
  onToggleScreenShare: () => void
  isHandRaised: boolean
  handQueuePosition?: number
  onToggleHandRaise: () => void
  activePanel: string | null
  onTogglePanel: (panel: "chat" | "participants" | "questions" | "polls" | "assessments" | "whiteboard" | null) => void
  unreadChatCount?: number
  pendingHandsCount?: number
  activePollCount?: number
  unansweredQuestionsCount?: number
  isRecording?: boolean
  onToggleRecording?: () => void
  onLeaveClass: () => void
  onEndClassForEveryone?: () => void
  speakerVolume: number
  onChangeVolume: (vol: number) => void
}

export default function MeetingControlBar({
  role,
  isCameraOn,
  onToggleCamera,
  isMicOn,
  onToggleMic,
  isSharingScreen,
  onToggleScreenShare,
  isHandRaised,
  handQueuePosition,
  onToggleHandRaise,
  activePanel,
  onTogglePanel,
  unreadChatCount = 0,
  pendingHandsCount = 0,
  activePollCount = 0,
  unansweredQuestionsCount = 0,
  isRecording = false,
  onToggleRecording,
  onLeaveClass,
  onEndClassForEveryone,
  speakerVolume,
  onChangeVolume,
}: MeetingControlBarProps) {
  const [showEndClassModal, setShowEndClassModal] = useState(false)
  const [showVolumePopover, setShowVolumePopover] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  return (
    <>
      {/* Floating Sticky Meeting Control Bar */}
      <footer className="h-16 sm:h-20 bg-[#090F1E] border-t border-gray-800/90 px-3 sm:px-6 flex items-center justify-between z-30 select-none shadow-2xl">
        
        {/* Left: Audio & Video Core Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Microphone Mute / Unmute */}
          <div className="flex flex-col items-center">
            <button
              onClick={onToggleMic}
              className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isMicOn
                  ? "bg-gray-800 hover:bg-gray-700 text-white hover:scale-105"
                  : "bg-red-600/90 hover:bg-red-600 text-white shadow-lg shadow-red-600/30"
              }`}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              {isMicOn ? "Mute" : "Unmute"}
            </span>
          </div>

          {/* Camera Start / Stop Video */}
          <div className="flex flex-col items-center">
            <button
              onClick={onToggleCamera}
              className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isCameraOn
                  ? "bg-gray-800 hover:bg-gray-700 text-white hover:scale-105"
                  : "bg-red-600/90 hover:bg-red-600 text-white shadow-lg shadow-red-600/30"
              }`}
              title={isCameraOn ? "Stop Video" : "Start Video"}
            >
              {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              {isCameraOn ? "Stop Video" : "Start Video"}
            </span>
          </div>

          {/* Speaker / Audio Volume popover */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => setShowVolumePopover(!showVolumePopover)}
              className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                speakerVolume === 0
                  ? "bg-red-600/20 text-red-400 border border-red-500/30"
                  : "bg-gray-800/80 hover:bg-gray-700 text-gray-200 hover:text-white"
              }`}
              title="Speaker Audio Controls"
            >
              {speakerVolume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              Speaker
            </span>

            {/* Volume Slider Popover */}
            {showVolumePopover && (
              <div className="absolute bottom-16 left-0 bg-[#16213D] border border-gray-700 rounded-2xl p-4 shadow-2xl w-48 space-y-3 animate-in fade-in zoom-in-95 duration-150 z-40">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                  <span>Speaker Volume</span>
                  <span className="font-mono text-[#3AAFA9]">{Math.round(speakerVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={speakerVolume}
                  onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#5B47FB] cursor-pointer"
                />
              </div>
            )}
          </div>

        </div>

        {/* Center: Educational Meeting Interaction Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* TEACHER ONLY: Screen Share */}
          {role === "teacher" && (
            <div className="flex flex-col items-center">
              <button
                onClick={onToggleScreenShare}
                className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  isSharingScreen
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
                }`}
                title={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
              >
                {isSharingScreen ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </button>
              <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
                {isSharingScreen ? "Stop Share" : "Share"}
              </span>
            </div>
          )}

          {/* TEACHER ONLY: Participants Panel */}
          {role === "teacher" && (
            <div className="flex flex-col items-center">
              <button
                onClick={() => onTogglePanel(activePanel === "participants" ? null : "participants")}
                className={`relative p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  activePanel === "participants"
                    ? "bg-[#5B47FB] text-white shadow-lg shadow-[#5B47FB]/30"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
                }`}
                title="Participant Roster & Moderation"
              >
                <Users className="h-5 w-5" />
                {pendingHandsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center border-2 border-[#090F1E]">
                    {pendingHandsCount}
                  </span>
                )}
              </button>
              <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
                Participants
              </span>
            </div>
          )}

          {/* Chat Panel Toggle */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onTogglePanel(activePanel === "chat" ? null : "chat")}
              className={`relative p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                activePanel === "chat"
                  ? "bg-[#5B47FB] text-white shadow-lg shadow-[#5B47FB]/30"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
              }`}
              title="Classroom Chat"
            >
              <MessageSquare className="h-5 w-5" />
              {unreadChatCount > 0 && activePanel !== "chat" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#3AAFA9] text-black text-[10px] font-black flex items-center justify-center border-2 border-[#090F1E]">
                  {unreadChatCount}
                </span>
              )}
            </button>
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              Chat
            </span>
          </div>

          {/* Student: Raise Hand / Teacher: Hands Queue */}
          <div className="flex flex-col items-center">
            {role === "student" ? (
              <button
                onClick={onToggleHandRaise}
                className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  isHandRaised
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30 animate-pulse font-black"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
                }`}
                title={isHandRaised ? `Hand Raised (Queue #${handQueuePosition || 1})` : "Raise Hand to speak"}
              >
                <Hand className={`h-5 w-5 ${isHandRaised ? "fill-black" : ""}`} />
              </button>
            ) : (
              <button
                onClick={() => onTogglePanel(activePanel === "participants" ? null : "participants")}
                className={`relative p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  pendingHandsCount > 0
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
                }`}
                title="Raised Hands Queue"
              >
                <Hand className="h-5 w-5" />
                {pendingHandsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center border-2 border-[#090F1E]">
                    {pendingHandsCount}
                  </span>
                )}
              </button>
            )}
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              {role === "student"
                ? isHandRaised
                  ? `#${handQueuePosition || 1} Raised`
                  : "Raise Hand"
                : `Hands (${pendingHandsCount})`}
            </span>
          </div>

          {/* Questions Panel */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onTogglePanel(activePanel === "questions" ? null : "questions")}
              className={`relative p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                activePanel === "questions"
                  ? "bg-[#5B47FB] text-white shadow-lg shadow-[#5B47FB]/30"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
              }`}
              title="Classroom Doubts & Questions"
            >
              <HelpCircle className="h-5 w-5" />
              {unansweredQuestionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500" />
              )}
            </button>
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              Questions
            </span>
          </div>

          {/* Polls Panel */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onTogglePanel(activePanel === "polls" ? null : "polls")}
              className={`relative p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                activePanel === "polls"
                  ? "bg-[#5B47FB] text-white shadow-lg shadow-[#5B47FB]/30"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
              }`}
              title="Live Conceptual Poll"
            >
              <BarChart2 className="h-5 w-5" />
              {activePollCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              Poll
            </span>
          </div>

          {/* Teacher: Assessment Trigger */}
          {role === "teacher" && (
            <div className="flex flex-col items-center hidden md:flex">
              <button
                onClick={() => onTogglePanel(activePanel === "assessments" ? null : "assessments")}
                className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  activePanel === "assessments"
                    ? "bg-[#5B47FB] text-white shadow-lg shadow-[#5B47FB]/30"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white"
                }`}
                title="Launch Live Concept Check"
              >
                <ClipboardList className="h-5 w-5" />
              </button>
              <span className="text-[10px] font-semibold text-gray-400 mt-1">
                Assessment
              </span>
            </div>
          )}

          {/* More Options Popover */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2.5 sm:p-3 rounded-2xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="More Classroom Tools"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            <span className="text-[10px] font-semibold text-gray-400 mt-1 hidden sm:block">
              More
            </span>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <div className="absolute bottom-16 right-0 bg-[#141C33] border border-gray-700 rounded-2xl p-2 shadow-2xl w-56 space-y-1 animate-in fade-in zoom-in-95 duration-150 z-40 text-xs">
                {role === "teacher" && (
                  <button
                    onClick={() => {
                      onTogglePanel("whiteboard")
                      setShowMoreMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-800 text-gray-200 hover:text-white flex items-center gap-2 cursor-pointer"
                  >
                    <PenTool className="h-4 w-4 text-[#3AAFA9]" />
                    <span>Digital Whiteboard</span>
                  </button>
                )}

                {role === "teacher" && onToggleRecording && (
                  <button
                    onClick={() => {
                      onToggleRecording()
                      setShowMoreMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-800 text-gray-200 hover:text-white flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Radio className={`h-4 w-4 ${isRecording ? "text-red-500 animate-pulse" : "text-gray-400"}`} />
                      <span>{isRecording ? "Recording Active" : "Record Class"}</span>
                    </div>
                    {isRecording && <span className="text-[9px] font-black text-red-400 uppercase">REC</span>}
                  </button>
                )}

                {role === "teacher" && (
                  <button
                    onClick={() => {
                      onTogglePanel("assessments")
                      setShowMoreMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-800 text-gray-200 hover:text-white flex items-center gap-2 cursor-pointer md:hidden"
                  >
                    <ClipboardList className="h-4 w-4 text-[#5B47FB]" />
                    <span>Launch Live Assessment</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right: Leave Class (Student) or End Class (Teacher) */}
        <div className="flex items-center">
          {role === "student" ? (
            <button
              onClick={onLeaveClass}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-red-600/20 hover:scale-105 cursor-pointer"
              title="Leave Class (Returns to Batch)"
            >
              Leave Class
            </button>
          ) : (
            <button
              onClick={() => setShowEndClassModal(true)}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-red-600/20 hover:scale-105 flex items-center gap-2 cursor-pointer"
              title="End Class for All Participants"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End Class</span>
            </button>
          )}
        </div>

      </footer>

      {/* Confirmation Modal for Teacher: End Class For Everyone */}
      {showEndClassModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#11192E] border border-gray-700 text-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-white">
                End class for everyone?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ending today&apos;s live lecture will finalize attendance tracking, release the Daily Practice Problem (DPP) to all students, and begin recording processing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndClassModal(false)}
                className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndClassModal(false)
                  if (onEndClassForEveryone) onEndClassForEveryone()
                }}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                End Class
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
