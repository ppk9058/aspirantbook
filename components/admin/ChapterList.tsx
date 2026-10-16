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
    lessons: Lesson[]
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

            <div className="space-y-1">
                {chapters.map((chapter, chapterIndex) => {
                    const isExpanded = expandedChapters.has(chapter.id)
                    const isSelected = selectedId === chapter.id && selectedType === "chapter"
                    const isRowChecked = selectedChapterIds.has(chapter.id)

                    return (
                        <div key={chapter.id} className="space-y-1">
                            {/* Chapter Row */}
                            <div
                                className={cn(
                                    "flex flex-wrap sm:flex-nowrap items-center gap-2 px-2.5 py-2 rounded-md transition-colors",
                                    isSelected
                                        ? "bg-purple-100 text-purple-900"
                                        : "hover:bg-gray-100 text-gray-700"
                                )}
                            >
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Checkbox
                                        checked={isRowChecked}
                                        onCheckedChange={() => toggleSelectChapter(chapter.id)}
                                        disabled={disabled}
                                        data-testid={`select-chapter-${chapter.id}`}
                                    />
                                    <button
                                        onClick={() => toggleChapter(chapter.id)}
                                        className="p-0.5 hover:bg-gray-200 rounded"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                <div
                                    onClick={() => onSelect(chapter.id, "chapter")}
                                    className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
                                >
                                    <span className="text-xs font-medium text-gray-500">
                                        {chapterIndex + 1}
                                    </span>
                                    <span className="text-sm font-medium truncate">{chapter.title}</span>
                                    <span className="text-xs text-gray-500">
                                        ({chapter.lessons.length})
                                    </span>
                                </div>

                                {/* Compact Per-Row Gate Selector */}
                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
                                        compact
                                    />
                                </div>

                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onAddLesson(chapter.id)
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs shrink-0"
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>

                            {/* Lessons */}
                            {isExpanded && chapter.lessons.length > 0 && (
                                <div className="ml-6 space-y-1">
                                    {chapter.lessons.map((lesson, lessonIndex) => {
                                        const LessonIcon = getLessonIcon(lesson.type)
                                        const isLessonSelected =
                                            selectedId === lesson.id && selectedType === "lesson"

                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() => onSelect(lesson.id, "lesson")}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors text-xs",
                                                    isLessonSelected
                                                        ? "bg-purple-50 text-purple-900 border-l-2 border-purple-600"
                                                        : "hover:bg-gray-50 text-gray-600"
                                                )}
                                            >
                                                <LessonIcon className="h-3.5 w-3.5" />
                                                <span className="text-[11px] font-medium text-gray-500">
                                                    {chapterIndex + 1}.{lessonIndex + 1}
                                                </span>
                                                <span className="flex-1 truncate">{lesson.title}</span>
                                                <span className="text-[10px] text-gray-400 capitalize">
                                                    {lesson.type.toLowerCase()}
                                                </span>
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
