"use client"

import React, { useState } from "react"
import {
  MessageSquare,
  Users,
  HelpCircle,
  BarChart2,
  Bookmark,
  FileText,
  ClipboardList,
  ChevronRight,
  X,
} from "lucide-react"
import ChatPanel from "./ChatPanel"
import ParticipantsPanel from "./ParticipantsPanel"
import QuestionPanel from "./QuestionPanel"
import PollPanel from "./PollPanel"
import NotesPanel from "./NotesPanel"
import ResourcePanel from "./ResourcePanel"
import LiveAssessmentPanel from "./LiveAssessmentPanel"
import type { LiveClassData, ChatAttachment } from "@/lib/classroom-service"

export type ClassroomTabType =
  | "chat"
  | "participants"
  | "questions"
  | "polls"
  | "assessments"
  | "notes"
  | "resources"

interface ClassroomPanelProps {
  classroom: LiveClassData
  currentPlayedSeconds?: number
  onSendMessage: (text: string, attachment?: ChatAttachment) => void
  onClose?: () => void
  activeTab?: ClassroomTabType
  onTabChange?: (tab: ClassroomTabType) => void
  onVotePoll?: (pollId: string, optionId: string) => void
  onSubmitQuestion?: (text: string) => void
  onUpvoteQuestion?: (id: string) => void
  onAddNote?: (text: string, seconds: number) => void
  onSeekToTime?: (seconds: number) => void
  role?: "student" | "teacher"
  onMuteParticipant?: (id: string) => void
  onRequestUnmute?: (id: string) => void
  onDisableCamera?: (id: string) => void
  onBringToStage?: (id: string) => void
  onRemoveFromStage?: (id: string) => void
  onRemoveParticipant?: (id: string) => void
  onToggleChatDisabled?: () => void
  onOpenCreatePollModal?: () => void
}

export default function ClassroomPanel({
  classroom,
  currentPlayedSeconds = 0,
  onSendMessage,
  onClose,
  activeTab = "chat",
  onTabChange,
  onVotePoll,
  onSubmitQuestion,
  onUpvoteQuestion,
  onAddNote,
  onSeekToTime,
  role = "student",
  onMuteParticipant,
  onRequestUnmute,
  onDisableCamera,
  onBringToStage,
  onRemoveFromStage,
  onRemoveParticipant,
  onToggleChatDisabled,
  onOpenCreatePollModal,
}: ClassroomPanelProps) {
  const [internalTab, setInternalTab] = useState<ClassroomTabType>(activeTab)
  const currentTab = onTabChange ? activeTab : internalTab

  const setTab = (tab: ClassroomTabType) => {
    if (onTabChange) onTabChange(tab)
    else setInternalTab(tab)
  }

  const tabs: { id: ClassroomTabType; label: string; icon: any; badge?: number | boolean }[] = [
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquare,
    },
    {
      id: "participants",
      label: "People",
      icon: Users,
      badge: classroom.handRaiseQueue?.length > 0 ? classroom.handRaiseQueue.length : undefined,
    },
    {
      id: "questions",
      label: "Q&A",
      icon: HelpCircle,
      badge: classroom.questions?.filter((q) => !q.isAnswered).length || undefined,
    },
    {
      id: "polls",
      label: "Polls",
      icon: BarChart2,
      badge: classroom.polls?.some((p) => p.isActive && !p.hasVoted),
    },
    {
      id: "assessments",
      label: "Quiz",
      icon: ClipboardList,
    },
    {
      id: "notes",
      label: "Notes",
      icon: Bookmark,
    },
    {
      id: "resources",
      label: "Docs",
      icon: FileText,
    },
  ]

  return (
    <aside className="w-full h-full flex flex-col bg-[#0B132B] border-l border-gray-800/80 overflow-hidden select-none">
      
      {/* Top Navigation Tabs Header */}
      <div className="h-12 bg-[#080E1E] border-b border-gray-800 px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 max-w-[85%]">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isSelected = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`relative px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#5B47FB] text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
                title={tab.label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
                {typeof tab.badge === "boolean" && tab.badge && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            )
          })}
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Close Panel"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Content Area Based on Active Tab */}
      <div className="flex-1 min-h-0 relative">
        {currentTab === "chat" && (
          <ChatPanel
            messages={classroom.chatMessages}
            onSendMessage={onSendMessage}
            userRole={role}
            isTeacher={role === "teacher"}
            isChatDisabled={classroom.isChatDisabledByTeacher}
            onToggleChatDisabled={onToggleChatDisabled}
          />
        )}

        {currentTab === "participants" && (
          <ParticipantsPanel
            participants={classroom.participants || []}
            handRaiseQueue={classroom.handRaiseQueue || []}
            role={role}
            onMuteParticipant={onMuteParticipant || (() => {})}
            onRequestUnmute={onRequestUnmute || (() => {})}
            onDisableCamera={onDisableCamera || (() => {})}
            onBringToStage={onBringToStage || (() => {})}
            onRemoveFromStage={onRemoveFromStage || (() => {})}
            onRemoveParticipant={onRemoveParticipant || (() => {})}
            onClose={onClose || (() => {})}
          />
        )}

        {currentTab === "questions" && (
          <QuestionPanel
            questions={classroom.questions || []}
            onSubmitQuestion={onSubmitQuestion || (() => {})}
            onUpvoteQuestion={onUpvoteQuestion || (() => {})}
          />
        )}

        {currentTab === "polls" && (
          <div className="h-full flex flex-col">
            {role === "teacher" && onOpenCreatePollModal && (
              <div className="p-3 bg-[#0A1020] border-b border-gray-800 shrink-0">
                <button
                  onClick={onOpenCreatePollModal}
                  className="w-full py-2 px-3 rounded-xl bg-[#5B47FB] hover:bg-[#4C38EA] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  <span>+ Create &amp; Launch New Poll</span>
                </button>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <PollPanel
                polls={classroom.polls || []}
                onVote={onVotePoll || (() => {})}
              />
            </div>
          </div>
        )}

        {currentTab === "assessments" && (
          <div className="h-full overflow-y-auto">
            <LiveAssessmentPanel
              assessment={classroom.liveAssessment}
            />
          </div>
        )}

        {currentTab === "notes" && (
          <NotesPanel
            notes={classroom.notes || []}
            currentPlayedSeconds={currentPlayedSeconds}
            onAddNote={onAddNote || (() => {})}
            onSeekToTime={onSeekToTime}
          />
        )}

        {currentTab === "resources" && (
          <ResourcePanel
            resources={classroom.resources || []}
          />
        )}
      </div>
    </aside>
  )
}
