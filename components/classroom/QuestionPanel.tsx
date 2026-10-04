"use client"

import React, { useState } from "react"
import {
  HelpCircle,
  ThumbsUp,
  Clock,
  CheckCircle2,
  Plus,
  Send,
  Pin,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import type { ClassQuestion } from "@/lib/classroom-service"

interface QuestionPanelProps {
  questions: ClassQuestion[]
  onSubmitQuestion: (text: string) => void
  onUpvoteQuestion: (id: string) => void
}

export default function QuestionPanel({
  questions,
  onSubmitQuestion,
  onUpvoteQuestion,
}: QuestionPanelProps) {
  const [filter, setFilter] = useState<"all" | "popular" | "unanswered" | "answered">("all")
  const [inputText, setInputText] = useState("")
  const [showInput, setShowInput] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSubmitQuestion(inputText.trim())
    setInputText("")
    setShowInput(false)
  }

  const filtered = questions.filter((q) => {
    if (filter === "popular") return q.upvotes > 20
    if (filter === "unanswered") return !q.isAnswered
    if (filter === "answered") return q.isAnswered
    return true
  })

  return (
    <div className="flex flex-col h-full bg-[#0D1527] text-white">
      {/* Top Filter Tabs & Ask Button */}
      <div className="p-3 border-b border-gray-800 space-y-2.5 shrink-0 bg-[#0A101F]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(["all", "popular", "unanswered", "answered"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize transition-colors ${
                  filter === tab
                    ? "bg-[#5B47FB] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowInput(!showInput)}
            className="px-3 py-1 bg-[#F26522] hover:bg-[#E05310] text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ask Doubt</span>
          </button>
        </div>

        {/* Inline Question Submission Drawer */}
        {showInput && (
          <form onSubmit={handleSubmit} className="p-3 bg-[#131C31] rounded-2xl border border-gray-700 space-y-2.5 animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-gray-300 block">
              Submit your question directly to the teacher &amp; mentor:
            </span>
            <textarea
              rows={3}
              required
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Sir, why is periodic motion different from oscillatory motion?"
              className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F26522]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#F26522] hover:bg-[#E05310] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Question</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Questions Scroll List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-gray-500 text-xs">
            <HelpCircle className="h-8 w-8 mx-auto text-gray-600" />
            <p>No doubts matching this filter.</p>
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                q.isPinned
                  ? "border-[#F26522]/50 bg-gradient-to-br from-[#F26522]/10 via-[#131C31] to-[#131C31]"
                  : "border-gray-800/80 bg-[#131C31]"
              }`}
            >
              {/* Question Header & Meta */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-300">{q.userName}</span>
                  {q.isPinned && (
                    <span className="text-[10px] font-bold text-[#F26522] flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                      <Pin className="h-2.5 w-2.5" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-gray-500">{q.timeOffset}</span>
              </div>

              {/* Question Text */}
              <p className="font-bold text-xs text-white leading-relaxed">
                {q.question}
              </p>

              {/* Teacher Answer if Available */}
              {q.teacherAnswer && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Answered by Educator</span>
                  </span>
                  <p className="text-gray-200 leading-relaxed">{q.teacherAnswer}</p>
                </div>
              )}

              {/* Footer: Upvote Button & Counter */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-800 text-xs">
                <button
                  onClick={() => onUpvoteQuestion(q.id)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    q.isUpvoted
                      ? "bg-[#5B47FB] text-white border-[#5B47FB]"
                      : "border-gray-700 bg-gray-800/50 text-gray-400 hover:text-white"
                  }`}
                  title="Upvote question"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>{q.upvotes} Students have this doubt</span>
                </button>

                <span className="text-[11px] text-gray-500 font-medium">
                  {q.isAnswered ? "Resolved ✓" : "In queue"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
