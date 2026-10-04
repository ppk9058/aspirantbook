"use client"

import React, { useState } from "react"
import { BarChart2, Plus, Trash2, X, Sparkles } from "lucide-react"

interface TeacherPollModalProps {
  isOpen: boolean
  onClose: () => void
  onLaunchPoll: (pollData: { question: string; options: string[]; durationSeconds: number }) => void
}

export default function TeacherPollModal({
  isOpen,
  onClose,
  onLaunchPoll,
}: TeacherPollModalProps) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState<string[]>([
    "Option A",
    "Option B",
    "Option C",
    "Option D",
  ])
  const [durationSeconds, setDurationSeconds] = useState(60)

  if (!isOpen) return null

  const handleAddOption = () => {
    if (options.length >= 6) return
    setOptions([...options, `Option ${String.fromCharCode(65 + options.length)}`])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options]
    updated[index] = val
    setOptions(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || options.some((o) => !o.trim())) return
    onLaunchPoll({
      question: question.trim(),
      options: options.map((o) => o.trim()),
      durationSeconds,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <form
        onSubmit={handleSubmit}
        className="bg-[#101A33] border border-gray-700 text-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#5B47FB]/20 text-[#5B47FB]">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create &amp; Launch Live Poll</h3>
              <p className="text-xs text-gray-400">Ask conceptual MCQs to gauge class comprehension</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Question Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-300">Poll Question</label>
          <textarea
            required
            rows={3}
            placeholder="e.g. Which of the following is correct regarding Article 14?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-[#1A2542] border border-gray-700 rounded-2xl p-3 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#5B47FB]"
          />
        </div>

        {/* Options List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300">Answer Options</label>
            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="text-[11px] font-bold text-[#3AAFA9] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Option</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-gray-800 text-gray-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  className="flex-1 bg-[#1A2542] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#5B47FB]"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(i)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timer Duration */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-300">Poll Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {[30, 45, 60, 90].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setDurationSeconds(sec)}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  durationSeconds === sec
                    ? "bg-[#5B47FB] text-white shadow-md"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {sec} seconds
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#5B47FB] to-[#3AAFA9] hover:from-[#4C38EA] hover:to-[#2F9E98] text-white text-xs font-black shadow-lg shadow-[#5B47FB]/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            <span>Launch Poll</span>
          </button>
        </div>
      </form>
    </div>
  )
}
