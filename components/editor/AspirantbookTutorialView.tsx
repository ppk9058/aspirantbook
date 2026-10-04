"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Search, Palette, Download, Sparkles, CheckCircle2, Lock, ArrowRight, Settings } from "lucide-react"
import { RoseraRenderer } from "./RoseraRenderer"
import { inlineFmt } from "@/lib/rosera/inline"
import "./rosera.css"

interface Lesson {
    id: string
    title: string
    content: string
    order: number
    duration?: number
    durationText?: string
}

interface Chapter {
    id: string
    title: string
    order: number
    lessons: Lesson[]
}

interface AspirantbookTutorialViewProps {
    course: {
        id: string
        title: string
        slug: string
        description?: string
        technology?: string
        difficulty?: string
        duration?: number
        rating?: number
        enrollmentCount?: number
        prerequisites?: string[]
        isPremium?: boolean
        metadataJson?: string | null
        theme?: any
        schemaVersion?: number
    }
    chapters: Chapter[]
    isEditor?: boolean
    onSwitchToStudio?: () => void
}

export function AspirantbookTutorialView({
    course,
    chapters,
    isEditor = false,
    onSwitchToStudio,
}: AspirantbookTutorialViewProps) {
    const [searchQuery, setSearchQuery] = useState("")

    // Parse metadata (theme, meta, includes, stats)
    const { defaultTheme, meta } = useMemo(() => {
        let parsedTheme: any = {
            colors: {
                bg: "#e4efff",
                card: "#f5f9ff",
                ink: "#1f2a6b",
                muted: "#4a5a9a",
                primary: "#3b2fd6",
                green: "#0e9f78",
                yellow: "#ffe066",
                soft: "#d3e3ff",
                code: "#26338a",
                codeink: "#eaf1ff",
            },
            fonts: {
                head: "'Space Grotesk', system-ui, sans-serif",
                body: "'Nunito', system-ui, sans-serif",
                mono: "'JetBrains Mono', ui-monospace, monospace",
            },
        }

        // Direct theme column on course model
        if (course.theme) {
            try {
                const t = typeof course.theme === "string" ? JSON.parse(course.theme) : course.theme
                if (t.colors) parsedTheme.colors = { ...parsedTheme.colors, ...t.colors }
                if (t.fonts) parsedTheme.fonts = { ...parsedTheme.fonts, ...t.fonts }
            } catch {}
        }

        const totalLessonsCount = chapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)

        const diffLabel = course.difficulty
            ? `${course.difficulty.charAt(0)}${course.difficulty.slice(1).toLowerCase()}`
            : "All Levels"

        let parsedMeta: any = {
            brand: course.technology || "aspirantbook",
            subtitle: "Interactive Tutorial Mastery",
            categoryPill: "Mastery Curriculum",
            categorySubtitle: course.technology
                ? `CURRICULUM · ${course.technology.toUpperCase()}`
                : "CURRICULUM · INTERACTIVE LEARNING",
            title: course.title,
            subject: course.technology || "Interactive Tutorial",
            status: course.isPremium ? "Premium" : "Free",
            rating: (typeof course.rating === "number" && course.rating > 0) ? course.rating.toFixed(2) : undefined,
            learners: (typeof course.enrollmentCount === "number" && course.enrollmentCount > 0) ? `${course.enrollmentCount.toLocaleString()} Learners Enrolled` : undefined,
            intro:
                course.description ||
                "Master core concepts step by step with hands-on runnable code, interactive diagrams, knowledge checks, and verified exercises.",
            includesTitle: "THIS TUTORIAL INCLUDES:",
            includes: [
                "Hands-on interactive code playgrounds and instant execution",
                "Conceptual architectural diagrams and structured visual flows",
                "End-of-chapter quizzes and comprehension assessments",
                "One-click standalone HTML & JSON exporter for website embedding",
            ],
            stats: [
                ["SKILL LEVEL", diffLabel],
                ["TOTAL PHASES", `${chapters.length} Phases`],
                ["CHAPTERS", `${totalLessonsCount} Chapters`],
                ["PREREQUISITES", (course.prerequisites && course.prerequisites.length > 0) ? course.prerequisites.join(", ") : "None"],
            ],
            badge1: course.technology || "Tutorial",
            badge2: diffLabel,
        }

        if (course.metadataJson) {
            try {
                const parsed = JSON.parse(course.metadataJson)
                if (parsed.theme) {
                    parsedTheme = {
                        colors: { ...parsedTheme.colors, ...(parsed.theme.colors || {}) },
                        fonts: { ...parsedTheme.fonts, ...(parsed.theme.fonts || {}) },
                    }
                }
                if (parsed.meta) {
                    parsedMeta = { ...parsedMeta, ...parsed.meta }
                }
            } catch (e) {
                console.error("Failed to parse metadataJson:", e)
            }
        }

        return { defaultTheme: parsedTheme, meta: parsedMeta }
    }, [course, chapters])

    // Theme cycling
    const [themeIndex, setThemeIndex] = useState(0)
    const themesList = useMemo(() => {
        return [
            defaultTheme,
            {
                ...defaultTheme,
                colors: {
                    ...defaultTheme.colors,
                    bg: "#e0f2fe",
                    card: "#f0f9ff",
                    ink: "#0c4a6e",
                    primary: "#0284c7",
                    green: "#059669",
                    yellow: "#fef08a",
                    soft: "#bae6fd",
                },
            },
            {
                ...defaultTheme,
                colors: {
                    ...defaultTheme.colors,
                    bg: "#fff1f2",
                    card: "#fff5f5",
                    ink: "#881337",
                    primary: "#e11d48",
                    green: "#059669",
                    yellow: "#fde047",
                    soft: "#fecdd3",
                },
            },
        ]
    }, [defaultTheme])

    const theme = themesList[themeIndex % themesList.length]

    const cycleTheme = () => {
        setThemeIndex((prev) => prev + 1)
    }

    // Flatten all lessons in curriculum order
    const orderedLessons = useMemo(() => {
        const list: Array<{
            chapterId: string
            phaseTitle: string
            lessonId: string
            title: string
            content: string
            isLocked: boolean
        }> = []

        chapters.forEach((ch) => {
            ;(ch.lessons || []).forEach((l) => {
                let isLocked = false
                try {
                    const parsed = JSON.parse(l.content)
                    if (parsed?.blocks?.[0]?.content?.includes("scheduled for an upcoming release")) {
                        isLocked = true
                    }
                } catch {}

                list.push({
                    chapterId: ch.id,
                    phaseTitle: ch.title,
                    lessonId: l.id,
                    title: l.title,
                    content: l.content,
                    isLocked,
                })
            })
        })

        return list
    }, [chapters])

    // Active view: "overview" or lessonId
    const [activeId, setActiveId] = useState<string>("overview")

    // Completed lessons state (synced with localStorage)
    const [doneMap, setDoneMap] = useState<Record<string, boolean>>({})

    const storageKey = `aspirantbook_done_${course.id}`

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey)
            if (saved) {
                setDoneMap(JSON.parse(saved))
            } else {
                if (orderedLessons.length > 0) {
                    setDoneMap({ [orderedLessons[0].lessonId]: true })
                }
            }
        } catch {}
    }, [storageKey, orderedLessons])

    const markLessonDone = (lessonId: string) => {
        setDoneMap((prev) => {
            const updated = { ...prev, [lessonId]: true }
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated))
            } catch {}
            return updated
        })
    }

    // Calculate progress
    const unlockedLessons = orderedLessons.filter((l) => !l.isLocked)
    const completedCount = unlockedLessons.filter((l) => doneMap[l.lessonId]).length
    const totalCount = Math.max(unlockedLessons.length, 1)
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    // Filter chapters based on search query
    const filteredChapters = useMemo(() => {
        if (!searchQuery.trim()) return chapters
        const q = searchQuery.toLowerCase().trim()
        return chapters
            .map((ch) => {
                const matchCh = ch.title.toLowerCase().includes(q)
                const matchingLessons = (ch.lessons || []).filter((l) =>
                    l.title.toLowerCase().includes(q)
                )
                if (matchCh) return ch
                if (matchingLessons.length > 0) {
                    return { ...ch, lessons: matchingLessons }
                }
                return null
            })
            .filter(Boolean) as Chapter[]
    }, [chapters, searchQuery])

    // Currently selected lesson
    const currentLessonIndex = orderedLessons.findIndex((l) => l.lessonId === activeId)
    const currentLesson = currentLessonIndex >= 0 ? orderedLessons[currentLessonIndex] : null
    const nextLesson =
        currentLessonIndex >= 0 && currentLessonIndex + 1 < orderedLessons.length
            ? orderedLessons[currentLessonIndex + 1]
            : null

    const handleSelectLesson = (lessonId: string, isLocked: boolean) => {
        if (isLocked) return
        setActiveId(lessonId)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    const handleStartTutorial = () => {
        if (orderedLessons.length > 0) {
            setActiveId(orderedLessons[0].lessonId)
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }

    const handleGoNext = () => {
        if (nextLesson && !nextLesson.isLocked) {
            setActiveId(nextLesson.lessonId)
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }

    const handleExportSite = () => {
        const fullData = {
            theme,
            meta,
            chapters,
        }
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${(course.slug || "tutorial")}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const colors = theme.colors || {}
    const cBg = colors.bg || "#e4efff"
    const cCard = colors.card || "#f5f9ff"
    const cInk = colors.ink || "#1f2a6b"
    const cPrimary = colors.primary || "#3b2fd6"
    const cGreen = colors.green || "#0e9f78"
    const cYellow = colors.yellow || "#ffe066"
    const cSoft = colors.soft || "#d3e3ff"
    const cCode = colors.code || "#26338a"

    const themeFonts = theme.fonts || {}
    const fontHead = themeFonts.head || "Space Grotesk"
    const fontBody = themeFonts.body || "Nunito"
    const fontMono = themeFonts.mono || "JetBrains Mono"

    // Dynamically load Google fonts
    useEffect(() => {
        const rawFonts = [fontHead, fontBody, fontMono]
        const validFonts = rawFonts
            .filter((f): f is string => Boolean(f && typeof f === "string" && /^[\w\s-]+$/.test(f)))
            .map((f) => f.trim())
            .filter(
                (f) =>
                    !["system-ui", "sans-serif", "serif", "monospace", "ui-monospace", "inherit", "initial"].includes(
                        f.toLowerCase()
                    )
            )

        if (validFonts.length === 0) return
        const uniqueFonts = Array.from(new Set(validFonts))
        const familiesParam = uniqueFonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800;900`).join("&")
        const href = `https://fonts.googleapis.com/css2?${familiesParam}&display=swap`

        const linkId = "aspirantbook-google-fonts"
        let linkEl = document.getElementById(linkId) as HTMLLinkElement | null
        if (!linkEl) {
            linkEl = document.createElement("link")
            linkEl.id = linkId
            linkEl.rel = "stylesheet"
            document.head.appendChild(linkEl)
        }
        linkEl.href = href
    }, [fontHead, fontBody, fontMono])

    return (
        <div
            style={
                {
                    "--tutorial-bg": cBg,
                    "--tutorial-card": cCard,
                    "--tutorial-ink": cInk,
                    "--tutorial-primary": cPrimary,
                    "--tutorial-green": cGreen,
                    "--tutorial-yellow": cYellow,
                    "--tutorial-soft": cSoft,
                    "--tutorial-code": cCode,
                    "--rz-bg": cBg,
                    "--rz-card": cCard,
                    "--rz-ink": cInk,
                    "--rz-primary": cPrimary,
                    "--rz-green": cGreen,
                    "--rz-yellow": cYellow,
                    "--rz-soft": cSoft,
                    "--rz-code": cCode,
                    "--bg": cBg,
                    "--card": cCard,
                    "--ink": cInk,
                    "--primary": cPrimary,
                    "--green": cGreen,
                    "--yellow": cYellow,
                    "--soft": cSoft,
                    backgroundColor: "var(--tutorial-bg, #e4efff)",
                    color: "var(--tutorial-ink, #1f2a6b)",
                    minHeight: "100vh",
                    fontFamily: `'${fontBody}', system-ui, sans-serif`,
                } as React.CSSProperties
            }
            className="aspirantbook-container selection:bg-[color:var(--tutorial-soft,#d3e3ff)]"
        >
            {/* Custom Embedded Scoped CSS matching Image 1 to perfection */}
            <style dangerouslySetInnerHTML={{ __html: `
                .aspirantbook-container * { box-sizing: border-box; }
                .aspirantbook-head { font-family: '${fontHead}', system-ui, sans-serif; }
                .aspirantbook-mono { font-family: '${fontMono}', ui-monospace, monospace; }
                
                /* Pill Badge */
                .asp-pill {
                    display: inline-block;
                    background: ${cInk};
                    color: ${cCard};
                    border-radius: 99px;
                    padding: 3px 14px;
                    font-family: '${fontHead}', system-ui, sans-serif;
                    font-size: 13px;
                    font-weight: 700;
                }

                /* Sidebar Navigation Button */
                .asp-nv {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    text-align: left;
                    border: 2px solid transparent;
                    background: transparent;
                    border-radius: 12px;
                    padding: 8px 12px;
                    margin: 2px 0;
                    font-size: 13.5px;
                    font-weight: 600;
                    color: ${cInk};
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .asp-nv:hover:not(.disabled) {
                    background: ${cSoft};
                }
                .asp-nv.active {
                    background: ${cSoft} !important;
                    border-color: ${cPrimary} !important;
                    box-shadow: 3px 3px 0 ${cPrimary} !important;
                    font-weight: 800 !important;
                    color: ${cInk} !important;
                }
                .asp-nv.disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                /* Action Neo-Brutalist Buttons */
                .asp-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: ${cPrimary};
                    color: #fff;
                    border: 3px solid ${cInk};
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-family: '${fontHead}', system-ui, sans-serif;
                    font-weight: 700;
                    font-size: 16px;
                    box-shadow: 4px 4px 0 ${cInk};
                    cursor: pointer;
                    transition: transform 0.1s, box-shadow 0.1s;
                }
                .asp-btn:hover {
                    box-shadow: 5px 5px 0 ${cInk};
                }
                .asp-btn:active {
                    transform: translate(2px, 2px);
                    box-shadow: 2px 2px 0 ${cInk};
                }
                .asp-btn-yellow {
                    background: ${cYellow};
                    color: ${cInk};
                    border: 3px solid ${cInk};
                    box-shadow: 4px 4px 0 ${cInk};
                }
                .asp-btn-yellow:hover {
                    filter: brightness(1.03);
                }
                .asp-btn.complete-btn {
                    background: ${cCard};
                    color: ${cInk};
                    border-color: ${cInk};
                }
                .asp-btn.complete-btn.is-done {
                    background: ${cSoft};
                    color: ${cGreen};
                    border-color: ${cGreen};
                }
            ` }} />

            {/* TOP STICKY BAR matching Image 1 */}
            <header
                style={{ backgroundColor: cCard, borderBottom: `3px solid ${cInk}` }}
                className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 h-[58px] gap-2 sm:gap-4 overflow-x-auto"
            >
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <Link href="/tutorials" className="flex items-center gap-2.5 group">
                        <div
                            style={{ backgroundColor: cGreen, border: `2px solid ${cInk}` }}
                            className="w-[36px] h-[36px] rounded-[10px] text-white flex items-center justify-center font-bold text-lg aspirantbook-head shadow-xs"
                        >
                            A
                        </div>
                        <div className="hidden sm:flex flex-col text-left">
                            <span
                                style={{ color: cInk }}
                                className="aspirantbook-head font-extrabold text-sm sm:text-base leading-tight tracking-tight"
                            >
                                {meta.brand || meta.title || course.title}
                            </span>
                            <span className="text-[11px] font-bold text-gray-500 leading-tight">
                                {meta.subtitle || "Interactive Tutorial"}
                            </span>
                        </div>
                    </Link>

                    {/* Category Tags / Pills (Image 1) */}
                    {(meta.badge1 || meta.badge2) && (
                        <div className="hidden md:flex items-center gap-1.5 ml-2">
                            {meta.badge1 && (
                                <span
                                    style={{
                                        backgroundColor: cYellow,
                                        border: `2px solid ${cInk}`,
                                        color: cInk,
                                    }}
                                    className="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                                >
                                    ✦ {meta.badge1}
                                </span>
                            )}
                            {meta.badge2 && (
                                <span
                                    style={{
                                        backgroundColor: cSoft,
                                        border: `2px solid ${cInk}`,
                                        color: cInk,
                                    }}
                                    className="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                                >
                                    ● {meta.badge2}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Phase Tabs in Top Navigation (Image 1) */}
                <div className="hidden xl:flex items-center gap-4 text-xs font-bold" style={{ color: cInk }}>
                    {chapters.slice(0, 6).map((ch, idx) => (
                        <button
                            key={ch.id || idx}
                            type="button"
                            onClick={() => {
                                const firstLesson = ch.lessons?.[0]
                                if (firstLesson) {
                                    setActiveId(firstLesson.id)
                                    window.scrollTo({ top: 0, behavior: "smooth" })
                                } else {
                                    setActiveId("overview")
                                }
                            }}
                            className="hover:underline transition-all cursor-pointer opacity-80 hover:opacity-100 hover:text-[#3b2fd6]"
                        >
                            Phase {idx + 1}
                        </button>
                    ))}
                </div>

                {/* Right controls: Progress + Theme + Download & Export */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        <span
                            style={{ color: cInk }}
                            className="aspirantbook-head text-xs font-bold"
                        >
                            {Math.round(progressPercent)}%
                        </span>
                        <div
                            style={{
                                width: "clamp(60px, 12vw, 120px)",
                                height: "10px",
                                backgroundColor: cSoft,
                                border: `2px solid ${cInk}`,
                                borderRadius: "9px",
                            }}
                            className="overflow-hidden p-[1px] flex items-center"
                        >
                            <div
                                style={{
                                    width: `${progressPercent}%`,
                                    backgroundColor: cGreen,
                                    borderRadius: "8px",
                                    height: "100%",
                                    transition: "width 0.4s ease-out",
                                }}
                            />
                        </div>
                    </div>

                    {/* Theme button */}
                    <button
                        type="button"
                        onClick={cycleTheme}
                        style={{
                            backgroundColor: cCard,
                            border: `2px solid ${cInk}`,
                            color: cInk,
                            borderRadius: "10px",
                        }}
                        className="px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 hover:brightness-95 active:translate-y-0.5 shadow-[2px_2px_0px_var(--tutorial-ink,#1f2a6b)]"
                        title="Switch theme palette"
                    >
                        <span>🎨</span>
                        <span className="hidden sm:inline">Theme</span>
                    </button>

                    {/* Download & Export button */}
                    <button
                        type="button"
                        onClick={handleExportSite}
                        style={{
                            backgroundColor: cYellow,
                            border: `2px solid ${cInk}`,
                            color: cInk,
                            borderRadius: "10px",
                            boxShadow: `2px 2px 0 ${cInk}`,
                        }}
                        className="px-2.5 sm:px-3 py-1 text-xs font-bold flex items-center gap-1.5 hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                        <span>📥</span>
                        <span className="hidden sm:inline">Download & Export</span>
                    </button>

                    {/* Teacher Studio toggle (if admin/teacher) */}
                    {isEditor && onSwitchToStudio && (
                        <button
                            type="button"
                            onClick={onSwitchToStudio}
                            style={{
                                backgroundColor: cPrimary,
                                border: `2px solid ${cInk}`,
                                color: "#fff",
                                borderRadius: "10px",
                                boxShadow: `2px 2px 0 ${cInk}`,
                            }}
                            className="px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                            title="Switch back to Teacher Studio editor"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Back to Studio</span>
                        </button>
                    )}
                </div>
            </header>

            {/* MAIN TWO-COLUMN WORKSPACE: Single Sidebar + Main Canvas */}
            <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] min-h-[calc(100vh-58px)]">
                {/* LEFT SIDEBAR (Sticky single navigation index with Search) */}
                <aside
                    style={{ backgroundColor: cCard, borderRight: `3px solid ${cInk}` }}
                    className="p-3.5 sm:p-4 lg:sticky lg:top-[58px] lg:h-[calc(100vh-58px)] overflow-y-auto"
                >
                    {/* Real-time Search input (Image 1) */}
                    <div className="relative mb-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chapters or topics..."
                            style={{
                                backgroundColor: cCard,
                                border: `2px solid ${cInk}`,
                                borderRadius: "10px",
                                color: cInk,
                            }}
                            className="w-full text-xs font-semibold px-3 py-2 pl-8 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tutorial-primary,#3b2fd6)]"
                        />
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                    </div>

                    {/* Course Overview Link */}
                    <div className="mb-3">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveId("overview")
                                window.scrollTo({ top: 0, behavior: "smooth" })
                            }}
                            className={`asp-nv ${activeId === "overview" ? "active" : ""}`}
                        >
                            <span className="text-base">📖</span>
                            <span>Course Overview & Roadmap</span>
                        </button>
                    </div>

                    {/* PHASES HIERARCHY */}
                    <div className="space-y-4">
                        {filteredChapters.map((ch, pIdx) => {
                            const phaseLessons = ch.lessons || []

                            return (
                                <div key={ch.id || pIdx} className="space-y-1">
                                    {/* Green Phase Title (Image 1) */}
                                    <h5
                                        style={{ color: cGreen }}
                                        className="aspirantbook-head font-bold text-xs uppercase tracking-wider px-2 pt-2 pb-1"
                                    >
                                        {ch.title}
                                    </h5>

                                    {/* Phase Chapters / Lessons */}
                                    <div className="space-y-0.5">
                                        {phaseLessons.map((l) => {
                                            const isSelected = activeId === l.id
                                            const isDone = Boolean(doneMap[l.id])

                                            let isLocked = false
                                            try {
                                                const parsed = JSON.parse(l.content)
                                                if (parsed?.blocks?.[0]?.content?.includes("scheduled for an upcoming release")) {
                                                    isLocked = true
                                                }
                                            } catch {}

                                            return (
                                                <button
                                                    key={l.id}
                                                    type="button"
                                                    disabled={isLocked}
                                                    onClick={() => handleSelectLesson(l.id, isLocked)}
                                                    className={`asp-nv ${isSelected ? "active" : ""} ${isLocked ? "disabled" : ""}`}
                                                    title={isLocked ? "Coming in a later phase" : l.title}
                                                >
                                                    <span className="truncate pr-1">{l.title}</span>
                                                    {isDone && !isLocked && (
                                                        <span
                                                            style={{ color: cGreen }}
                                                            className="ml-auto font-extrabold text-sm flex-shrink-0"
                                                        >
                                                            ✔
                                                        </span>
                                                    )}
                                                    {isLocked && (
                                                        <span className="ml-auto text-xs opacity-70 flex-shrink-0">
                                                            🔒
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </aside>

                {/* RIGHT MAIN CONTENT CANVAS */}
                <main className="p-5 sm:p-8 lg:p-12 max-w-[1060px] w-full mx-auto">
                    {/* VIEW 1: COURSE OVERVIEW HERO & ROADMAP (Exact Image 1 layout) */}
                    {activeId === "overview" && (
                        <div className="space-y-8 animate-in fade-in-50 duration-200">
                            {/* Badges on Top */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="asp-pill">{meta.categoryPill || "Mastery Curriculum"}</span>
                                <span
                                    style={{ color: cGreen }}
                                    className="aspirantbook-head font-extrabold text-xs sm:text-sm tracking-wide uppercase"
                                >
                                    {meta.categorySubtitle || (course.technology ? `CURRICULUM · ${course.technology.toUpperCase()}` : "CURRICULUM · INTERACTIVE LEARNING")}
                                </span>
                            </div>

                            {/* Hero Card */}
                            <div
                                style={{
                                    backgroundColor: cCard,
                                    border: `3px solid ${cInk}`,
                                    boxShadow: `6px 6px 0 ${cPrimary}`,
                                }}
                                className="rounded-[18px] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 sm:gap-8 items-start"
                            >
                                <div className="space-y-4">
                                    <h1
                                        style={{ color: cInk }}
                                        className="aspirantbook-head text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight"
                                    >
                                        {meta.title || course.title}
                                    </h1>
                                    <p
                                        className="text-base sm:text-lg leading-relaxed text-gray-800 dark:text-gray-200"
                                        dangerouslySetInnerHTML={{
                                            __html: inlineFmt(meta.intro || course.description || ""),
                                        }}
                                    />
                                    <p
                                        style={{ color: cInk }}
                                        className="aspirantbook-head text-sm font-bold flex flex-wrap items-center gap-3 pt-1"
                                    >
                                        {meta.rating ? (
                                            <>
                                                <span className="text-[#eab308]">★ {meta.rating} Rating</span>
                                                <span>·</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Interactive Tutorial</span>
                                                <span>·</span>
                                            </>
                                        )}
                                        {meta.learners && (
                                            <>
                                                <span>{meta.learners}</span>
                                                <span>·</span>
                                            </>
                                        )}
                                        <span style={{ color: cPrimary }}>
                                            {orderedLessons.length} Interactive Chapters
                                        </span>
                                    </p>

                                    <div className="flex flex-wrap items-center gap-3 pt-3">
                                        <button
                                            type="button"
                                            onClick={handleStartTutorial}
                                            className="asp-btn"
                                        >
                                            <span>▶ Start Reading Tutorial</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportSite}
                                            className="asp-btn asp-btn-yellow"
                                        >
                                            <span>📥 Download & Export Site</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Includes Checklist Card (Image 1) */}
                                <div
                                    style={{
                                        backgroundColor: cCard,
                                        border: `3px solid ${cInk}`,
                                        boxShadow: `6px 6px 0 ${cPrimary}`,
                                    }}
                                    className="rounded-[18px] p-5 sm:p-6 space-y-3.5"
                                >
                                    <b
                                        style={{ color: cPrimary }}
                                        className="aspirantbook-head block text-sm sm:text-base font-extrabold uppercase tracking-wide"
                                    >
                                        {meta.includesTitle || "THIS MASTERCLASS INCLUDES:"}
                                    </b>
                                    <ul className="space-y-2.5 text-xs sm:text-sm font-bold text-gray-700">
                                        {(meta.includes || []).map((inc: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2.5">
                                                <span style={{ color: cGreen }} className="font-extrabold flex-shrink-0 mt-0.5">✦</span>
                                                <span className="leading-snug">{inc}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* 4 Stats Cards Grid (Image 1) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                {(meta.stats || []).map((s: [string, string], idx: number) => (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: cCard,
                                            border: `2px solid ${cInk}`,
                                            boxShadow: `3px 3px 0 ${cGreen}`,
                                        }}
                                        className="rounded-xl p-4 transition-transform hover:-translate-y-0.5"
                                    >
                                        <small
                                            style={{ color: colors.muted || "var(--tutorial-muted, #4a5a9a)" }}
                                            className="block text-[11px] font-extrabold uppercase tracking-wider"
                                        >
                                            {s[0]}
                                        </small>
                                        <b
                                            style={{ color: cInk }}
                                            className="aspirantbook-head block text-base sm:text-lg lg:text-xl font-extrabold mt-1"
                                        >
                                            {s[1]}
                                        </b>
                                    </div>
                                ))}
                            </div>

                            {/* Personal Learning Progress Card (Image 1) */}
                            <div
                                style={{
                                    backgroundColor: cSoft,
                                    border: `2px solid ${cGreen}`,
                                }}
                                className="rounded-xl p-4 sm:p-5 space-y-2.5"
                            >
                                <div className="flex items-center justify-between text-xs sm:text-sm font-bold" style={{ color: cInk }}>
                                    <span>Your Personal Learning Progress</span>
                                    <span>
                                        {completedCount} of {totalCount} chapters completed ({Math.round(progressPercent)}%)
                                    </span>
                                </div>
                                <div
                                    style={{
                                        height: "12px",
                                        backgroundColor: cCard,
                                        border: `2px solid ${cInk}`,
                                        borderRadius: "9px",
                                    }}
                                    className="overflow-hidden p-[1px] flex items-center"
                                >
                                    <div
                                        style={{
                                            width: `${progressPercent}%`,
                                            backgroundColor: cGreen,
                                            borderRadius: "8px",
                                            height: "100%",
                                            transition: "width 0.4s ease-out",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Your Roadmap Grid */}
                            <div className="space-y-4 pt-2">
                                <h3
                                    style={{
                                        backgroundColor: cSoft,
                                        borderLeft: `8px solid ${cGreen}`,
                                        color: cInk,
                                    }}
                                    className="aspirantbook-head font-bold text-xl sm:text-2xl p-3 sm:p-4 rounded-r-xl"
                                >
                                    Your roadmap
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {chapters.map((ch, idx) => {
                                        const emojis = ["🧠", "🔎", "🤖", "🛡️", "🚀", "🏆"]
                                        return (
                                            <div
                                                key={ch.id || idx}
                                                style={{
                                                    backgroundColor: cCard,
                                                    border: `3px solid ${cInk}`,
                                                    boxShadow: `4px 4px 0 ${cGreen}`,
                                                }}
                                                className="rounded-xl p-4 sm:p-5 space-y-1.5 cursor-pointer hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                                                onClick={() => {
                                                    const firstLesson = ch.lessons?.[0]
                                                    if (firstLesson) {
                                                        setActiveId(firstLesson.id)
                                                        window.scrollTo({ top: 0, behavior: "smooth" })
                                                    }
                                                }}
                                            >
                                                <span className="text-2xl sm:text-3xl block">{emojis[idx % emojis.length]}</span>
                                                <b
                                                    style={{ color: cInk }}
                                                    className="aspirantbook-head block text-base font-bold"
                                                >
                                                    {ch.title}
                                                </b>
                                                <small className="block text-xs text-gray-600 font-semibold">
                                                    {(ch.lessons || []).length} topics
                                                </small>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: CHAPTER / LESSON CONTENT (Exact layout from Image 1) */}
                    {activeId !== "overview" && currentLesson && (
                        <div className="space-y-6 animate-in fade-in-50 duration-200">
                            {/* Phase Tag Pill */}
                            <div>
                                <span className="asp-pill">{currentLesson.phaseTitle}</span>
                            </div>

                            {/* Chapter Headline */}
                            <h2
                                style={{ color: cInk }}
                                className="aspirantbook-head text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
                            >
                                {currentLesson.title.replace(/^\d+\.\s*/, "")}
                            </h2>

                            {/* Render lesson content using RoseraRenderer with exact theme colors */}
                            <div className="pt-2 text-base" style={{ color: cInk }}>
                                <RoseraRenderer content={currentLesson.content} theme={theme} courseTitle={course.title} />
                            </div>

                            {/* Bottom Actions Row: Mark Complete + Next Chapter */}
                            <div
                                style={{ borderColor: `${cInk}33` }}
                                className="flex flex-wrap items-center justify-between gap-4 pt-10 border-t-2 mt-12"
                            >
                                <button
                                    type="button"
                                    onClick={() => markLessonDone(currentLesson.lessonId)}
                                    className={`asp-btn complete-btn ${
                                        doneMap[currentLesson.lessonId] ? "is-done" : ""
                                    }`}
                                >
                                    <span>
                                        {doneMap[currentLesson.lessonId]
                                            ? "✔ Completed"
                                            : "✔ Mark complete"}
                                    </span>
                                </button>

                                {nextLesson && !nextLesson.isLocked && (
                                    <button
                                        type="button"
                                        onClick={handleGoNext}
                                        className="asp-btn"
                                    >
                                        <span>Next chapter ➜</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
