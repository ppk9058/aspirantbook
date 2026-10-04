"use client"

import React, { useState } from "react"
import {
  Bookmark,
  Clock,
  Download,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  FileText,
} from "lucide-react"
import type { StudentNote } from "@/lib/classroom-service"

interface NotesPanelProps {
  notes: StudentNote[]
  currentPlayedSeconds: number
  onAddNote: (text: string, seconds: number) => void
  onSeekToTime?: (seconds: number) => void
}

export default function NotesPanel({
  notes,
  currentPlayedSeconds,
  onAddNote,
  onSeekToTime,
}: NotesPanelProps) {
  const [inputText, setInputText] = useState("")
  const [showInput, setShowInput] = useState(false)

  const currentMins = Math.floor(currentPlayedSeconds / 60)
  const currentRemSecs = Math.floor(currentPlayedSeconds % 60)
  const formattedCurrentTime = `${currentMins.toString().padStart(2, "0")}:${currentRemSecs.toString().padStart(2, "0")}`

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onAddNote(inputText.trim(), currentPlayedSeconds)
    setInputText("")
    setShowInput(false)
  }

  const handleExport = () => {
    const textContent = notes
      .map((n) => `[${n.timestampFormatted}] ${n.noteText}`)
      .join("\n\n")
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "My_Classroom_Notes.txt"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-[#0D1527] text-white">
      {/* Top Action Bar */}
      <div className="p-3 border-b border-gray-800 bg-[#0A101F] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-[#F26522]" />
          <span className="text-xs font-bold text-gray-200">
            {notes.length} Timestamped Notes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <button
              onClick={handleExport}
              className="p-1.5 rounded-lg border border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs flex items-center gap-1 cursor-pointer"
              title="Download Notes Text"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button
            onClick={() => setShowInput(!showInput)}
            className="px-3 py-1 bg-[#5B47FB] hover:bg-[#4A38E8] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Note at {formattedCurrentTime}</span>
          </button>
        </div>
      </div>

      {/* Inline Note Creation Box */}
      {showInput && (
        <form onSubmit={handleSave} className="p-4 bg-[#131C31] border-b border-gray-800 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#F26522] flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Timestamp: {formattedCurrentTime}</span>
            </span>
            <span className="text-[10px] text-gray-400">Captured automatically</span>
          </div>

          <textarea
            rows={3}
            required
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your notes here... (clicking will later jump video to this moment)"
            className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5B47FB]"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#5B47FB] hover:bg-[#4A38E8] text-white rounded-lg text-xs font-bold shadow-xs"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-gray-500 text-xs">
            <FileText className="h-8 w-8 mx-auto text-gray-600" />
            <p>No notes taken yet.</p>
            <p className="text-[11px] text-gray-600">
              Click &quot;Note at {formattedCurrentTime}&quot; above to jot down key points anytime.
            </p>
          </div>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="p-3.5 rounded-2xl bg-[#131C31] border border-gray-800/80 space-y-2 group hover:border-[#5B47FB]/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSeekToTime && onSeekToTime(n.timestampSeconds)}
                  className="px-2 py-0.5 rounded-md bg-[#5B47FB]/20 hover:bg-[#5B47FB]/30 border border-[#5B47FB]/40 text-[#5B47FB] font-mono text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                  title="Jump video to this timestamp"
                >
                  <Clock className="h-3 w-3" />
                  <span>{n.timestampFormatted}</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </button>
                <span className="text-[10px] text-gray-500">{n.createdAt}</span>
              </div>

              <p className="text-xs text-gray-200 leading-relaxed font-medium">
                {n.noteText}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
