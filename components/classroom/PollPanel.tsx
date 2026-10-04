"use client"

import React, { useState } from "react"
import {
  BarChart2,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
} from "lucide-react"
import type { ClassPoll } from "@/lib/classroom-service"

interface PollPanelProps {
  polls: ClassPoll[]
  onVote: (pollId: string, optionId: string) => void
}

export default function PollPanel({ polls, onVote }: PollPanelProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const activePoll = polls.find((p) => p.isActive) || polls[0]

  if (!activePoll) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0D1527] text-white space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-800/80 text-gray-500 flex items-center justify-center">
          <BarChart2 className="h-7 w-7" />
        </div>
        <h3 className="font-bold text-sm text-gray-200">No Active Poll Right Now</h3>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          Your teacher will launch interactive conceptual polls during the lecture. Stay tuned!
        </p>
      </div>
    )
  }

  const hasVoted = activePoll.hasVoted || !!activePoll.selectedOptionId
  const totalVotes = Math.max(1, activePoll.totalVotes)

  const handleVoteSubmit = () => {
    if (!selectedOption || hasVoted) return
    setSubmitting(true)
    onVote(activePoll.id, selectedOption)
    setTimeout(() => setSubmitting(false), 300)
  }

  return (
    <div className="flex flex-col h-full bg-[#0D1527] text-white p-4 overflow-y-auto space-y-5">
      {/* Poll Header Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-[#5B47FB]/10 to-transparent border border-purple-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Live Class Poll</span>
          </span>
          <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold">
            <Clock className="h-3.5 w-3.5" />
            <span>Active &bull; {activePoll.totalVotes} answered</span>
          </div>
        </div>

        <h3 className="font-black text-sm text-white leading-snug">
          {activePoll.question}
        </h3>
      </div>

      {/* Options List */}
      <div className="space-y-2.5">
        {activePoll.options.map((opt) => {
          const isSelected = (activePoll.selectedOptionId || selectedOption) === opt.id
          const isCorrect = hasVoted && activePoll.correctOptionId === opt.id
          const percentage = Math.round((opt.votes / totalVotes) * 100)

          return (
            <div
              key={opt.id}
              onClick={() => {
                if (!hasVoted) setSelectedOption(opt.id)
              }}
              className={`relative p-3.5 rounded-2xl border transition-all overflow-hidden ${
                !hasVoted
                  ? isSelected
                    ? "border-[#5B47FB] bg-[#5B47FB]/15 shadow-md cursor-pointer"
                    : "border-gray-800 bg-[#131C31] hover:border-gray-700 cursor-pointer"
                  : isCorrect
                  ? "border-emerald-500/80 bg-emerald-500/15"
                  : isSelected
                  ? "border-purple-500/60 bg-purple-500/10"
                  : "border-gray-800/80 bg-[#131C31]/60"
              }`}
            >
              {/* Background Percentage Bar Fill (Shown after voting) */}
              {hasVoted && (
                <div
                  className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ${
                    isCorrect ? "bg-emerald-500/20" : "bg-purple-500/15"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-[#5B47FB] bg-[#5B47FB] text-white"
                        : "border-gray-600"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="font-bold text-gray-200 leading-snug">
                    {opt.text}
                  </span>
                </div>

                {hasVoted && (
                  <div className="flex items-center gap-2 shrink-0 font-bold">
                    {isCorrect && (
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Correct</span>
                      </span>
                    )}
                    <span className="text-gray-300 font-mono text-xs">{percentage}%</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Button: Submit Vote */}
      {!hasVoted && (
        <button
          onClick={handleVoteSubmit}
          disabled={!selectedOption || submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5B47FB] to-[#7B68EE] hover:from-[#4A38E8] hover:to-[#5B47FB] text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 shadow-md cursor-pointer"
        >
          {submitting ? "Submitting Vote..." : "Submit My Answer"}
        </button>
      )}

      {/* Teacher Explanation Card (Revealed after vote) */}
      {hasVoted && activePoll.explanation && (
        <div className="p-4 rounded-2xl bg-[#142038] border border-gray-700/80 space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <Award className="h-4 w-4" />
            <span>Teacher Conceptual Rationale</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {activePoll.explanation}
          </p>
          <div className="pt-2 border-t border-gray-800 text-[10px] text-gray-500">
            Poll score will be integrated into your post-class learning summary.
          </div>
        </div>
      )}
    </div>
  )
}
