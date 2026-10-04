"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import MeetingTopBar from "./MeetingTopBar"
import MeetingControlBar from "./MeetingControlBar"
import VideoClassroomStage from "./VideoClassroomStage"
import ClassroomPanel, { ClassroomTabType } from "./ClassroomPanel"
import PreJoinScreen from "./PreJoinScreen"
import ReconnectionOverlay from "./ReconnectionOverlay"
import TeacherPollModal from "./TeacherPollModal"
import ClassCompletionSummary from "./ClassCompletionSummary"
import ReplayTimeline from "./ReplayTimeline"
import {
  MessageSquare,
  Users,
  Hand,
  X,
  Sparkles,
  Mic,
  Video,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react"
import type {
  LiveClassData,
  PresentationMode,
  ClassStatus,
  ChatMessage,
  ChatAttachment,
  ClassParticipant,
} from "@/lib/classroom-service"
import { ClassroomWebRTCClient, NetworkQualityState } from "@/lib/webrtc/classroom-webrtc"

interface LiveClassroomClientProps {
  initialClassroom: LiveClassData
  userRole?: "student" | "teacher"
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    role?: string
  } | null
}

export default function LiveClassroomClient({
  initialClassroom,
  userRole = "student",
  user,
}: LiveClassroomClientProps) {
  const [classroom, setClassroom] = useState<LiveClassData>(initialClassroom)
  // Enforce role strictly from authenticated session
  const [role, setRole] = useState<"student" | "teacher">(userRole)
  const [hasJoined, setHasJoined] = useState(false)

  // Media & WebRTC state
  const [webrtcClient, setWebrtcClient] = useState<ClassroomWebRTCClient | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [speakerVolume, setSpeakerVolume] = useState(0.9)
  const [isSharingScreen, setIsSharingScreen] = useState(false)

  // Stage & Panels
  const [presentationMode, setPresentationMode] = useState<PresentationMode>(
    initialClassroom.presentationMode || "camera"
  )
  const [activePanel, setActivePanel] = useState<ClassroomTabType | null>("chat")
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)

  // Student Hand Raise State
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [handQueuePosition, setHandQueuePosition] = useState<number>(1)
  const [stageInvitePrompt, setStageInvitePrompt] = useState<string | null>(null)

  // Teacher Modals
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)

  // System & Connection State
  const [networkQuality, setNetworkQuality] = useState<NetworkQualityState>("excellent")
  const [rttMs, setRttMs] = useState(28)
  const [dataSaver, setDataSaver] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentPlayedSeconds, setCurrentPlayedSeconds] = useState(initialClassroom.elapsedSeconds || 2460)

  // Memoized time updater to prevent cascading renders
  const handleCurrentTimeChange = useCallback((s: number) => {
    if (initialClassroom.status === "REPLAY") {
      setCurrentPlayedSeconds(s)
    }
  }, [initialClassroom.status])

  // Only authentic teachers or admins can switch role view for testing
  const canSwitchRole = userRole === "teacher"

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Pre-join verification completion handler
  const handleJoinClass = async (settings: {
    cameraEnabled: boolean
    micEnabled: boolean
    selectedVideoDevice: string
    selectedAudioDevice: string
    selectedSpeakerDevice: string
    webrtcClient: ClassroomWebRTCClient
  }) => {
    setIsCameraOn(settings.cameraEnabled)
    setIsMicOn(settings.micEnabled)
    setWebrtcClient(settings.webrtcClient)
    setLocalStream(settings.webrtcClient.getLocalStream())

    // Authorize join with backend session token
    try {
      await fetch(`/api/classroom/${classroom.batchSlug}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, userId: role === "teacher" ? "teacher-host" : "stu-current" }),
      })
    } catch (e) {
      console.warn("Authorize note:", e)
    }

    setHasJoined(true)
  }

  // Toggle Camera
  const handleToggleCamera = () => {
    const nextState = !isCameraOn
    setIsCameraOn(nextState)
    if (webrtcClient) {
      webrtcClient.setCameraEnabled(nextState)
    }
    // Update self in participants list
    setClassroom((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === "p-current" || p.id === "p-current-user" ? { ...p, isCameraOn: nextState } : p
      ),
    }))
  }

  // Toggle Mic
  const handleToggleMic = () => {
    const nextState = !isMicOn
    setIsMicOn(nextState)
    if (webrtcClient) {
      webrtcClient.setMicrophoneEnabled(nextState)
    }
    // Update self in participants list
    setClassroom((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === "p-current" || p.id === "p-current-user" ? { ...p, isMicOn: nextState } : p
      ),
    }))
  }

  // Toggle Screen Share (Teacher)
  const handleToggleScreenShare = async () => {
    if (!webrtcClient) return
    if (isSharingScreen) {
      webrtcClient.stopScreenShare()
      setIsSharingScreen(false)
      setScreenStream(null)
      setPresentationMode("camera")
    } else {
      try {
        const stream = await webrtcClient.startScreenShare()
        if (stream) {
          setIsSharingScreen(true)
          setScreenStream(stream)
          setPresentationMode("screenshare")
        }
      } catch (err) {
        console.warn("Screen share error:", err)
      }
    }
  }

  // Student Hand Raise Toggle
  const handleToggleHandRaise = async () => {
    const nextState = !isHandRaised
    setIsHandRaised(nextState)

    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/hand-raise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "p-current-user", userName: "You (Student)" }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsHandRaised(data.handRaised)
        setHandQueuePosition(data.queuePosition || 1)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Chat message send handler
  const handleSendMessage = async (text: string, attachment?: ChatAttachment) => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          userName: role === "teacher" ? `${classroom.teacher.name} (Teacher)` : "You (Student)",
          role: role === "teacher" ? "teacher" : "student",
          attachment,
        }),
      })
      if (res.ok) {
        const newMsg: ChatMessage = await res.json()
        setClassroom((prev) => ({
          ...prev,
          chatMessages: [...prev.chatMessages, newMsg],
        }))
      }
    } catch (err) {
      console.error("Chat error:", err)
    }
  }

  // Poll voting handler
  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionId }),
      })
      if (res.ok) {
        const updatedPoll = await res.json()
        setClassroom((prev) => ({
          ...prev,
          polls: prev.polls.map((p) => (p.id === pollId ? updatedPoll : p)),
        }))
      }
    } catch (err) {
      console.error("Poll vote error:", err)
    }
  }

  // Question submission handler
  const handleSubmitQuestion = async (text: string) => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          userId: "p-current-user",
          userName: "You (Student)",
        }),
      })
      if (res.ok) {
        const newQ = await res.json()
        setClassroom((prev) => ({
          ...prev,
          questions: [newQ, ...prev.questions],
        }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Upvote Question handler
  const handleUpvoteQuestion = async (questionId: string) => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, action: "upvote" }),
      })
      if (res.ok) {
        const updatedQ = await res.json()
        setClassroom((prev) => ({
          ...prev,
          questions: prev.questions.map((q) => (q.id === questionId ? updatedQ : q)),
        }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Add Student Note handler
  const handleAddNote = async (text: string, seconds: number) => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText: text, seconds }),
      })
      if (res.ok) {
        const newNote = await res.json()
        setClassroom((prev) => ({
          ...prev,
          notes: [newNote, ...prev.notes],
        }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Teacher Moderation Actions
  const handleMuteParticipant = async (id: string) => {
    try {
      await fetch(`/api/classroom/${classroom.batchSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mute", participantId: id }),
      })
      setClassroom((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === id ? { ...p, isMicOn: false, isSpeaking: false } : p
        ),
      }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleRequestUnmute = async (id: string) => {
    try {
      await fetch(`/api/classroom/${classroom.batchSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "requestUnmute", participantId: id }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleDisableCamera = async (id: string) => {
    try {
      await fetch(`/api/classroom/${classroom.batchSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disableCamera", participantId: id }),
      })
      setClassroom((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === id ? { ...p, isCameraOn: false } : p
        ),
      }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleBringToStage = async (id: string) => {
    try {
      await fetch(`/api/classroom/${classroom.batchSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bringToStage", participantId: id }),
      })
      setClassroom((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === id ? { ...p, isOnStage: true, handRaised: false } : p
        ),
        handRaiseQueue: prev.handRaiseQueue.filter((h) => h.userId !== id),
      }))
      // If student is self, show prompt
      if (id === "p-current-user" || id === "p-current") {
        setStageInvitePrompt("Teacher invited you to speak. Turn on microphone and camera to participate.")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveFromStage = async (id: string) => {
    try {
      await fetch(`/api/classroom/${classroom.batchSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeFromStage", participantId: id }),
      })
      setClassroom((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === id ? { ...p, isOnStage: false } : p
        ),
      }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveParticipant = async (id: string) => {
    try {
      await fetch(`/api/classroom/${classroom.batchSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", participantId: id }),
      })
      setClassroom((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== id),
        handRaiseQueue: prev.handRaiseQueue.filter((h) => h.userId !== id),
      }))
    } catch (e) {
      console.error(e)
    }
  }

  // Teacher End Class for Everyone
  const handleTeacherEndClass = async () => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "endClass" }),
      })
      if (res.ok) {
        const updated = await res.json()
        setClassroom(updated)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Teacher Launch Poll
  const handleLaunchTeacherPoll = async (pollData: {
    question: string
    options: string[]
    durationSeconds: number
  }) => {
    try {
      const res = await fetch(`/api/classroom/${classroom.batchSlug}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...pollData }),
      })
      if (res.ok) {
        const newPoll = await res.json()
        setClassroom((prev) => ({
          ...prev,
          polls: [newPoll, ...prev.polls],
        }))
        setActivePanel("polls")
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Leave Class Handler (Student returns to batch, does NOT end class)
  const handleLeaveClass = () => {
    if (webrtcClient) {
      webrtcClient.destroy()
    }
    window.location.href = `/batches/${classroom.batchSlug}`
  }

  // Toggle Panel open/close from bottom bar
  const handleTogglePanel = (panel: ClassroomTabType | null) => {
    if (!panel) {
      setActivePanel(null)
      setIsMobileSheetOpen(false)
    } else {
      setActivePanel(panel)
      setIsMobileSheetOpen(true)
    }
  }

  // PHASE 1: PRE-JOIN SCREEN (Device Check, Camera Preview, Mic Meter, Speaker Test)
  if (!hasJoined) {
    return (
      <PreJoinScreen
        classroom={classroom}
        role={role}
        onJoinClass={handleJoinClass}
      />
    )
  }

  // PHASE 2: CLASS ENDED SUMMARY (Attendance, DPP Unlock, Replay)
  if (classroom.status === "ENDED") {
    return (
      <div className="min-h-screen bg-[#070C18] text-white">
        <MeetingTopBar
          classroom={classroom}
          role={role}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          networkQuality={networkQuality}
          rttMs={rttMs}
          dataSaver={dataSaver}
          onToggleDataSaver={() => setDataSaver(!dataSaver)}
          onLeaveClass={handleLeaveClass}
          isChatOpen={false}
          onToggleChat={() => {}}
          onSwitchRole={canSwitchRole ? () => setRole(role === "teacher" ? "student" : "teacher") : undefined}
          participantCount={classroom.viewerCount}
        />
        <ClassCompletionSummary
          classroom={classroom}
          onWatchReplay={() => setClassroom({ ...classroom, status: "REPLAY" })}
          onOpenNotes={() => {
            setClassroom({ ...classroom, status: "REPLAY" })
            setActivePanel("notes")
          }}
        />
      </div>
    )
  }

  // PHASE 3: LIVE CLASSROOM (Zoom-like Experience)
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070C18] text-white select-none relative">
      
      {/* Top Bar */}
      <MeetingTopBar
        classroom={classroom}
        role={role}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        networkQuality={networkQuality}
        rttMs={rttMs}
        dataSaver={dataSaver}
        onToggleDataSaver={() => setDataSaver(!dataSaver)}
        onLeaveClass={handleLeaveClass}
        isChatOpen={!!activePanel}
        onToggleChat={() => setActivePanel(activePanel ? null : "chat")}
        onSwitchRole={canSwitchRole ? () => setRole(role === "teacher" ? "student" : "teacher") : undefined}
        participantCount={classroom.viewerCount}
      />

      {/* Network Reconnection / Unstable Banner */}
      <ReconnectionOverlay
        networkQuality={networkQuality}
        onRetryConnection={() => {
          setNetworkQuality("excellent")
          setRttMs(28)
        }}
      />

      {/* Teacher Invited Student to Speak Modal / Toast */}
      {stageInvitePrompt && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#16213D] border border-amber-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top duration-300 max-w-md w-full">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Hand className="h-5 w-5 fill-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white">Teacher invited you to speak!</h4>
            <p className="text-[11px] text-gray-300 leading-snug">{stageInvitePrompt}</p>
          </div>
          <button
            onClick={() => {
              setIsCameraOn(true)
              setIsMicOn(true)
              webrtcClient?.setCameraEnabled(true)
              webrtcClient?.setMicrophoneEnabled(true)
              setStageInvitePrompt(null)
            }}
            className="px-3 py-1.5 rounded-xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white text-xs font-bold shrink-0 cursor-pointer shadow-md"
          >
            Turn On &amp; Speak
          </button>
          <button
            onClick={() => setStageInvitePrompt(null)}
            className="p-1 rounded-lg text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Body: Video Stage + Collapsible Right Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Main Video Area */}
        <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-black">
          <div className="flex-1 w-full h-full relative">
            <VideoClassroomStage
              classroom={classroom}
              participants={classroom.participants || []}
              presentationMode={presentationMode}
              onModeChange={(mode) => setPresentationMode(mode)}
              localStream={localStream}
              screenStream={screenStream}
              role={role}
              dataSaver={dataSaver}
              onCurrentTimeChange={handleCurrentTimeChange}
            />

            {/* Floating button to re-open panels when closed */}
            {!activePanel && (
              <button
                onClick={() => setActivePanel("chat")}
                className="absolute top-4 right-4 z-20 px-3.5 py-2 rounded-xl bg-[#0B132B]/90 hover:bg-[#101A35] border border-gray-700 text-white text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105"
                title="Show Classroom Chat & Tools"
              >
                <MessageSquare className="h-4 w-4 text-[#3AAFA9]" />
                <span>Show Panel</span>
              </button>
            )}
          </div>

          {/* Replay Timeline if in REPLAY mode */}
          {classroom.status === "REPLAY" && (
            <ReplayTimeline
              currentSeconds={currentPlayedSeconds}
              totalDuration={classroom.durationMinutes * 60}
              onSeek={(s) => setCurrentPlayedSeconds(s)}
              onSelectTab={() => {
                setActivePanel("chat")
                setIsMobileSheetOpen(true)
              }}
            />
          )}
        </main>

        {/* Desktop Right Interactive Panel (Chat, Participants, Questions, Polls, Notes) */}
        {activePanel && (
          <div className="hidden lg:block lg:w-[380px] xl:w-[420px] h-full shrink-0 transition-all duration-200">
            <ClassroomPanel
              classroom={classroom}
              currentPlayedSeconds={currentPlayedSeconds}
              onSendMessage={handleSendMessage}
              onClose={() => setActivePanel(null)}
              activeTab={activePanel}
              onTabChange={(tab) => setActivePanel(tab)}
              onVotePoll={handleVotePoll}
              onSubmitQuestion={handleSubmitQuestion}
              onUpvoteQuestion={handleUpvoteQuestion}
              onAddNote={handleAddNote}
              role={role}
              onMuteParticipant={handleMuteParticipant}
              onRequestUnmute={handleRequestUnmute}
              onDisableCamera={handleDisableCamera}
              onBringToStage={handleBringToStage}
              onRemoveFromStage={handleRemoveFromStage}
              onRemoveParticipant={handleRemoveParticipant}
              onToggleChatDisabled={() =>
                setClassroom((prev) => ({
                  ...prev,
                  isChatDisabledByTeacher: !prev.isChatDisabledByTeacher,
                }))
              }
              onOpenCreatePollModal={() => setIsPollModalOpen(true)}
            />
          </div>
        )}

      </div>

      {/* Floating Bottom Meeting Control Bar */}
      <MeetingControlBar
        role={role}
        isCameraOn={isCameraOn}
        onToggleCamera={handleToggleCamera}
        isMicOn={isMicOn}
        onToggleMic={handleToggleMic}
        isSharingScreen={isSharingScreen}
        onToggleScreenShare={handleToggleScreenShare}
        isHandRaised={isHandRaised}
        handQueuePosition={handQueuePosition}
        onToggleHandRaise={handleToggleHandRaise}
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        unreadChatCount={0}
        pendingHandsCount={classroom.handRaiseQueue?.length || 0}
        activePollCount={classroom.polls?.filter((p) => p.isActive && !p.hasVoted).length || 0}
        unansweredQuestionsCount={classroom.questions?.filter((q) => !q.isAnswered).length || 0}
        isRecording={classroom.isRecording}
        onToggleRecording={() =>
          setClassroom((prev) => ({ ...prev, isRecording: !prev.isRecording }))
        }
        onLeaveClass={handleLeaveClass}
        onEndClassForEveryone={handleTeacherEndClass}
        speakerVolume={speakerVolume}
        onChangeVolume={(vol) => setSpeakerVolume(vol)}
      />

      {/* Mobile Swipeable Bottom Sheet Modal */}
      {isMobileSheetOpen && activePanel && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/75 flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-[#0B132B] rounded-t-3xl border-t border-gray-700 h-[75vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle & Close */}
            <div className="p-3 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-700 mx-auto" />
              <button
                onClick={() => setIsMobileSheetOpen(false)}
                className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ClassroomPanel
                classroom={classroom}
                currentPlayedSeconds={currentPlayedSeconds}
                onSendMessage={handleSendMessage}
                onClose={() => setIsMobileSheetOpen(false)}
                activeTab={activePanel}
                onTabChange={(tab) => setActivePanel(tab)}
                onVotePoll={handleVotePoll}
                onSubmitQuestion={handleSubmitQuestion}
                onUpvoteQuestion={handleUpvoteQuestion}
                onAddNote={handleAddNote}
                role={role}
                onMuteParticipant={handleMuteParticipant}
                onRequestUnmute={handleRequestUnmute}
                onDisableCamera={handleDisableCamera}
                onBringToStage={handleBringToStage}
                onRemoveFromStage={handleRemoveFromStage}
                onRemoveParticipant={handleRemoveParticipant}
                onToggleChatDisabled={() =>
                  setClassroom((prev) => ({
                    ...prev,
                    isChatDisabledByTeacher: !prev.isChatDisabledByTeacher,
                  }))
                }
                onOpenCreatePollModal={() => setIsPollModalOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Teacher Create Poll Modal */}
      {role === "teacher" && (
        <TeacherPollModal
          isOpen={isPollModalOpen}
          onClose={() => setIsPollModalOpen(false)}
          onLaunchPoll={handleLaunchTeacherPoll}
        />
      )}

    </div>
  )
}
