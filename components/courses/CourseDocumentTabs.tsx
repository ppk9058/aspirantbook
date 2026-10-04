"use client"

import React, { useState, useEffect, useRef } from "react"
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    FileText,
    Plus,
    MoreVertical,
    Edit3,
    Trash2,
    Copy,
    BookOpen,
    PlayCircle,
    Code,
    Sparkles,
    CheckCircle2
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface TabSelection {
    type: "overview" | "chapter" | "lesson" | "new_chapter"
    chapterId?: string
    lessonId?: string
    mode?: "view" | "edit"
}

interface CourseDocumentTabsProps {
    course: any
    chapters: any[]
    activeTab: TabSelection
    onSelectOverview: () => void
    onSelectChapter: (chapterId: string, mode?: "view" | "edit") => void
    onSelectLesson: (chapterId: string, lessonId: string, mode?: "view" | "edit") => void
    onAddChapter: () => void
    onEditChapter: (chapterId: string) => void
    onAddLesson: (chapterId: string) => void
    onDuplicateChapter?: (chapterId: string) => void
    onDeleteChapter?: (chapterId: string) => void
    onDuplicateLesson?: (chapterId: string, lessonId: string) => void
    onDeleteLesson?: (chapterId: string, lessonId: string) => void
    onImportCurriculum?: () => void
    isEditor?: boolean
    isCollapsed: boolean
    onToggleCollapse: () => void
}

export function CourseDocumentTabs({
    course,
    chapters,
    activeTab,
    onSelectOverview,
    onSelectChapter,
    onSelectLesson,
    onAddChapter,
    onEditChapter,
    onAddLesson,
    onDuplicateChapter,
    onDeleteChapter,
    onDuplicateLesson,
    onDeleteLesson,
    onImportCurriculum,
    isEditor = false,
    isCollapsed,
    onToggleCollapse,
}: CourseDocumentTabsProps) {
    // Keep track of which chapters are expanded in the document tabs tree
    const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        chapters.forEach((ch) => {
            initial[ch.id] = true // default all expanded for quick navigation
        })
        return initial
    })

    const toggleChapterExpand = (chapterId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setExpandedChapters((prev) => ({
            ...prev,
            [chapterId]: !prev[chapterId],
        }))
    }

    const tabsContainerRef = useRef<HTMLDivElement>(null)

    // Auto-expand active chapter in the sidebar when user scrolls into its lessons
    useEffect(() => {
        if (activeTab.chapterId) {
            setExpandedChapters((prev) => {
                if (prev[activeTab.chapterId!] === true) return prev
                return { ...prev, [activeTab.chapterId!]: true }
            })
        }
    }, [activeTab.chapterId])

    // Smoothly ensure the active sidebar item stays visible inside the sidebar container ONLY (zero window interference)
    useEffect(() => {
        const container = tabsContainerRef.current
        if (!container) return
        const activeItem = container.querySelector(".document-tab-active") as HTMLElement | null
        if (!activeItem) return

        const itemTop = activeItem.offsetTop
        const itemBottom = itemTop + activeItem.offsetHeight
        const viewTop = container.scrollTop
        const viewBottom = viewTop + container.clientHeight

        if (itemTop < viewTop) {
            container.scrollTo({ top: Math.max(0, itemTop - 16), behavior: "smooth" })
        } else if (itemBottom > viewBottom) {
            container.scrollTo({
                top: itemBottom - container.clientHeight + 16,
                behavior: "smooth",
            })
        }
    }, [activeTab])

    if (isCollapsed) {
        return (
            <div className="hidden lg:flex flex-shrink-0 flex-col items-center py-3 px-1.5 bg-white dark:bg-[#0B132B] border-r-2 border-[#10162F] dark:border-gray-800 transition-all sticky top-[108px] h-[calc(100vh-108px)]">
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    title="Open Document tabs"
                    className="p-2 rounded-xl bg-[#FFF5EB] dark:bg-gray-800 hover:bg-[#FFD15C] dark:hover:bg-gray-700 text-[#10162F] dark:text-white border-2 border-[#10162F] dark:border-gray-700 shadow-[2px_2px_0px_#10162F] dark:shadow-[2px_2px_0px_#374151] active:translate-x-[1px] active:translate-y-[1px] transition-all flex flex-col items-center gap-1"
                >
                    <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                    <span className="text-[9px] font-black uppercase tracking-tighter [writing-mode:vertical-rl] rotate-180 py-1">
                        Tabs Index
                    </span>
                </button>
            </div>
        )
    }

    const isOverviewActive = activeTab.type === "overview"
    const isNewChapterActive = activeTab.type === "new_chapter"

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
                onClick={onToggleCollapse}
            />

            <aside className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] flex flex-col bg-white dark:bg-[#0B132B] border-r-2 border-[#10162F] dark:border-gray-800 shadow-2xl select-none lg:static lg:z-10 lg:w-72 xl:lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-[108px] lg:h-[calc(100vh-108px)] lg:shadow-none">
                {/* Header: Google Docs "← Document tabs +" */}
                <div className="flex items-center justify-between px-3.5 py-3 border-b-2 border-[#10162F] dark:border-gray-800 bg-[#FFFDF9] dark:bg-[#0F172A]">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-[#10162F] transition-colors"
                            title="Collapse tabs index"
                        >
                            <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                        </button>
                        <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-[#3A10E5] dark:text-indigo-400 stroke-[2.5]" />
                            <span className="font-extrabold text-sm text-[#10162F] dark:text-white tracking-tight">
                                Document tabs
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {isEditor && (
                            <button
                                type="button"
                                onClick={onAddChapter}
                                className="p-1.5 rounded-lg bg-[#3A10E5] hover:bg-[#300ec2] text-white border border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1"
                                title="Add chapter (opens Rosera Editor)"
                            >
                                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                                <span className="text-[11px] font-extrabold hidden sm:inline">Add</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 lg:hidden"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Scrollable Document Tabs Tree */}
                <div ref={tabsContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-1">
                {/* Root Tab: Course Overview (Requirement 2a) */}
                <div
                    onClick={onSelectOverview}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isOverviewActive
                            ? "bg-[#3A10E5]/10 text-[#3A10E5] border-[#3A10E5] shadow-[2px_2px_0px_#3A10E5] document-tab-active"
                            : "bg-white text-gray-800 border-transparent hover:bg-gray-50 hover:border-gray-200"
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText
                            className={`h-4 w-4 flex-shrink-0 ${
                                isOverviewActive ? "text-[#3A10E5]" : "text-gray-500"
                            }`}
                        />
                        <span className="truncate font-extrabold text-sm">Course Overview</span>
                    </div>
                    <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            isOverviewActive
                                ? "bg-[#3A10E5] text-white"
                                : "bg-gray-100 text-gray-600"
                        }`}
                    >
                        Overview
                    </span>
                </div>

                {/* If New Chapter is currently being drafted in Rosera Editor */}
                {isNewChapterActive && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-[#FFD15C]/25 text-[#10162F] border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] animate-pulse">
                        <div className="flex items-center gap-2 min-w-0">
                            <Edit3 className="h-4 w-4 text-[#3A10E5] flex-shrink-0" />
                            <span className="truncate font-extrabold text-xs">
                                New Chapter (Drafting...)
                            </span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-[#3A10E5] text-white px-1.5 py-0.5 rounded border border-[#10162F]">
                            🌹 Rosera Editor
                        </span>
                    </div>
                )}

                {/* Section Separator */}
                <div className="pt-2 pb-1 px-2 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <span>Curriculum Tabs ({chapters.length})</span>
                    {chapters.length > 0 && (
                        <span>
                            {chapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)} topics
                        </span>
                    )}
                </div>

                {/* Chapters & Subtopics List */}
                {chapters.map((chapter, chapterIndex) => {
                    const isChapterActive =
                        activeTab.chapterId === chapter.id
                    const hasLessons = Boolean(chapter.lessons && chapter.lessons.length > 0)
                    const isExpanded = Boolean(expandedChapters[chapter.id])

                    return (
                        <div key={chapter.id} className="space-y-0.5">
                            {/* Chapter Item */}
                            <div
                                onClick={() => onSelectChapter(chapter.id, "view")}
                                className={`group/item flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                    isChapterActive
                                        ? "bg-[#3A10E5]/10 text-[#3A10E5] border-[#3A10E5] shadow-[2px_2px_0px_#3A10E5] font-extrabold document-tab-active"
                                        : "bg-white text-gray-800 border-transparent hover:bg-gray-50 hover:border-gray-200"
                                }`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {/* Chevron expand/collapse toggle if has lessons */}
                                    {hasLessons ? (
                                        <button
                                            type="button"
                                            onClick={(e) => toggleChapterExpand(chapter.id, e)}
                                            className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-[#10162F] transition-colors"
                                            title={isExpanded ? "Collapse topics" : "Expand topics"}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    ) : (
                                        <span className="w-4 flex-shrink-0" />
                                    )}

                                    {/* Chapter Icon */}
                                    <FileText
                                        className={`h-4 w-4 flex-shrink-0 ${
                                            isChapterActive ? "text-[#3A10E5]" : "text-gray-500"
                                        }`}
                                    />

                                    {/* Chapter Title */}
                                    <span className="truncate text-xs" title={chapter.title}>
                                        <span className="text-[10px] font-bold text-gray-400 mr-1">
                                            {chapterIndex + 1}.
                                        </span>
                                        {chapter.title}
                                    </span>
                                </div>

                                {/* Right Side: Actions Dropdown Menu (Google Docs 3-dots) */}
                                {isEditor && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 rounded-md text-gray-400 hover:text-[#10162F] hover:bg-gray-100 opacity-0 group-hover/item:opacity-100 transition-opacity ml-1"
                                                title="Chapter options"
                                            >
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-52 border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] font-bold"
                                        >
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onEditChapter(chapter.id)
                                                }}
                                                className="cursor-pointer gap-2 text-xs text-[#3A10E5] font-extrabold focus:text-[#3A10E5]"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                                <span>Edit in Rosera Editor</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onAddLesson(chapter.id)
                                                }}
                                                className="cursor-pointer gap-2 text-xs"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>Add Subtopic / Lesson</span>
                                            </DropdownMenuItem>
                                            {onDuplicateChapter && (
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDuplicateChapter(chapter.id)
                                                    }}
                                                    className="cursor-pointer gap-2 text-xs"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                    <span>Duplicate Chapter</span>
                                                </DropdownMenuItem>
                                            )}
                                            {onDeleteChapter && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDeleteChapter(chapter.id)
                                                        }}
                                                        className="cursor-pointer gap-2 text-xs text-red-600 focus:text-red-700"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        <span>Delete Chapter</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>

                            {/* Nested Subtopics / Lessons under this Chapter (Google Doc Style Tabs) */}
                            {hasLessons && isExpanded && (
                                <div className="pl-6 space-y-0.5 border-l-2 border-gray-100 ml-3.5 my-1">
                                    {chapter.lessons.map((lesson: any) => {
                                        const isLessonActive =
                                            activeTab.type === "lesson" &&
                                            activeTab.lessonId === lesson.id

                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() =>
                                                    onSelectLesson(chapter.id, lesson.id, "view")
                                                }
                                                className={`group/subitem flex items-center justify-between px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                                                    isLessonActive
                                                        ? "bg-[#3A10E5]/10 text-[#3A10E5] font-extrabold border border-[#3A10E5]/40 document-tab-active"
                                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400 group-hover/subitem:bg-[#3A10E5] flex-shrink-0" />
                                                    <span className="truncate" title={lesson.title}>
                                                        {lesson.title}
                                                    </span>
                                                </div>

                                                {isEditor && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1 rounded text-gray-400 hover:text-black opacity-0 group-hover/subitem:opacity-100 transition-opacity"
                                                            >
                                                                <MoreVertical className="h-3 w-3" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-48 border border-gray-300 font-bold"
                                                        >
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    onSelectLesson(chapter.id, lesson.id, "edit")
                                                                }}
                                                                className="cursor-pointer gap-2 text-xs text-[#3A10E5]"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                                <span>Edit in Rosera Editor</span>
                                                            </DropdownMenuItem>
                                                            {onDuplicateLesson && (
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        onDuplicateLesson(chapter.id, lesson.id)
                                                                    }}
                                                                    className="cursor-pointer gap-2 text-xs"
                                                                >
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                    <span>Duplicate</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {onDeleteLesson && (
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        onDeleteLesson(chapter.id, lesson.id)
                                                                    }}
                                                                    className="cursor-pointer gap-2 text-xs text-red-600"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    <span>Delete</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}

                {chapters.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-500 space-y-3">
                        <p>No chapters yet. Write tabs manually or import directly from AI Studio.</p>
                        {onImportCurriculum && isEditor && (
                            <button
                                type="button"
                                onClick={onImportCurriculum}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3A10E5] text-white font-extrabold text-xs shadow-xs hover:bg-[#300ec2] transition-all"
                            >
                                <Sparkles className="h-3.5 w-3.5 text-[#FFD15C]" />
                                <span>📥 Import AI / JSON Curriculum</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom: Google Docs "+ Add tab" Button & Import */}
            {isEditor && (
                <div className="p-3 border-t-2 border-[#10162F] bg-[#FFFDF9] space-y-2">
                    <button
                        type="button"
                        onClick={onAddChapter}
                        className="w-full py-2 px-3 rounded-xl border-2 border-dashed border-[#10162F]/30 hover:border-[#3A10E5] hover:bg-[#3A10E5]/5 text-xs font-black text-[#3A10E5] flex items-center justify-center gap-2 transition-all group active:scale-[0.99]"
                    >
                        <Plus className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform stroke-[3]" />
                        <span>+ Add tab (Chapter)</span>
                    </button>
                    {onImportCurriculum && (
                        <button
                            type="button"
                            onClick={onImportCurriculum}
                            className="w-full py-1.5 px-3 rounded-xl border border-gray-300 hover:border-[#3A10E5] hover:bg-white text-[11px] font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-all"
                        >
                            <Sparkles className="h-3 w-3 text-[#3A10E5]" />
                            <span>📥 Import AI / JSON Curriculum</span>
                        </button>
                    )}
                </div>
            )}
        </aside>
        </>
    )
}
