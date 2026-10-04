"use client"

import React, { useState } from "react"
import { Calendar, Clock, BookOpen, Layers, X, Check, Sparkles } from "lucide-react"

interface TeacherScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  initialTopicTitle: string
  initialSubject: string
  initialScheduledStartTime: string
  initialDurationMinutes: number
  onSaveSchedule: (schedule: {
    topicTitle: string
    subject: string
    scheduledStartTime: string
    durationMinutes: number
  }) => Promise<void>
}

export default function TeacherScheduleModal({
  isOpen,
  onClose,
  initialTopicTitle,
  initialSubject,
  initialScheduledStartTime,
  initialDurationMinutes,
  onSaveSchedule,
}: TeacherScheduleModalProps) {
  const [topicTitle, setTopicTitle] = useState(initialTopicTitle)
  const [subject, setSubject] = useState(initialSubject)
  const [scheduledStartTime, setScheduledStartTime] = useState(initialScheduledStartTime)
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSaveSchedule({
        topicTitle,
        subject,
        scheduledStartTime,
        durationMinutes: Number(durationMinutes),
      })
      onClose()
    } catch (err) {
      console.error("Failed to save schedule:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const QUICK_TIMES = [
    "Today, 05:00 PM",
    "Today, 06:30 PM",
    "Tomorrow, 10:00 AM",
    "Tomorrow, 04:00 PM",
    "Live Now",
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-gray-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1F2937] border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B47FB]/20 text-[#5B47FB]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Schedule / Set Class Time</h2>
              <p className="text-xs text-gray-400">Configure lecture time, topic, and duration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Topic Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-[#3AAFA9]" />
              Lecture / Topic Title
            </label>
            <input
              type="text"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="e.g. Motion & Measurement of Distances — Concept Mastery"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1120] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B47FB] focus:ring-1 focus:ring-[#5B47FB]"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#F26522]" />
              Subject / Department
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics & Science, Mathematics, Coding"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1120] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B47FB]"
              required
            />
          </div>

          {/* Scheduled Start Time */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#5B47FB]" />
              Scheduled Start Time
            </label>
            <input
              type="text"
              value={scheduledStartTime}
              onChange={(e) => setScheduledStartTime(e.target.value)}
              placeholder="e.g. Today, 05:00 PM or 2026-09-11 17:00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1120] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B47FB]"
              required
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_TIMES.map((time) => (
                <button
                  type="button"
                  key={time}
                  onClick={() => setScheduledStartTime(time)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    scheduledStartTime === time
                      ? "bg-[#5B47FB]/30 border-[#5B47FB] text-white font-bold"
                      : "bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Class Duration (Minutes)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 90].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    durationMinutes === mins
                      ? "bg-[#3AAFA9] border-[#3AAFA9] text-white shadow-md shadow-[#3AAFA9]/20"
                      : "bg-[#0B1120] border-gray-700 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B47FB] to-[#7B61FF] hover:from-[#4E3BE3] hover:to-[#6B50F7] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#5B47FB]/25 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Update Class Schedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
