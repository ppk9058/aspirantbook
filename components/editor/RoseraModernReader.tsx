"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Lock,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Layers,
  Sparkles,
  ExternalLink,
  Edit3,
} from "lucide-react"
import { RoseraRenderer } from "./RoseraRenderer"
import BrandLogo from "@/components/brand/BrandLogo"

interface Lesson {
  id?: string
  title: string
  content?: string
  durationText?: string
  duration?: number
  isLocked?: boolean
}

interface Chapter {
  id?: string
  title: string
  phase?: string
  description?: string
  lessons?: Lesson[]
}

interface RoseraModernReaderProps {
  courseTitle: string
  technology?: string
  theme?: {
    backgroundColor?: string
    textColor?: string
    primaryColor?: string
    colors?: Record<string, string>
    [key: string]: any
  }
  chapters: Chapter[]
  activeLessonId?: string
  onSelectLesson?: (chapterIndex: number, lessonIndex: number) => void
  onToggleViewMode?: () => void
  isEditor?: boolean
}

export function RoseraModernReader({
  courseTitle,
  technology = "Generative AI",
  theme,
  chapters,
  activeLessonId,
  onSelectLesson,
  onToggleViewMode,
  isEditor = false,
}: RoseraModernReaderProps) {
  // Organize chapters into phases
  // If chapters have "Phase" in title or phase property, group by phase
  // Otherwise, distribute across Phase 1, Phase 2, Phase 3
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0)
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0)

  // Flattened or phase-grouped structure
  const phases = React.useMemo(() => {
    // If chapters are already grouped or named with Phase
    const groups: {
      name: string
      badge?: string
      items: { title: string; chapterIdx: number; lessonIdx: number; isLocked: boolean; content?: string }[]
    }[] = []

    if (!chapters || chapters.length === 0) {
      return [
        {
          name: "Phase 1: Foundations",
          items: [
            { title: "1. How LLMs Work", chapterIdx: 0, lessonIdx: 0, isLocked: false },
            { title: "2. Prompt Engineering", chapterIdx: 0, lessonIdx: 1, isLocked: false },
            { title: "3. Calling LLM APIs", chapterIdx: 0, lessonIdx: 2, isLocked: false },
          ],
        },
        {
          name: "Phase 2: RAG and Vector Search",
          items: [
            { title: "1. Embeddings and Vector DBs", chapterIdx: 1, lessonIdx: 0, isLocked: true },
            { title: "2. Chunking and Retrieval", chapterIdx: 1, lessonIdx: 1, isLocked: true },
            { title: "3. Build a Doc Q&A Bot", chapterIdx: 1, lessonIdx: 2, isLocked: true },
          ],
        },
        {
          name: "Phase 3: Agents and Tools",
          items: [
            { title: "1. Tool Calling", chapterIdx: 2, lessonIdx: 0, isLocked: true },
            { title: "2. Multi-step Agents", chapterIdx: 2, lessonIdx: 1, isLocked: true },
          ],
        },
      ]
    }

    // Distribute actual chapters into 3 clean phases matching Image 1
    const phaseNames = [
      "Phase 1: Foundations",
      "Phase 2: RAG and Vector Search",
      "Phase 3: Agents and Tools",
      "Phase 4: Production & Deployment",
    ]

    const allItems: { title: string; chapterIdx: number; lessonIdx: number; isLocked: boolean; content?: string }[] = []
    chapters.forEach((ch, cIdx) => {
      const lessons = ch.lessons && ch.lessons.length > 0 ? ch.lessons : [{ title: ch.title, content: ch.description }]
      lessons.forEach((l, lIdx) => {
        allItems.push({
          title: l.title.replace(/^Phase\s*\d+:\s*/i, ""),
          chapterIdx: cIdx,
          lessonIdx: lIdx,
          isLocked: allItems.length >= 3, // Lock after first 3 for demo fidelity
          content: l.content,
        })
      })
    })

    // Slice into phases of 3, 3, 2, etc.
    const p1Items = allItems.slice(0, 3)
    const p2Items = allItems.slice(3, 6)
    const p3Items = allItems.slice(6)

    groups.push({ name: phaseNames[0], items: p1Items })
    if (p2Items.length > 0) groups.push({ name: phaseNames[1], items: p2Items })
    if (p3Items.length > 0) groups.push({ name: phaseNames[2], items: p3Items })

    return groups
  }, [chapters])

  const currentPhase = phases[selectedPhaseIdx] || phases[0]
  const currentItem = currentPhase?.items[selectedLessonIdx] || currentPhase?.items[0]

  // Actual content from lesson or the rich default from Image 1
  const lessonTitle = currentItem?.title?.replace(/^\d+\.\s*/, "") || "How LLMs Work"
  const rawContent = currentItem?.content

  // Check if content is custom raw HTML
  const isRawHtml = rawContent && (rawContent.includes("<div") || rawContent.includes("<html") || rawContent.includes("<section"))

  const colors = theme?.colors || {}
  const currentBg = colors.bg || colors.background || theme?.backgroundColor || "#EEF4FE"
  const currentText = colors.text || theme?.textColor || "#1B254B"
  const currentPrimary = colors.primary || theme?.primaryColor || "#5844E8"
  const currentAccent = colors.accent || "#059669"

  return (
    <div
      style={
        {
          backgroundColor: currentBg,
          color: currentText,
          "--rosera-bg": currentBg,
          "--rosera-text": currentText,
          "--rosera-primary": currentPrimary,
          "--rosera-accent": currentAccent,
        } as React.CSSProperties
      }
      className="min-h-screen font-sans antialiased flex flex-col selection:bg-purple-200 rosera-theme-root"
    >
      {/* TOP HEADER (Matching Image 1: Green 'A' logo, aspirantbook, and 0/3 progress pill) */}
      <header
        style={{ backgroundColor: currentBg }}
        className="h-14 border-b border-black/10 px-4 md:px-8 flex items-center justify-between z-20"
      >
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" href="/dashboard" />
        </div>

        <div className="flex items-center gap-4">
          {/* Progress pill: 0/3 */}
          <div className="flex items-center gap-2">
            <span style={{ color: currentText }} className="text-xs font-bold">0/3</span>
            <div className="w-24 md:w-32 h-3 rounded-full border border-black/20 bg-white/50 p-0.5 overflow-hidden">
              <div className="h-full bg-[#5844E8] rounded-full" style={{ width: "8%" }} />
            </div>
          </div>

          {/* Toggle view mode button if user wants to switch back to brutalist/classic */}
          {onToggleViewMode && (
            <button
              type="button"
              onClick={onToggleViewMode}
              className="text-[11px] font-bold text-[#5844E8] hover:underline px-2 py-1 rounded bg-white/70 border border-purple-300"
            >
              Classic View
            </button>
          )}
        </div>
      </header>

      {/* TWO COLUMN WORKSPACE: Left Sidebar + Main Reading Canvas */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* LEFT SIDEBAR (Phase hierarchy, green phase tags, active lavender pill card) */}
        <aside
          style={{ backgroundColor: currentBg }}
          className="w-full md:w-64 lg:w-72 border-r border-black/10 p-5 shrink-0 space-y-6"
        >
          {/* Course Overview Link */}
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedPhaseIdx(0)
                setSelectedLessonIdx(0)
              }}
              className="flex items-center gap-2 text-sm font-extrabold text-[#1B254B] hover:text-[#5844E8] transition-colors"
            >
              <span>📘</span>
              <span>Course Overview</span>
            </button>
          </div>

          {/* PHASES LIST */}
          <div className="space-y-6">
            {phases.map((phase, pIdx) => (
              <div key={pIdx} className="space-y-2">
                {/* Green Phase Header Label */}
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#059669]">
                  {phase.name}
                </div>

                {/* Phase Items List */}
                <div className="space-y-1.5">
                  {phase.items.map((item, iIdx) => {
                    const isActive = selectedPhaseIdx === pIdx && selectedLessonIdx === iIdx

                    return (
                      <button
                        key={iIdx}
                        type="button"
                        onClick={() => {
                          setSelectedPhaseIdx(pIdx)
                          setSelectedLessonIdx(iIdx)
                          if (onSelectLesson) {
                            onSelectLesson(item.chapterIdx, item.lessonIdx)
                          }
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-between ${
                          isActive
                            ? "bg-[#E4E0FB] border-2 border-[#5844E8] text-[#1B254B] shadow-xs"
                            : "text-[#1B254B]/90 hover:bg-white/50 border border-transparent"
                        }`}
                      >
                        <span className="truncate pr-2">{item.title}</span>
                        {item.isLocked && (
                          <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN INTERACTIVE CONTENT CANVAS (Exact layout from Image 1) */}
        <main className="flex-1 p-6 md:p-10 lg:p-12 max-w-5xl">
          {/* Phase Badge Pill */}
          <div className="mb-3">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#1E254D] text-white">
              {currentPhase.name}
            </span>
          </div>

          {/* Main Topic Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1B254B] tracking-tight mb-4">
            {lessonTitle}
          </h1>

          {/* Main Topic Content - Fluid, Data-Driven & 100% General */}
          {rawContent ? (
            <div className="space-y-6">
              <RoseraRenderer content={rawContent} />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 rounded-xl bg-white/40 border border-[#1B254B]/10">
              No content authored for this subtopic yet.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
