"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    ChevronLeft,
    ChevronRight,
    Menu,
    Trophy,
    Globe,
    FileText,
    Video,
    AlertTriangle
} from "lucide-react"

interface CourseHeaderProps {
    courseTitle: string
    lessonTitle: string
    currentLessonIndex: number
    totalLessons: number
    onNext: () => void
    onPrevious: () => void
}

export function CourseHeader({
    courseTitle,
    lessonTitle,
    currentLessonIndex,
    totalLessons,
    onNext,
    onPrevious,
}: CourseHeaderProps) {
    return (
        <div className="h-16 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-50">
            {/* Left: Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="h-8 w-8 bg-[#3A10E5] rounded flex items-center justify-center text-white font-bold mr-2 text-xs">
                    AB
                </div>
                <Link href="/tutorials" className="hover:text-gray-900">Tutorials</Link>
                <span>/</span>
                <Link href="/courses" className="hover:text-gray-900">Courses</Link>
                <span>/</span>
                <span className="font-medium text-gray-900 truncate max-w-[200px]">{courseTitle}</span>
            </div>

            {/* Center: Navigation Controls */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onPrevious}
                    disabled={currentLessonIndex === 0}
                    className="h-9 w-9"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button variant="outline" className="h-9 gap-2 px-4 font-medium">
                    <Menu className="h-4 w-4" />
                    Course Outline
                </Button>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={onNext}
                    disabled={currentLessonIndex === totalLessons - 1}
                    className="h-9 w-9"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Right: Stats & Settings */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1 font-medium text-gray-900">
                    <Trophy className="h-4 w-4 text-gray-500" />
                    <span>Daily XP <span className="text-pink-600">50</span></span>
                </div>

                <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <span>EN</span>
                </div>

                <div className="flex items-center gap-2 border-l pl-4">
                    <button className="hover:text-gray-900"><FileText className="h-4 w-4" /></button>
                    <button className="hover:text-gray-900"><Video className="h-4 w-4" /></button>
                    <button className="hover:text-gray-900"><AlertTriangle className="h-4 w-4" /></button>
                </div>
            </div>
        </div>
    )
}
