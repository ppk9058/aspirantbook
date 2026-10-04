"use client"

import React, { useState } from "react"
import {
  Users,
  Search,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  MoreHorizontal,
  ShieldCheck,
  UserX,
  Volume2,
  Sparkles,
  ArrowUpRight,
  Check,
} from "lucide-react"
import type { ClassParticipant, HandRaiseEntry } from "@/lib/classroom-service"

interface ParticipantsPanelProps {
  participants: ClassParticipant[]
  handRaiseQueue: HandRaiseEntry[]
  role: "student" | "teacher"
  onMuteParticipant: (id: string) => void
  onRequestUnmute: (id: string) => void
  onDisableCamera: (id: string) => void
  onBringToStage: (id: string) => void
  onRemoveFromStage: (id: string) => void
  onRemoveParticipant: (id: string) => void
  onClose: () => void
}

export default function ParticipantsPanel({
  participants,
  handRaiseQueue,
  role,
  onMuteParticipant,
  onRequestUnmute,
  onDisableCamera,
  onBringToStage,
  onRemoveFromStage,
  onRemoveParticipant,
  onClose,
}: ParticipantsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null)
  const [requestedUnmuteIds, setRequestedUnmuteIds] = useState<Set<string>>(new Set())

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const host = participants.find((p) => p.role === "host" || p.role === "teacher")
  const students = filtered.filter((p) => p.id !== host?.id)

  const handleSendUnmuteRequest = (id: string) => {
    onRequestUnmute(id)
    setRequestedUnmuteIds((prev) => new Set([...prev, id]))
    setActionMenuOpenId(null)
  }

  return (
    <aside className="w-full h-full flex flex-col bg-[#0B132B] border-l border-gray-800/90 select-none overflow-hidden">
      
      {/* Header */}
      <div className="h-14 bg-[#090F1E] border-b border-gray-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5B47FB]/20 text-[#5B47FB] flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Participants ({participants.length.toLocaleString()})
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Hand Raise Priority Queue Section (if hands are raised) */}
      {handRaiseQueue.length > 0 && (
        <div className="p-3 bg-[#131D36] border-b border-gray-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5">
              <Hand className="h-3.5 w-3.5 fill-amber-400" />
              <span>Hand Raised Queue ({handRaiseQueue.length})</span>
            </span>
            <span className="text-[10px] text-gray-400">Waiting to speak</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {handRaiseQueue.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between p-2 rounded-xl bg-gray-900/80 border border-amber-500/20 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                    #{entry.queuePosition}
                  </span>
                  <span className="font-bold text-white truncate">{entry.userName}</span>
                </div>

                {role === "teacher" && (
                  <button
                    onClick={() => onBringToStage(entry.userId)}
                    className="px-2.5 py-1 rounded-lg bg-[#5B47FB] hover:bg-[#4C38EA] text-white text-[11px] font-bold shrink-0 transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>Invite to Speak</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-gray-800/80 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141E38] border border-gray-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#5B47FB]"
          />
        </div>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-gray-800/40">
        
        {/* Host / Teacher Tile at Top */}
        {host && (
          <div className="pb-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1 block">
              Host &amp; Instructor
            </span>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#5B47FB]/15 to-transparent border border-[#5B47FB]/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5B47FB] to-[#3AAFA9] flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
                  {host.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">{host.name}</span>
                    <span className="text-[10px] font-black text-[#3AAFA9] bg-[#3AAFA9]/10 px-1.5 py-0.5 rounded">
                      Host
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Classroom Master</span>
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-1.5 text-gray-300">
                {host.isCameraOn ? (
                  <Video className="h-3.5 w-3.5 text-[#3AAFA9]" />
                ) : (
                  <VideoOff className="h-3.5 w-3.5 text-gray-500" />
                )}
                {host.isMicOn ? (
                  <Mic className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <MicOff className="h-3.5 w-3.5 text-red-400" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="pt-2 space-y-1.5">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
            Students in Class ({students.length})
          </span>

          {students.map((participant) => (
            <div
              key={participant.id}
              className="relative flex items-center justify-between p-2 rounded-xl bg-gray-900/40 hover:bg-gray-800/60 border border-gray-800/60 transition-colors group"
            >
              {/* Left: Avatar + Name + Stage Pill */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  {participant.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-200 truncate max-w-[120px]">
                      {participant.name}
                    </span>
                    {participant.isOnStage && (
                      <span className="text-[9px] font-black text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded border border-purple-500/30">
                        On Stage
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {participant.isSpeaking ? "🔊 speaking" : participant.isMicOn ? "mic active" : "muted"}
                  </span>
                </div>
              </div>

              {/* Right: State Icons & Teacher Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Hand Raised Icon if active */}
                {participant.handRaised && (
                  <div className="p-1 text-amber-400" title="Hand Raised">
                    <Hand className="h-3.5 w-3.5 fill-amber-400" />
                  </div>
                )}

                {/* Camera State */}
                <div className="p-1">
                  {participant.isCameraOn ? (
                    <Video className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </div>

                {/* Mic State */}
                <div className="p-1">
                  {participant.isMicOn ? (
                    <Mic className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>

                {/* Teacher Moderation Actions Trigger */}
                {role === "teacher" && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuOpenId(actionMenuOpenId === participant.id ? null : participant.id)
                      }
                      className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer"
                      title="Manage student"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {/* Teacher Action Popover */}
                    {actionMenuOpenId === participant.id && (
                      <div className="absolute right-0 top-8 bg-[#16213D] border border-gray-700 rounded-2xl p-1.5 shadow-2xl w-48 space-y-1 z-50 text-xs animate-in zoom-in-95 duration-100">
                        {participant.isMicOn ? (
                          <button
                            onClick={() => {
                              onMuteParticipant(participant.id)
                              setActionMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-200 hover:text-white flex items-center gap-2 cursor-pointer"
                          >
                            <MicOff className="h-3.5 w-3.5 text-red-400" />
                            <span>Mute Student</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendUnmuteRequest(participant.id)}
                            disabled={requestedUnmuteIds.has(participant.id)}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-200 hover:text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Mic className="h-3.5 w-3.5 text-emerald-400" />
                            <span>
                              {requestedUnmuteIds.has(participant.id) ? "Unmute Requested" : "Request Unmute"}
                            </span>
                          </button>
                        )}

                        {participant.isCameraOn && (
                          <button
                            onClick={() => {
                              onDisableCamera(participant.id)
                              setActionMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-200 hover:text-white flex items-center gap-2 cursor-pointer"
                          >
                            <VideoOff className="h-3.5 w-3.5 text-amber-400" />
                            <span>Disable Camera</span>
                          </button>
                        )}

                        {participant.isOnStage ? (
                          <button
                            onClick={() => {
                              onRemoveFromStage(participant.id)
                              setActionMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-200 hover:text-white flex items-center gap-2 cursor-pointer"
                          >
                            <span>Return to Audience</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onBringToStage(participant.id)
                              setActionMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-800 text-purple-300 hover:text-white flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span>Bring to Stage</span>
                          </button>
                        )}

                        <div className="border-t border-gray-700/60 my-1" />

                        <button
                          onClick={() => {
                            onRemoveParticipant(participant.id)
                            setActionMenuOpenId(null)
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Remove from Class</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </aside>
  )
}
