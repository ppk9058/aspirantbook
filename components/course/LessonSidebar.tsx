"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, PlayCircle, Code, CheckCircle2, Lock, Circle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Lesson {
    id: string
    title: string
    type: 'VIDEO' | 'CODING' | 'QUIZ' | 'CHAT'
    duration: number // minutes
    completed: boolean
    locked: boolean
}

interface Chapter {
    id: string
    title: string
    lessons: Lesson[]
}

interface LessonSidebarProps {
    chapters: Chapter[]
    currentLessonId: string
    onLessonClick: (lessonId: string) => void
    onClose?: () => void
}

export default function LessonSidebar({
    chapters,
    currentLessonId,
    onLessonClick,
    onClose
}: LessonSidebarProps) {
    const [expandedChapters, setExpandedChapters] = useState<string[]>(
        chapters.map(c => c.id) // All expanded by default
    )

    const toggleChapter = (chapterId: string) => {
        setExpandedChapters(prev =>
            prev.includes(chapterId)
                ? prev.filter(id => id !== chapterId)
                : [...prev, chapterId]
        )
    }

    const getLessonIcon = (lesson: Lesson) => {
        if (lesson.completed) return CheckCircle2
        if (lesson.locked) return Lock
        if (lesson.id === currentLessonId) return Circle

        switch (lesson.type) {
            case 'VIDEO':
                return PlayCircle
            case 'CODING':
            case 'QUIZ':
            case 'CHAT':
                return Code
            default:
                return PlayCircle
        }
    }

    const getIconColor = (lesson: Lesson) => {
        if (lesson.completed) return 'text-green-500'
        if (lesson.locked) return 'text-gray-400'
        if (lesson.id === currentLessonId) return 'text-[#3AAFA9]'
        return 'text-gray-600'
    }

    const calculateChapterProgress = (chapter: Chapter) => {
        const completedCount = chapter.lessons.filter(l => l.completed).length
        return Math.round((completedCount / chapter.lessons.length) * 100)
    }

    const calculateTotalProgress = () => {
        const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
        const completedLessons = chapters.reduce(
            (sum, ch) => sum + ch.lessons.filter(l => l.completed).length,
            0
        )
        return Math.round((completedLessons / totalLessons) * 100)
    }

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Course Content</h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="lg:hidden text-gray-600 hover:text-gray-900"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Overall Progress */}
                <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Overall Progress</span>
                        <span className="font-semibold text-gray-900">{calculateTotalProgress()}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#3AAFA9] transition-all duration-300"
                            style={{ width: `${calculateTotalProgress()}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Chapters & Lessons */}
            <div className="flex-1 overflow-y-auto">
                {chapters.map((chapter) => {
                    const isExpanded = expandedChapters.includes(chapter.id)
                    const progress = calculateChapterProgress(chapter)

                    return (
                        <div key={chapter.id} className="border-b border-gray-200">
                            {/* Chapter Header */}
                            <button
                                onClick={() => toggleChapter(chapter.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                    )}
                                    <div className="text-left flex-1">
                                        <h3 className="font-semibold text-gray-900 text-sm">{chapter.title}</h3>
                                        <p className="text-xs text-gray-600 mt-0.5">
                                            {chapter.lessons.filter(l => l.completed).length}/{chapter.lessons.length} lessons • {progress}%
                                        </p>
                                    </div>
                                </div>

                                {/* Mini Progress Circle */}
                                <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-gray-600">{progress}%</span>
                                </div>
                            </button>

                            {/* Lessons List */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="py-2">
                                            {chapter.lessons.map((lesson) => {
                                                const Icon = getLessonIcon(lesson)
                                                const iconColor = getIconColor(lesson)
                                                const isCurrent = lesson.id === currentLessonId
                                                const isClickable = !lesson.locked

                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => isClickable && onLessonClick(lesson.id)}
                                                        disabled={lesson.locked}
                                                        className={`w-full px-4 py-3 pl-12 flex items-center gap-3 transition-colors ${isCurrent
                                                                ? 'bg-[#3AAFA9]/10 border-l-4 border-[#3AAFA9]'
                                                                : lesson.locked
                                                                    ? 'opacity-60 cursor-not-allowed'
                                                                    : 'hover:bg-gray-50 cursor-pointer'
                                                            }`}
                                                    >
                                                        <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
                                                        <div className="flex-1 text-left">
                                                            <p className={`text-sm ${isCurrent ? 'font-semibold text-[#3AAFA9]' : 'text-gray-900'}`}>
                                                                {lesson.title}
                                                            </p>
                                                            <p className="text-xs text-gray-600 mt-0.5">
                                                                {lesson.type} • {lesson.duration} min
                                                            </p>
                                                        </div>
                                                        {lesson.completed && (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
