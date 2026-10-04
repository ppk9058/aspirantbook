"use client"

import { useState } from "react"
import { Chapter, Lesson } from "@prisma/client"
import { ChevronDown, ChevronRight, Plus, Video, BookOpen, Code, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ChapterWithLessons = Chapter & {
    lessons: Lesson[]
}

interface ChapterListProps {
    chapters: ChapterWithLessons[]
    selectedId: string | null
    selectedType: "chapter" | "lesson" | null
    onSelect: (id: string, type: "chapter" | "lesson") => void
    onAddChapter: () => void
    onAddLesson: (chapterId: string) => void
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
}: ChapterListProps) {
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
        new Set(chapters.map((c) => c.id))
    )

    const toggleChapter = (chapterId: string) => {
        const newExpanded = new Set(expandedChapters)
        if (newExpanded.has(chapterId)) {
            newExpanded.delete(chapterId)
        } else {
            newExpanded.add(chapterId)
        }
        setExpandedChapters(newExpanded)
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

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between mb-4 px-2">
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

            {chapters.map((chapter, chapterIndex) => {
                const isExpanded = expandedChapters.has(chapter.id)
                const isSelected = selectedId === chapter.id && selectedType === "chapter"

                return (
                    <div key={chapter.id} className="space-y-1">
                        {/* Chapter */}
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                                isSelected
                                    ? "bg-purple-100 text-purple-900"
                                    : "hover:bg-gray-100 text-gray-700"
                            )}
                        >
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
                            <div
                                onClick={() => onSelect(chapter.id, "chapter")}
                                className="flex-1 flex items-center gap-2"
                            >
                                <span className="text-xs font-medium text-gray-500">
                                    {chapterIndex + 1}
                                </span>
                                <span className="text-sm font-medium">{chapter.title}</span>
                                <span className="text-xs text-gray-500">
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
                                className="h-6 px-2 text-xs"
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
                                                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                                                isLessonSelected
                                                    ? "bg-purple-50 text-purple-900 border-l-2 border-purple-600"
                                                    : "hover:bg-gray-50 text-gray-600"
                                            )}
                                        >
                                            <LessonIcon className="h-4 w-4" />
                                            <span className="text-xs font-medium text-gray-500">
                                                {chapterIndex + 1}.{lessonIndex + 1}
                                            </span>
                                            <span className="text-sm flex-1">{lesson.title}</span>
                                            <span className="text-xs text-gray-500 capitalize">
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
    )
}
