"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Circle, ChevronDown, ChevronRight, X, Menu } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LessonSidebarProps {
    course: any
    chapters: any[]
    currentLessonId: string
    progressMap: Record<string, any>
    isOpen: boolean
    onToggle: () => void
}

export default function LessonSidebar({
    course,
    chapters,
    currentLessonId,
    progressMap,
    isOpen,
    onToggle,
}: LessonSidebarProps) {
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
        new Set(chapters.map(c => c.id))
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

    const completedLessons = Object.values(progressMap).filter((p: any) => p.completed).length
    const totalLessons = chapters.reduce((sum, c) => sum + c.lessons.length, 0)
    const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

    return (
        <>
            {/* Mobile Toggle */}
            <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className="lg:hidden fixed top-20 right-4 z-50 shadow-lg"
            >
                {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            {/* Sidebar */}
            <div
                className={cn(
                    "w-80 bg-white border-l flex flex-col transition-transform lg:translate-x-0",
                    isOpen ? "translate-x-0" : "translate-x-full",
                    "fixed lg:relative inset-y-0 right-0 z-40"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b">
                    <h2 className="font-semibold text-lg mb-2">{course.title}</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-600 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="text-xs text-gray-500">
                            {completedLessons} of {totalLessons} lessons completed
                        </div>
                    </div>
                </div>

                {/* Chapters List */}
                <div className="flex-1 overflow-auto">
                    {chapters.map((chapter, chapterIndex) => {
                        const isExpanded = expandedChapters.has(chapter.id)
                        const chapterCompleted = chapter.lessons.every(
                            (l: any) => progressMap[l.id]?.completed
                        )

                        return (
                            <div key={chapter.id} className="border-b">
                                <button
                                    onClick={() => toggleChapter(chapter.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 text-left">
                                        {chapterCompleted ? (
                                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                        ) : (
                                            <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                                        )}
                                        <div>
                                            <div className="font-medium text-sm">
                                                Chapter {chapterIndex + 1}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {chapter.title}
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="bg-gray-50">
                                        {chapter.lessons.map((lesson: any, lessonIndex: number) => {
                                            const isCompleted = progressMap[lesson.id]?.completed
                                            const isCurrent = lesson.id === currentLessonId

                                            return (
                                                <Link
                                                    key={lesson.id}
                                                    href={`/learn/${course.slug}/${lesson.id}`}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors",
                                                        isCurrent && "bg-purple-50 border-l-4 border-purple-600"
                                                    )}
                                                >
                                                    {isCompleted ? (
                                                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div
                                                            className={cn(
                                                                "text-sm truncate",
                                                                isCurrent
                                                                    ? "font-medium text-purple-600"
                                                                    : "text-gray-700"
                                                            )}
                                                        >
                                                            {chapterIndex + 1}.{lessonIndex + 1} {lesson.title}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {lesson.duration} min
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={onToggle}
                />
            )}
        </>
    )
}
