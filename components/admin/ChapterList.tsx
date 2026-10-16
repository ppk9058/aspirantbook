"use client"

import { useState } from "react"
import { Chapter, Lesson } from "@prisma/client"
import { ChevronDown, ChevronRight, Plus, Video, BookOpen, Code, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ItemGateRowControl, ItemGateValue } from "./authwall/ItemGateRowControl"
import { BulkGateActionBar } from "./authwall/BulkGateActionBar"

type ChapterWithLessons = Chapter & {
    lessons: (Lesson & {
        gateMode?: string
        previewPercentage?: number | null
    })[]
    gateMode?: string
    previewPercentage?: number | null
}

interface ChapterListProps {
    chapters: ChapterWithLessons[]
    selectedId: string | null
    selectedType: "chapter" | "lesson" | null
    onSelect: (id: string, type: "chapter" | "lesson") => void
    onAddChapter: () => void
    onAddLesson: (chapterId: string) => void
    onUpdateChapterGate?: (chapterId: string, gate: ItemGateValue) => void
    onUpdateLessonGate?: (chapterId: string, lessonId: string, gate: ItemGateValue) => void
    onBulkUpdateChapters?: (chapterIds: string[], gateMode: "inherit" | "free" | "preview" | "locked", pct?: number | null) => void
    isCourseGated?: boolean
    coursePreviewPercentage?: number
    disabled?: boolean
}

const getLessonIcon = (type: string) => {
    switch (type) {
        case "VIDEO":
            return Video
        case "EXERCISE":
            return Code
        case "READING":
            return BookOpen
        default:
            return FileText
    }
}

export function ChapterList({
    chapters,
    selectedId,
    selectedType,
    onSelect,
    onAddChapter,
    onAddLesson,
    onUpdateChapterGate,
    onUpdateLessonGate,
    onBulkUpdateChapters,
    isCourseGated = false,
    coursePreviewPercentage = 20,
    disabled = false,
}: ChapterListProps) {
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
        new Set(chapters.map((c) => c.id))
    )
    const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())

    const toggleChapter = (chapterId: string) => {
        const newExpanded = new Set(expandedChapters)
        if (newExpanded.has(chapterId)) {
            newExpanded.delete(chapterId)
        } else {
            newExpanded.add(chapterId)
        }
        setExpandedChapters(newExpanded)
    }

    const toggleSelectChapter = (chapterId: string) => {
        const next = new Set(selectedChapterIds)
        if (next.has(chapterId)) next.delete(chapterId)
        else next.add(chapterId)
        setSelectedChapterIds(next)
    }

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedChapterIds(new Set(chapters.map((c) => c.id)))
        } else {
            setSelectedChapterIds(new Set())
        }
    }

    // Bulk actions
    const handleBulkSetFree = () => {
        if (selectedChapterIds.size === 0 || !onBulkUpdateChapters) return
        onBulkUpdateChapters(Array.from(selectedChapterIds), "free", null)
    }

    const handleBulkSetLocked = () => {
        if (selectedChapterIds.size === 0 || !onBulkUpdateChapters) return
        onBulkUpdateChapters(Array.from(selectedChapterIds), "locked", 0)
    }

    const handleBulkSetPreview = (pct: number) => {
        if (selectedChapterIds.size === 0 || !onBulkUpdateChapters) return
        onBulkUpdateChapters(Array.from(selectedChapterIds), "preview", pct)
    }

    const handleBulkResetInherit = () => {
        if (selectedChapterIds.size === 0 || !onBulkUpdateChapters) return
        onBulkUpdateChapters(Array.from(selectedChapterIds), "inherit", null)
    }

    const handleMakeFirstNFree = (n: number) => {
        if (!onBulkUpdateChapters || chapters.length === 0) return
        const firstN = chapters.slice(0, n).map((c) => c.id)
        if (firstN.length > 0) {
            onBulkUpdateChapters(firstN, "free", null)
        }
    }

    if (chapters.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="mb-4">
                    <BookOpen className="h-12 w-12 mx-auto text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No chapters yet</h3>
                <p className="text-gray-600 mb-4">Start building your course by adding a chapter</p>
                <Button onClick={onAddChapter} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Chapter
                </Button>
            </div>
        )
    }

    const allSelected = chapters.length > 0 && selectedChapterIds.size === chapters.length

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-semibold text-gray-700">Course Structure</h3>
                <Button
                    onClick={onAddChapter}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Chapter
                </Button>
            </div>

            {/* Bulk Gate Action Bar */}
            <BulkGateActionBar
                totalItems={chapters.length}
                selectedCount={selectedChapterIds.size}
                allSelected={allSelected}
                onToggleSelectAll={toggleSelectAll}
                onBulkSetFree={handleBulkSetFree}
                onBulkSetLocked={handleBulkSetLocked}
                onBulkSetPreview={handleBulkSetPreview}
                onBulkResetInherit={handleBulkResetInherit}
                onMakeFirstNFree={handleMakeFirstNFree}
                disabled={disabled}
            />

            <div className="space-y-2">
                {chapters.map((chapter, chapterIndex) => {
                    const isExpanded = expandedChapters.has(chapter.id)
                    const isSelected = selectedId === chapter.id && selectedType === "chapter"
                    const isRowChecked = selectedChapterIds.has(chapter.id)

                    return (
                        <div key={chapter.id} className="space-y-1.5" data-testid={`chapter-row-${chapter.id}`}>
                            {/* Chapter Row Container */}
                            <div
                                className={cn(
                                    "flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-md transition-colors border",
                                    isSelected
                                        ? "bg-purple-50/70 border-purple-200 text-purple-900"
                                        : "hover:bg-gray-50/80 bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 text-gray-700"
                                )}
                            >
                                {/* Chapter Row Content */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <Checkbox
                                        checked={isRowChecked}
                                        onCheckedChange={() => toggleSelectChapter(chapter.id)}
                                        disabled={disabled}
                                        data-testid={`select-chapter-${chapter.id}`}
                                    />
                                    <button
                                        onClick={() => toggleChapter(chapter.id)}
                                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded shrink-0"
                                        type="button"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>
                                    <div
                                        onClick={() => onSelect(chapter.id, "chapter")}
                                        className="flex items-center gap-1.5 cursor-pointer min-w-0 flex-1"
                                    >
                                        <span className="text-xs font-semibold text-gray-500 shrink-0">
                                            {chapterIndex + 1}
                                        </span>
                                        <span className="text-sm font-semibold truncate">{chapter.title}</span>
                                        <span className="text-xs text-gray-400 shrink-0">
                                            ({chapter.lessons.length})
                                        </span>
                                    </div>
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onAddLesson(chapter.id)
                                        }}
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-1.5 text-xs shrink-0 text-purple-600 hover:text-purple-700"
                                        title="Add lesson to this phase"
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-0.5" />
                                        <span className="text-[11px] hidden sm:inline">Lesson</span>
                                    </Button>
                                </div>

                                {/* Compact Per-Row Gate Selector for Chapter */}
                                <div className="w-full sm:w-auto shrink-0 pl-6 sm:pl-0 pt-1 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                                    <ItemGateRowControl
                                        value={{
                                            gateMode: chapter.gateMode || "inherit",
                                            previewPercentage: chapter.previewPercentage,
                                        }}
                                        onChange={(updated) => {
                                            if (onUpdateChapterGate) {
                                                onUpdateChapterGate(chapter.id, updated)
                                            }
                                        }}
                                        coursePreviewPercentage={coursePreviewPercentage}
                                        isCourseGated={isCourseGated}
                                        disabled={disabled}
                                        parentGateMode="inherit"
                                        parentPreviewPercentage={coursePreviewPercentage}
                                        parentName="Course"
                                    />
                                </div>
                            </div>

                            {/* Lessons */}
                            {isExpanded && chapter.lessons.length > 0 && (
                                <div className="ml-5 space-y-1.5 pl-2 border-l-2 border-indigo-100 dark:border-indigo-950">
                                    {chapter.lessons.map((lesson, lessonIndex) => {
                                        const LessonIcon = getLessonIcon(lesson.type)
                                        const isLessonSelected =
                                            selectedId === lesson.id && selectedType === "lesson"

                                        return (
                                            <div
                                                key={lesson.id}
                                                data-testid={`lesson-row-${lesson.id}`}
                                                className={cn(
                                                    "p-2 rounded-md transition-colors space-y-1.5 border",
                                                    isLessonSelected
                                                        ? "bg-purple-50 text-purple-900 border-purple-200"
                                                        : "hover:bg-gray-50 bg-gray-50/50 dark:bg-gray-900/40 text-gray-700 border-gray-100 dark:border-gray-800"
                                                )}
                                            >
                                                <div
                                                    onClick={() => onSelect(lesson.id, "lesson")}
                                                    className="flex items-center gap-2 cursor-pointer min-w-0"
                                                >
                                                    <LessonIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                                    <span className="text-[11px] font-semibold text-gray-500 shrink-0">
                                                        {chapterIndex + 1}.{lessonIndex + 1}
                                                    </span>
                                                    <span className="flex-1 text-xs font-medium truncate">{lesson.title}</span>
                                                    <span className="text-[10px] text-gray-400 capitalize shrink-0">
                                                        {lesson.type.toLowerCase()}
                                                    </span>
                                                </div>

                                                {/* Per-Lesson Gate Row Control */}
                                                <div className="pl-5 pt-1" onClick={(e) => e.stopPropagation()}>
                                                    <ItemGateRowControl
                                                        value={{
                                                            gateMode: lesson.gateMode || "inherit",
                                                            previewPercentage: lesson.previewPercentage,
                                                        }}
                                                        onChange={(updated) => {
                                                            if (onUpdateLessonGate) {
                                                                onUpdateLessonGate(chapter.id, lesson.id, updated)
                                                            }
                                                        }}
                                                        coursePreviewPercentage={coursePreviewPercentage}
                                                        isCourseGated={isCourseGated}
                                                        disabled={disabled}
                                                        compact
                                                        parentGateMode={chapter.gateMode || "inherit"}
                                                        parentPreviewPercentage={chapter.previewPercentage}
                                                        parentName={chapter.title}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
