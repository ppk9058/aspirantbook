"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Send,
  Pin,
  FileText,
  Download,
  Paperclip,
  X,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  ZoomIn,
} from "lucide-react"
import type { ChatMessage, ChatAttachment } from "@/lib/classroom-service"

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (text: string, attachment?: ChatAttachment) => void
  userRole?: "teacher" | "student" | "mentor"
  isTeacher?: boolean
  isChatDisabled?: boolean
  onToggleChatDisabled?: () => void
}

export default function ChatPanel({
  messages,
  onSendMessage,
  userRole = "student",
  isTeacher = false,
  isChatDisabled = false,
  onToggleChatDisabled,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("")
  const [slowModeSeconds, setSlowModeSeconds] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Slow mode countdown timer (teachers bypass slow mode)
  useEffect(() => {
    if (slowModeSeconds <= 0) return
    const timer = setTimeout(() => setSlowModeSeconds(slowModeSeconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [slowModeSeconds])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit.")
      return
    }

    setSelectedFile(file)
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!inputText.trim() && !selectedFile) || (slowModeSeconds > 0 && !isTeacher)) return

    let attachment: ChatAttachment | undefined = undefined

    if (selectedFile) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", selectedFile)
        const isPdf = selectedFile.type === "application/pdf"
        formData.append("type", isPdf ? "pdf" : "image")

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file.")
        }

        const data = await uploadRes.json()
        attachment = {
          title: selectedFile.name,
          url: data.upload.url,
          type: isPdf ? "pdf" : "image",
          size: `${Math.round(selectedFile.size / 1024)} KB`,
        }
      } catch (err: any) {
        console.error("Chat attachment upload failed:", err)
        alert("Failed to upload file attachment. Please try again.")
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    const messageText = inputText.trim() || (attachment ? `Shared a ${attachment.type}: ${attachment.title}` : "")
    onSendMessage(messageText, attachment)

    setInputText("")
    handleRemoveFile()
    if (!isTeacher) {
      setSlowModeSeconds(4) // 4s student rate limit
    }
  }

  const pinnedMessage = messages.find((m) => m.isPinned)
  const regularMessages = messages.filter((m) => !m.isPinned)

  return (
    <div className="flex flex-col h-full bg-[#0D1527] text-white select-none">
      {/* Pinned Teacher Announcement Bar */}
      {pinnedMessage && (
        <div className="p-3 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border-b border-orange-500/30 flex items-start gap-2.5 shrink-0">
          <Pin className="h-4 w-4 text-[#F26522] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F26522] block">
              Pinned by {pinnedMessage.userName}
            </span>
            <p className="text-xs text-gray-200 mt-0.5 leading-snug line-clamp-2">
              {pinnedMessage.message}
            </p>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-gray-800/40">
        {regularMessages.map((msg) => {
          const isMsgTeacher = msg.role === "teacher"
          const isMsgMentor = msg.role === "mentor"
          return (
            <div key={msg.id} className="pt-3 first:pt-0 group">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`text-xs font-bold truncate ${
                      isMsgTeacher
                        ? "text-[#F26522]"
                        : isMsgMentor
                        ? "text-[#3AAFA9]"
                        : "text-gray-300"
                    }`}
                  >
                    {msg.userName}
                  </span>
                  {isMsgTeacher && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-orange-500/20 text-[#F26522] border border-orange-500/30">
                      Teacher
                    </span>
                  )}
                  {isMsgMentor && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Mentor
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-mono shrink-0">
                  {msg.timestamp}
                </span>
              </div>

              {msg.message && (
                <p className="text-xs text-gray-200 leading-relaxed break-words">
                  {msg.message}
                </p>
              )}

              {/* Resource Attachment (Image or PDF) */}
              {msg.attachment && (
                <div className="mt-2.5">
                  {msg.attachment.type === "image" ? (
                    <div className="rounded-xl overflow-hidden border border-gray-700/60 max-w-xs group/img relative bg-black/40">
                      <img
                        src={msg.attachment.url}
                        alt={msg.attachment.title}
                        className="max-h-48 w-auto object-contain cursor-pointer transition-transform group-hover/img:scale-102"
                        onClick={() => setZoomImageUrl(msg.attachment!.url)}
                      />
                      <div
                        onClick={() => setZoomImageUrl(msg.attachment!.url)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-[11px] font-bold cursor-pointer transition-opacity"
                      >
                        <ZoomIn className="h-4 w-4 mr-1" /> Click to Zoom
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#0F172A] border border-[#3AAFA9]/40 shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {msg.attachment.title}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {msg.attachment.size} &bull; PDF Document
                          </span>
                        </div>
                      </div>
                      <a
                        href={msg.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 shadow-xs"
                      >
                        <Download className="h-3 w-3" />
                        <span>View</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Message Reactions */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="flex items-center gap-1 pt-1 mt-1">
                  {Object.entries(msg.reactions).map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="text-[10px] text-gray-400 bg-gray-800/70 px-1.5 py-0.5 rounded-full border border-gray-700/50 font-bold"
                    >
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Chip */}
      {selectedFile && (
        <div className="px-3 py-2 bg-[#101828] border-t border-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Upload preview"
                className="w-8 h-8 rounded-lg object-cover border border-gray-700 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-gray-400">
                {Math.round(selectedFile.size / 1024)} KB &bull; Ready to send in chat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Teacher Chat Moderation Status Bar */}
      {isTeacher && onToggleChatDisabled && (
        <div className="px-3 py-1.5 bg-[#0C1428] border-t border-gray-800 flex items-center justify-between text-[11px] shrink-0">
          <span className="text-gray-400">
            {isChatDisabled ? "🔒 Student chat is currently paused" : "💬 Student chat is open"}
          </span>
          <button
            type="button"
            onClick={onToggleChatDisabled}
            className={`px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer text-xs ${
              isChatDisabled
                ? "bg-[#3AAFA9] text-black hover:bg-[#2E9C96]"
                : "bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700"
            }`}
          >
            {isChatDisabled ? "Enable Chat" : "Disable Chat"}
          </button>
        </div>
      )}

      {/* Message Input Box OR Disabled Chat Notice */}
      {isChatDisabled && !isTeacher ? (
        <div className="p-4 bg-[#090F1C] border-t border-gray-800 text-center text-xs text-gray-400 shrink-0">
          <p className="font-semibold text-gray-300">
            Chat has been disabled by the teacher.
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Focus on the lecture. The instructor will re-enable discussion shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-3 bg-[#090F1C] border-t border-gray-800 shrink-0">
          <div className="relative flex items-center gap-1.5">
            {/* File Upload Trigger */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="chat-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[#141E33] hover:bg-gray-800 text-gray-400 hover:text-[#3AAFA9] transition-colors border border-gray-700/70 shrink-0 cursor-pointer"
              title="Attach image or PDF document"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={inputText}
              disabled={slowModeSeconds > 0 && !isTeacher}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                slowModeSeconds > 0 && !isTeacher
                  ? `Wait ${slowModeSeconds}s to send message`
                  : selectedFile
                  ? "Add a caption or send directly..."
                  : "Type message or attach image/PDF..."
              }
              className="flex-1 px-3 py-2.5 bg-[#141E33] text-xs text-white placeholder-gray-500 rounded-xl border border-gray-700/70 focus:outline-none focus:ring-1 focus:ring-[#5B47FB] disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedFile) || (slowModeSeconds > 0 && !isTeacher) || isUploading}
              className="p-2.5 rounded-xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white disabled:opacity-40 transition-all cursor-pointer shrink-0"
              title="Send Message"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1.5 px-1">
            <span>Attach images or PDF files directly</span>
            {slowModeSeconds > 0 && !isTeacher ? (
              <span className="text-amber-400 font-bold">Slow mode: {slowModeSeconds}s</span>
            ) : (
              <span className="text-gray-400">Live chat active</span>
            )}
          </div>
        </form>
      )}

      {/* Image Lightbox Modal */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setZoomImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={zoomImageUrl}
              alt="Zoomed image"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-gray-700"
            />
            <button
              onClick={() => setZoomImageUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
